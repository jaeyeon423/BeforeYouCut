"use server";

import { prisma } from "../utils/prisma";
import { createClient } from "../utils/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import crypto from "crypto";
import { buildProductSpec } from "@/utils/product-detail";
import siteConfig from "../site.config";
import {
  PRODUCT_IMAGE_CACHE_VERSION,
  PUBLIC_PRODUCT_WHERE,
  fetchCategoryProducts,
  fetchHomeData,
  fetchProductDetail,
  fetchSellerProfile,
  fetchSellersMap,
  formatProduct,
  formatSeller,
  normalizeProductImages,
} from "@/server/services/catalog-service";
import { cancelTossPayment, settlePaidPaymentWithOrder } from "@/server/services/payment-service";

// ============================================================
//  Internal formatters & helpers (not exported → not server actions)
// ============================================================

// supabase.auth.getUser() makes a network call to the Auth API on every invocation.
// cache() memoizes the result for the lifetime of the current server request so that
// multiple Server Actions or RSCs that need the user only pay the network round-trip once.
const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
});

async function getAuthUserId() {
  const user = await getAuthUser();
  return user?.id || null;
}

const CATEGORY_ICON = {
  "가위": "scissors",
  "도구": "scissors",
  "클리퍼": "clipper",
  "빗·브러시": "comb",
  "앞치마·유니폼": "apron",
  "소모품": "bottle",
  "케이스·수납": "case",
  "핸드메이드": "case",
};

function iconForCategory(category) {
  return CATEGORY_ICON[category] || "scissors";
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeKoreanMobilePhone(value) {
  const digits = cleanText(value).replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    throw new Error("올바른 휴대폰 번호를 입력해 주세요.");
  }
  return digits;
}

function validateBuyerSignupInput({ name, phone, email, password } = {}) {
  const clean = {
    name: cleanText(name),
    phone: normalizeKoreanMobilePhone(phone),
    email: cleanText(email).toLowerCase(),
    password: String(password || ""),
  };

  if (!clean.name) throw new Error("이름을 입력해 주세요.");
  if (clean.name.length > 50) throw new Error("이름은 50자 이하여야 합니다.");
  if (!clean.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw new Error("올바른 이메일 주소를 입력해 주세요.");
  if (clean.password.length < 6) throw new Error("비밀번호는 6자 이상이어야 합니다.");

  return clean;
}

function getPhoneVerificationSecret() {
  const secret = process.env.PHONE_VERIFICATION_SECRET || process.env.ENCRYPTION_KEY || process.env.SUPABASE_JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("PHONE_VERIFICATION_SECRET 환경변수를 설정해 주세요.");
  }
  return secret || "dev-phone-verification-secret";
}

function hashPhoneVerificationCode(phone, code) {
  return crypto
    .createHmac("sha256", getPhoneVerificationSecret())
    .update(`${PHONE_VERIFICATION_PURPOSE}:${phone}:${code}`)
    .digest("hex");
}

function createPhoneVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function getNaverSensConfig() {
  const serviceId = cleanText(process.env.NAVER_SENS_SERVICE_ID);
  const accessKey = cleanText(process.env.NAVER_SENS_ACCESS_KEY);
  const secretKey = cleanText(process.env.NAVER_SENS_SECRET_KEY);
  const from = cleanText(process.env.NAVER_SENS_SMS_FROM).replace(/\D/g, "");
  if (!serviceId || !accessKey || !secretKey || !from) return null;
  return { serviceId, accessKey, secretKey, from };
}

function createNaverSensSignature({ method, uri, timestamp, accessKey, secretKey }) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${method} ${uri}\n${timestamp}\n${accessKey}`)
    .digest("base64");
}

async function sendPhoneVerificationSms(phone, code) {
  const config = getNaverSensConfig();
  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("문자 발송 환경변수를 설정해야 휴대폰 인증을 사용할 수 있습니다.");
    }
    console.info(`[dev] 미용사 휴대폰 인증번호 ${code} -> ${phone}`);
    return { provider: "debug" };
  }

  const method = "POST";
  const uri = `/sms/v2/services/${config.serviceId}/messages`;
  const timestamp = Date.now().toString();
  const signature = createNaverSensSignature({
    method,
    uri,
    timestamp,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  const response = await fetch(`https://sens.apigw.ntruss.com${uri}`, {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": config.accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify({
      type: "SMS",
      contentType: "COMM",
      countryCode: "82",
      from: config.from,
      content: `[미용사] 인증번호 ${code}를 입력해 주세요. 5분간 유효합니다.`,
      messages: [{ to: phone }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`문자 발송에 실패했습니다.${detail ? ` (${detail.slice(0, 120)})` : ""}`);
  }

  return { provider: "naver-sens" };
}

function validateShippingProfileInput({ name, phone, address, addressDetail } = {}) {
  const clean = {
    name: cleanText(name),
    phone: cleanText(phone),
    address: cleanText(address),
    addressDetail: cleanText(addressDetail),
  };

  if (!clean.name) throw new Error("수령인 이름은 필수 입력 항목입니다.");
  if (clean.name.length > 50) throw new Error("수령인 이름은 50자 이하여야 합니다.");
  if (!clean.phone) throw new Error("수령인 연락처는 필수 입력 항목입니다.");
  if (clean.phone.length > 30) throw new Error("수령인 연락처는 30자 이하여야 합니다.");
  if (!clean.address) throw new Error("배송지 주소는 필수 입력 항목입니다.");
  if (clean.address.length > 300) throw new Error("배송지 주소는 300자 이하여야 합니다.");
  if (clean.addressDetail.length > 100) throw new Error("상세주소는 100자 이하여야 합니다.");

  return clean;
}

function formatShippingProfile(user, authUser) {
  const fallbackEmailName = cleanText(authUser?.email).split("@")[0] || "";
  const fallbackName = cleanText(user?.name) || cleanText(authUser?.user_metadata?.name) || fallbackEmailName;
  const fallbackPhone = cleanText(user?.phone) || cleanText(authUser?.user_metadata?.phone);
  return {
    name: cleanText(user?.defaultShippingName) || fallbackName,
    phone: cleanText(user?.defaultShippingPhone) || fallbackPhone,
    address: cleanText(user?.defaultShippingAddress),
    addressDetail: cleanText(user?.defaultShippingAddressDetail),
  };
}

function normalizeProductImageUrl(value) {
  const imageUrl = cleanText(value);
  if (!imageUrl) return "";
  if (imageUrl.length > 500) throw new Error("이미지 URL은 500자 이하여야 합니다.");
  if (imageUrl.startsWith("/")) return imageUrl;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // handled below
  }

  throw new Error("이미지 URL은 http(s) 또는 / 로 시작하는 경로여야 합니다.");
}

function validateProductDraft({ name, price, category, desc, material, origin, size, care, kcStatus, imageUrl }) {
  const clean = {
    name: cleanText(name),
    category: cleanText(category),
    desc: cleanText(desc),
    material: cleanText(material),
    origin: cleanText(origin),
    size: cleanText(size),
    care: cleanText(care),
    kcStatus: cleanText(kcStatus),
    imageUrl: normalizeProductImageUrl(imageUrl),
  };
  const numericPrice = Number(price);

  if (!clean.name) throw new Error("상품명은 필수입니다.");
  if (clean.name.length > 80) throw new Error("상품명은 80자 이하여야 합니다.");
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) throw new Error("가격은 0보다 커야 합니다.");
  if (!clean.category) throw new Error("카테고리는 필수입니다.");
  if (!clean.desc) throw new Error("상품 설명은 필수입니다.");
  if (!clean.material) throw new Error("소재는 필수입니다.");
  if (!clean.origin) throw new Error("제조국은 필수입니다.");
  if (!clean.size) throw new Error("치수는 필수입니다.");
  if (!clean.care) throw new Error("취급 주의는 필수입니다.");
  if (!clean.kcStatus) throw new Error("KC 인증 여부는 필수입니다.");

  return { ...clean, price: Math.round(numericPrice) };
}

function buildSellerProductSpec(draft, sellerName) {
  return buildProductSpec(
    [
      ["소재", draft.material],
      ["제조국", draft.origin],
      ["치수", draft.size],
      ["취급 주의", draft.care],
      ["A/S 책임자", `${sellerName} 고객센터`],
      ["KC 인증 여부", draft.kcStatus],
    ],
    {
      intro: draft.desc,
      highlights: [
        `${draft.material} 소재와 ${draft.size} 규격`,
        `${draft.category} 카테고리에 맞춘 현장 사용 정보`,
        `${sellerName} 판매자가 직접 관리하는 상품`,
      ].join("\n"),
      usage: draft.care,
      shipping: "결제 완료 후 판매자 확인을 거쳐 평균 1-2영업일 내 출고됩니다.\n도서산간 지역은 배송 기간이 추가될 수 있습니다.",
      returns: "상품 수령 후 7일 이내 미사용 상품에 한해 교환/반품 신청이 가능합니다.\n사용 흔적, 구성품 훼손, 고객 부주의로 인한 손상은 제한될 수 있습니다.",
      notice: `KC 인증 여부: ${draft.kcStatus}\nA/S 책임자: ${sellerName} 고객센터\n구매 전 소재, 치수, 취급 주의사항을 확인해 주세요.`,
    }
  );
}

const SELLER_DOCUMENT_BUCKET = "seller-documents";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const REFUNDABLE_ORDER_STATUSES = new Set(["결제완료", "배송 준비중", "배송중", "배송완료"]);
const REFUND_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"];
const INQUIRY_TYPES = ["INQUIRY", "REFUND_REQUEST", "REPORT", "ETC"];
const INQUIRY_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"];
const PHONE_VERIFICATION_PURPOSE = "SIGNUP";
const PHONE_VERIFICATION_TTL_MS = 5 * 60 * 1000;
const PHONE_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const PHONE_VERIFICATION_MAX_ATTEMPTS = 5;
const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";
const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

function isConfiguredAdminEmail(email) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

function formatDate(value) {
  return value ? value.toLocaleDateString("ko-KR") : null;
}

function formatDateTime(value) {
  return value
    ? value.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
}

function normalizeOrderQuantity(value) {
  const numeric = Number(value ?? 1);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(99, Math.floor(numeric)));
}

function formatOrderItem(item) {
  const product = item.product || {};
  const seller = product.seller || {};
  return {
    id: item.productId,
    itemId: item.id,
    name: product.name || item.productId,
    price: item.price,
    seller: product.sellerId || seller.id || "",
    sellerName: seller.name || product.sellerId || "",
    sellerVerified: seller.verified ?? false,
    icon: product.icon || "scissors",
    tone: product.tone || "tone-a",
    images: normalizeProductImages(product.images),
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
  };
}

function getTossClientKey() {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";
}

function getTossSecretKey() {
  return process.env.TOSS_SECRET_KEY || "";
}

function createProviderOrderId() {
  return `ms-${crypto.randomUUID()}`;
}

function normalizeCheckoutOrigin(origin) {
  const cleanOrigin = cleanText(origin);
  const allowedOrigins = [
    siteConfig.service.url,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : "",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  try {
    const parsed = new URL(cleanOrigin);
    const normalized = parsed.origin;
    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === normalized;
      } catch {
        return false;
      }
    });
    return isAllowed ? normalized : new URL(siteConfig.service.url).origin;
  } catch {
    try {
      return new URL(siteConfig.service.url).origin;
    } catch {
      return "http://localhost:3000";
    }
  }
}

async function buildCheckoutLines({ total, items }) {
  if (total === undefined || typeof total !== "number" || total <= 0) {
    throw new Error("결제 금액은 0보다 커야 합니다.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("주문할 상품 목록이 비어 있습니다.");
  }

  const quantityByProductId = new Map();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error("올바르지 않은 상품 정보가 포함되어 있습니다.");
    }
    quantityByProductId.set(item.id, (quantityByProductId.get(item.id) || 0) + normalizeOrderQuantity(item.quantity));
  }

  const productIds = [...quantityByProductId.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, ...PUBLIC_PRODUCT_WHERE },
    include: { seller: { select: { id: true, name: true } } },
  });
  if (products.length !== productIds.length) {
    throw new Error("주문할 수 없는 상품이 포함되어 있습니다.");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = productIds.map((id) => {
    const product = productById.get(id);
    return {
      productId: product.id,
      productName: product.name,
      sellerId: product.sellerId,
      sellerName: product.seller?.name || product.sellerId,
      price: product.price,
      quantity: quantityByProductId.get(id),
      icon: product.icon,
      tone: product.tone,
      images: normalizeProductImages(product.images),
    };
  });
  const computedTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  if (Math.round(total) !== computedTotal) {
    throw new Error("결제 금액이 현재 상품 가격과 일치하지 않습니다.");
  }

  return { lines, computedTotal };
}

function buildOrderName(lines) {
  const firstName = lines[0]?.productName || "미용사 상품";
  return lines.length > 1 ? `${firstName} 외 ${lines.length - 1}건` : firstName;
}

async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const secretKey = getTossSecretKey();
  if (!secretKey) throw new Error("TOSS_SECRET_KEY 환경변수를 설정해야 결제를 승인할 수 있습니다.");
  const encodedAuth = Buffer.from(`${secretKey}:`).toString("base64");
  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "토스페이먼츠 결제 승인에 실패했습니다.");
  }
  return payload;
}

function mergePaymentRefundResponse(existingRawResponse, refundCancelResponse) {
  const base = existingRawResponse && typeof existingRawResponse === "object" && !Array.isArray(existingRawResponse)
    ? existingRawResponse
    : {};
  return {
    ...base,
    refundCancelResponse,
    refundCanceledAt: new Date().toISOString(),
  };
}

function formatShipment(shipment) {
  if (!shipment) return null;
  return {
    carrier: shipment.carrier || "",
    trackingNo: shipment.trackingNo || "",
    status: shipment.status,
    shippedAt: formatDateTime(shipment.shippedAt),
    deliveredAt: formatDateTime(shipment.deliveredAt),
    updatedAt: formatDateTime(shipment.updatedAt),
  };
}

function formatRefundRequest(refundRequest) {
  if (!refundRequest) return null;
  return {
    id: refundRequest.id,
    reason: refundRequest.reason,
    reasonDetail: refundRequest.reasonDetail || "",
    status: refundRequest.status,
    refundAmount: refundRequest.refundAmount,
    requestedAt: formatDateTime(refundRequest.requestedAt),
    resolvedAt: formatDateTime(refundRequest.resolvedAt),
  };
}

async function getAdminAccess() {
  const authUser = await getAuthUser();
  if (!authUser) return { status: "guest", authUser: null, user: null };

  const configuredAdmin = isConfiguredAdminEmail(authUser.email);
  let user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (configuredAdmin && (!user || user.role !== "ADMIN")) {
    user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: { role: "ADMIN", email: authUser.email },
      create: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split("@")[0],
        role: "ADMIN",
      },
    });
  }

  if (!user || user.role !== "ADMIN") {
    return { status: "forbidden", authUser, user };
  }

  return { status: "admin", authUser, user };
}

async function requireAdminUser() {
  const access = await getAdminAccess();
  if (access.status === "guest") throw new Error("로그인이 필요합니다.");
  if (access.status !== "admin") throw new Error("관리자 권한이 필요합니다.");
  return access.user;
}

// ============================================================
//  Page-scoped data fetching (public reads — no auth required)
// ============================================================

/**
 * All sellers as an id-keyed dictionary. Loaded once in the root layout so
 * product/brand cards anywhere can resolve a seller name without refetching.
 */
export const getSellersMap = cache(() => {
  return unstable_cache(
    async () => {
      try {
        return await fetchSellersMap();
      } catch (error) {
        console.error("Failed to load sellers map:", error);
        return {};
      }
    },
    ["sellers-map"],
    { revalidate: 600, tags: ["sellers"] }
  )();
});

/**
 * Data needed by the home screen only: ranking, new arrivals, handmade picks.
 */
export const getHomeData = cache(() => {
  return unstable_cache(
    async () => {
      try {
        return await fetchHomeData();
      } catch (error) {
        console.error("Failed to load home data:", error);
        return { ranking: [], newItems: [], spotlightSellers: [], mainBanner: null };
      }
    },
    ["home-data", PRODUCT_IMAGE_CACHE_VERSION],
    { revalidate: 300, tags: ["home"] }
  )();
});

/**
 * A single product with its seller and up-to-4 related products from the
 * same seller. Returns null when the product does not exist.
 */
export const getProductDetail = cache((productId) => {
  return unstable_cache(
    async () => {
      try {
        return await fetchProductDetail(productId);
      } catch (error) {
        console.error("Failed to load product detail:", error);
        return null;
      }
    },
    ["product-detail", productId, PRODUCT_IMAGE_CACHE_VERSION],
    { revalidate: 600, tags: ["products", `product-${productId}`] }
  )();
});

/**
 * A seller profile with its full product list. Returns null when not found.
 */
export const getSellerProfile = cache((sellerId) => {
  return unstable_cache(
    async () => {
      try {
        return await fetchSellerProfile(sellerId);
      } catch (error) {
        console.error("Failed to load seller profile:", error);
        return null;
      }
    },
    ["seller-profile", sellerId],
    { revalidate: 600, tags: ["sellers", `seller-${sellerId}`] }
  )();
});

/**
 * Paginated products for a category. `cat === "전체"` returns everything.
 * Returns { items, hasMore } so the client can drive a "더보기" button.
 */
export const getCategoryProducts = cache((cat = "전체", page = 0, limit = 20, filter = null) => {
  return unstable_cache(
    async () => {
      try {
        return await fetchCategoryProducts(cat, page, limit, filter);
      } catch (error) {
        console.error("Failed to load category products:", error);
        return { items: [], hasMore: false, total: 0 };
      }
    },
    ["category-products", cat, String(page), String(limit), filter || "all", PRODUCT_IMAGE_CACHE_VERSION],
    { revalidate: 300, tags: ["products", `category-${cat}`, `filter-${filter || 'none'}`] }
  )();
});

// ============================================================
//  User-scoped data fetching (auth required → empty when guest)
// ============================================================

/**
 * The current user's liked product ids and followed seller ids.
 * Returns empty arrays for guests.
 */
export async function getUserInteractions() {
  try {
    const activeUserId = await getAuthUserId();
    if (!activeUserId) return { likes: [], following: [] };

    const [userLikes, userFollows] = await Promise.all([
      prisma.like.findMany({ where: { userId: activeUserId }, select: { productId: true } }),
      prisma.follow.findMany({ where: { userId: activeUserId }, select: { sellerId: true } }),
    ]);

    return {
      likes: userLikes.map((l) => l.productId),
      following: userFollows.map((f) => f.sellerId),
    };
  } catch (error) {
    console.error("Failed to load user interactions:", error);
    return { likes: [], following: [] };
  }
}

/**
 * The current user's order history (newest first). Empty for guests.
 */
export async function getUserOrders() {
  try {
    const activeUserId = await getAuthUserId();
    if (!activeUserId) return [];

    const userOrders = await prisma.order.findMany({
      where: { userId: activeUserId },
      orderBy: { date: "desc" },
      include: {
        shipment: true,
        refundRequest: true,
        items: {
          include: {
            product: { include: { seller: { select: { id: true, name: true, verified: true } } } },
          },
        },
      },
    });

    return userOrders.map((o) => ({
      id: o.id,
      total: o.total,
      status: o.status,
      date: o.date.toLocaleDateString("ko-KR"),
      address: o.address,
      phone: o.phone || "",
      buyer: o.name,
      shipment: formatShipment(o.shipment),
      refundRequest: formatRefundRequest(o.refundRequest),
      items: o.items.map(formatOrderItem),
    }));
  } catch (error) {
    console.error("Failed to load user orders:", error);
    return [];
  }
}

export async function getMyShippingProfile() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        name: true,
        phone: true,
        defaultShippingName: true,
        defaultShippingPhone: true,
        defaultShippingAddress: true,
        defaultShippingAddressDetail: true,
      },
    });

    return formatShippingProfile(user, authUser);
  } catch (error) {
    console.error("Failed to load shipping profile:", error);
    return null;
  }
}

export async function getMyAccountSummary() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            verified: true,
            isActive: true,
            kycStatus: true,
            productsCount: true,
          },
        },
      },
    });

    const role = user?.role || "BUYER";
    return {
      email: user?.email || authUser.email || "",
      name: cleanText(user?.name) || cleanText(authUser.user_metadata?.name) || cleanText(authUser.email).split("@")[0] || "",
      phone: cleanText(user?.phone) || cleanText(authUser.user_metadata?.phone),
      role,
      isAdmin: role === "ADMIN",
      isSeller: role === "SELLER" || Boolean(user?.seller),
      joinedAt: user?.createdAt ? formatDate(user.createdAt) : "",
      seller: user?.seller
        ? {
            id: user.seller.id,
            name: user.seller.name,
            verified: user.seller.verified,
            isActive: user.seller.isActive,
            kycStatus: user.seller.kycStatus,
            productsCount: user.seller.productsCount,
          }
        : null,
    };
  } catch (error) {
    console.error("Failed to load account summary:", error);
    return null;
  }
}

export async function updateMyShippingProfile(input) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const email = cleanText(authUser.email);
    if (!email) throw new Error("이메일 정보를 확인할 수 없습니다.");

    const clean = validateShippingProfileInput(input);
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        defaultShippingName: clean.name,
        defaultShippingPhone: clean.phone,
        defaultShippingAddress: clean.address,
        defaultShippingAddressDetail: clean.addressDetail,
      },
      create: {
        id: authUser.id,
        email,
        name: clean.name,
        phone: clean.phone,
        role: "BUYER",
        defaultShippingName: clean.name,
        defaultShippingPhone: clean.phone,
        defaultShippingAddress: clean.address,
        defaultShippingAddressDetail: clean.addressDetail,
      },
      select: {
        name: true,
        phone: true,
        defaultShippingName: true,
        defaultShippingPhone: true,
        defaultShippingAddress: true,
        defaultShippingAddressDetail: true,
      },
    });

    return { success: true, profile: formatShippingProfile(user, authUser) };
  } catch (error) {
    console.error("Failed to update shipping profile:", error);
    throw new Error(error.message || "배송지 저장에 실패했습니다.");
  }
}

export async function requestSignupPhoneVerification({ phone } = {}) {
  const normalizedPhone = normalizeKoreanMobilePhone(phone);
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - PHONE_VERIFICATION_RESEND_COOLDOWN_MS);

  const recentRequest = await prisma.phoneVerification.findFirst({
    where: {
      phone: normalizedPhone,
      purpose: PHONE_VERIFICATION_PURPOSE,
      createdAt: { gt: recentCutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentRequest) {
    throw new Error("인증번호는 1분 후 다시 요청할 수 있습니다.");
  }

  const code = createPhoneVerificationCode();
  const verification = await prisma.phoneVerification.create({
    data: {
      phone: normalizedPhone,
      purpose: PHONE_VERIFICATION_PURPOSE,
      codeHash: hashPhoneVerificationCode(normalizedPhone, code),
      expiresAt: new Date(now.getTime() + PHONE_VERIFICATION_TTL_MS),
    },
  });

  try {
    const delivery = await sendPhoneVerificationSms(normalizedPhone, code);
    return {
      success: true,
      phone: normalizedPhone,
      expiresInSeconds: PHONE_VERIFICATION_TTL_MS / 1000,
      debugCode: delivery.provider === "debug" ? code : null,
    };
  } catch (error) {
    await prisma.phoneVerification.delete({ where: { id: verification.id } }).catch(() => {});
    throw new Error(error.message || "인증번호 발송에 실패했습니다.");
  }
}

export async function verifySignupPhoneCode({ phone, code } = {}) {
  const normalizedPhone = normalizeKoreanMobilePhone(phone);
  const cleanCode = cleanText(code);
  if (!/^\d{6}$/.test(cleanCode)) throw new Error("인증번호 6자리를 입력해 주세요.");

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      phone: normalizedPhone,
      purpose: PHONE_VERIFICATION_PURPOSE,
      verifiedAt: null,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) throw new Error("유효한 인증 요청이 없습니다. 인증번호를 다시 요청해 주세요.");
  if (verification.attempts >= PHONE_VERIFICATION_MAX_ATTEMPTS) {
    throw new Error("인증번호 입력 횟수를 초과했습니다. 다시 요청해 주세요.");
  }

  const expectedHash = hashPhoneVerificationCode(normalizedPhone, cleanCode);
  if (expectedHash !== verification.codeHash) {
    await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("인증번호가 일치하지 않습니다.");
  }

  await prisma.phoneVerification.update({
    where: { id: verification.id },
    data: { verifiedAt: new Date() },
  });

  return { success: true, phone: normalizedPhone };
}

export async function registerBuyer({ name, phone, email, password, consentedTypes } = {}) {
  const clean = validateBuyerSignupInput({ name, phone, email, password });
  if (!Array.isArray(consentedTypes) || !consentedTypes.includes("USER_TERMS") || !consentedTypes.includes("PRIVACY_POLICY")) {
    throw new Error("필수 약관에 동의해 주세요.");
  }

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      phone: clean.phone,
      purpose: PHONE_VERIFICATION_PURPOSE,
      verifiedAt: { not: null },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { verifiedAt: "desc" },
  });
  if (!verification) throw new Error("휴대폰 인증을 완료해 주세요.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: clean.email,
    password: clean.password,
    options: { data: { name: clean.name, phone: clean.phone } },
  });
  if (error) throw new Error(error.message || "회원가입에 실패했습니다.");
  if (!data?.user?.id) throw new Error("회원가입 사용자 정보를 확인할 수 없습니다.");

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: {
      email: clean.email,
      name: clean.name,
      phone: clean.phone,
    },
    create: {
      id: data.user.id,
      email: clean.email,
      name: clean.name,
      phone: clean.phone,
      role: "BUYER",
    },
  });

  const consentResults = await Promise.all(
    consentedTypes.map(async (type) => {
      const latestVersion = await prisma.termsVersion.findFirst({
        where: { type },
        orderBy: { effectiveAt: "desc" },
      });
      if (!latestVersion) return null;
      return prisma.consentRecord.upsert({
        where: { id: `${data.user.id}_${latestVersion.id}` },
        update: { agreedAt: new Date() },
        create: {
          id: `${data.user.id}_${latestVersion.id}`,
          userId: data.user.id,
          termsVersionId: latestVersion.id,
        },
      });
    })
  );

  await prisma.phoneVerification.update({
    where: { id: verification.id },
    data: { consumedAt: new Date() },
  });

  return {
    success: true,
    emailConfirmationRequired: !data.session,
    recordedConsents: consentResults.filter(Boolean).length,
  };
}

/**
 * Private order detail for buyers, order-owning sellers, and admins.
 */
export async function getOrderDetail(orderId) {
  try {
    if (!orderId || typeof orderId !== "string") {
      return { status: "notFound" };
    }

    const access = await getAdminAccess();
    if (access.status === "guest") return { status: "guest" };
    const authUser = access.authUser;

    const [seller, order] = await Promise.all([
      prisma.seller.findUnique({ where: { userId: authUser.id } }),
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, email: true, name: true } },
          shipment: true,
          refundRequest: true,
          items: {
            include: {
              product: {
                include: {
                  seller: { select: { id: true, name: true, verified: true, isActive: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    if (!order) return { status: "notFound" };

    const isAdmin = access.status === "admin";
    const isBuyer = order.userId === authUser.id;
    const isSeller = seller && order.items.some((item) => item.product?.sellerId === seller.id);
    if (!isAdmin && !isBuyer && !isSeller) return { status: "forbidden" };

    const role = isAdmin ? "admin" : isSeller ? "seller" : "buyer";
    return {
      status: "ok",
      role,
      order: {
        id: order.id,
        total: order.total,
        status: order.status,
        date: formatDateTime(order.date),
        address: order.address,
        buyer: order.name,
        phone: order.phone || "",
        buyerEmail: order.user?.email || "",
        items: order.items.map(formatOrderItem),
        shipment: formatShipment(order.shipment),
        refundRequest: formatRefundRequest(order.refundRequest),
        canRequestRefund: isBuyer && !order.refundRequest && REFUNDABLE_ORDER_STATUSES.has(order.status),
        canUpdateShipment: (isSeller || isAdmin) && !["취소", "환불완료", "반품"].includes(order.status),
      },
    };
  } catch (error) {
    console.error("Failed to load order detail:", error);
    return { status: "error", error: error.message };
  }
}

/**
 * Toggle like for a product
 */
export async function toggleLike(productId) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const activeUserId = authUser.id;

    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      throw new Error("올바르지 않은 상품 ID입니다.");
    }

    const existing = await prisma.like.findUnique({
      where: {
        userId_productId: { userId: activeUserId, productId },
      },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({
          where: {
            userId_productId: { userId: activeUserId, productId },
          },
        }),
        prisma.product.update({
          where: { id: productId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      revalidateTag(`product-${productId}`, "max");
      revalidateTag("home", "max");
      return { liked: false };
    } else {
      await prisma.$transaction([
        prisma.like.create({
          data: { userId: activeUserId, productId },
        }),
        prisma.product.update({
          where: { id: productId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      revalidateTag(`product-${productId}`, "max");
      revalidateTag("home", "max");
      return { liked: true };
    }
  } catch (error) {
    console.error("Failed to toggle product like:", error);
    throw new Error(error.message || "상품 찜 처리에 실패했습니다.");
  }
}

/**
 * Toggle follow for a brand
 */
export async function toggleFollow(sellerId) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const activeUserId = authUser.id;

    if (!sellerId || typeof sellerId !== 'string' || sellerId.trim() === '') {
      throw new Error("올바르지 않은 셀러 ID입니다.");
    }

    const existing = await prisma.follow.findUnique({
      where: {
        userId_sellerId: { userId: activeUserId, sellerId },
      },
    });

    if (existing) {
      await prisma.follow.delete({
        where: {
          userId_sellerId: { userId: activeUserId, sellerId },
        },
      });
      return { followed: false };
    } else {
      await prisma.follow.create({
        data: { userId: activeUserId, sellerId },
      });
      return { followed: true };
    }
  } catch (error) {
    console.error("Failed to toggle brand follow:", error);
    throw new Error(error.message || "브랜드 팔로우 처리에 실패했습니다.");
  }
}

export async function prepareCheckout({ name, phone, address, total, items, origin }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const activeUserId = authUser.id;

    if (!getTossClientKey()) {
      throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수를 설정해야 결제창을 열 수 있습니다.");
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new Error("수령인 이름은 필수 입력 항목입니다.");
    }
    if (!address || typeof address !== "string" || address.trim() === "") {
      throw new Error("배송지 주소는 필수 입력 항목입니다.");
    }
    const cleanPhone = cleanText(phone);
    if (!cleanPhone) {
      throw new Error("수령인 연락처는 필수 입력 항목입니다.");
    }
    if (cleanPhone.length > 30) {
      throw new Error("수령인 연락처는 30자 이하여야 합니다.");
    }

    const { lines, computedTotal } = await buildCheckoutLines({ total, items });
    const orderName = buildOrderName(lines).slice(0, 100);
    const providerOrderId = createProviderOrderId();
    const checkoutOrigin = normalizeCheckoutOrigin(origin);

    const payment = await prisma.payment.create({
      data: {
        provider: "TOSS",
        providerOrderId,
        status: "READY",
        amount: computedTotal,
        orderName,
        buyerName: name.trim(),
        buyerPhone: cleanPhone,
        shippingAddress: address.trim(),
        itemsSnapshot: lines,
        userId: activeUserId,
      },
    });

    return {
      success: true,
      provider: "TOSS",
      sdkUrl: TOSS_SDK_URL,
      clientKey: getTossClientKey(),
      customerKey: activeUserId,
      paymentId: payment.id,
      providerOrderId,
      amount: computedTotal,
      orderName,
      customerName: name.trim(),
      customerEmail: authUser.email || "",
      customerMobilePhone: cleanPhone.replace(/\D/g, ""),
      successUrl: `${checkoutOrigin}/checkout/success`,
      failUrl: `${checkoutOrigin}/checkout/fail`,
    };
  } catch (error) {
    console.error("Failed to prepare checkout:", error);
    throw new Error(error.message || "결제 준비에 실패했습니다.");
  }
}

export async function confirmCheckout({ paymentKey, providerOrderId, amount }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const cleanPaymentKey = cleanText(paymentKey);
    const cleanProviderOrderId = cleanText(providerOrderId);
    const numericAmount = Number(amount);
    if (!cleanPaymentKey || !cleanProviderOrderId || !Number.isFinite(numericAmount)) {
      throw new Error("결제 승인 정보가 올바르지 않습니다.");
    }

    const payment = await prisma.payment.findUnique({
      where: { providerOrderId: cleanProviderOrderId },
      include: { order: true },
    });
    if (!payment || payment.userId !== authUser.id) throw new Error("결제 요청을 찾을 수 없습니다.");
    if (payment.status === "PAID" && payment.order) {
      return { success: true, orderId: payment.order.id, alreadyConfirmed: true };
    }
    if (payment.status !== "READY") throw new Error("이미 처리된 결제 요청입니다.");
    if (payment.amount !== Math.round(numericAmount)) {
      throw new Error("결제 금액이 서버에 저장된 금액과 일치하지 않습니다.");
    }

    const tossPayment = await confirmTossPayment({
      paymentKey: cleanPaymentKey,
      orderId: cleanProviderOrderId,
      amount: payment.amount,
    });
    if (tossPayment.status && tossPayment.status !== "DONE") {
      throw new Error("결제가 완료 상태가 아닙니다.");
    }

    const approvedAt = tossPayment.approvedAt ? new Date(tossPayment.approvedAt) : null;
    const order = await settlePaidPaymentWithOrder({
      paymentId: payment.id,
      activeUserId: authUser.id,
      paymentKey: cleanPaymentKey,
      rawResponse: tossPayment,
      approvedAt: approvedAt && !Number.isNaN(approvedAt.getTime()) ? approvedAt : undefined,
    });

    revalidateTag("orders", "max");
    revalidateTag(`order-${order.id}`, "max");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Failed to confirm checkout:", error);
    throw new Error(error.message || "결제 승인에 실패했습니다.");
  }
}

export async function markCheckoutFailed({ providerOrderId, code, message }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return { success: false };
    const cleanProviderOrderId = cleanText(providerOrderId);
    if (!cleanProviderOrderId) return { success: false };

    const payment = await prisma.payment.findUnique({ where: { providerOrderId: cleanProviderOrderId } });
    if (!payment || payment.userId !== authUser.id || payment.status !== "READY") return { success: false };

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureCode: cleanText(code) || null,
        failureMessage: cleanText(message) || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to mark checkout failed:", error);
    return { success: false };
  }
}

/**
 * Direct order creation is intentionally disabled. Orders must be created only
 * after PG confirmation through confirmCheckout().
 */
export async function createOrder() {
  try {
    await getAuthUser();
    throw new Error("주문은 PG 결제 승인 후에만 생성할 수 있습니다.");
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error(error.message || "주문 및 결제 처리에 실패했습니다.");
  }
}

/**
 * Create a new Seller profile (onboarding)
 */
export async function createSeller({
  sellerId,
  name,
  desc,
  category,
  story,
  notice,
  firstProduct,
  sellerType,
  businessName,
  businessRegNo,
  representative,
}) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const activeUserId = authUser.id;
    
    // Input validations
    if (!sellerId || typeof sellerId !== 'string' || !/^[a-z0-9]{3,20}$/.test(sellerId)) {
      throw new Error("셀러 ID는 3자 이상 20자 이하의 영문 소문자와 숫자만 사용할 수 있습니다.");
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error("브랜드 이름은 필수 입력 항목입니다.");
    }
    if (name.length > 50) {
      throw new Error("브랜드 이름은 50자 이하여야 합니다.");
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      throw new Error("카테고리는 필수 입력 항목입니다.");
    }
    
    const firstProductDraft = firstProduct
      ? validateProductDraft({ ...firstProduct, category: firstProduct.category || category })
      : null;
    const cleanSellerType = normalizeSellerType(sellerType);
    const cleanBusinessName = cleanText(businessName);
    const cleanRepresentative = cleanText(representative);
    const cleanBusinessRegNo = normalizeBusinessRegNo(businessRegNo);

    // Ensure the specific User exists in the database
    let user = await prisma.user.findUnique({ where: { id: activeUserId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: activeUserId,
          email: authUser.email,
          name: name,
          role: "SELLER"
        }
      });
    } else {
      // Update role to SELLER
      await prisma.user.update({
        where: { id: activeUserId },
        data: { role: "SELLER" },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the Seller profile
      const seller = await tx.seller.create({
        data: {
          id: sellerId,
          name,
          verified: false,
          desc: desc || `${category} 전문 브랜드`,
          category,
          followers: "0",
          productsCount: firstProductDraft ? 1 : 0,
          since: new Date().getFullYear().toString(),
          tone: "tone-a",
          story: story ? [story] : ["신규 입점 브랜드 스토리입니다."],
          notice: notice || null,
          sellerType: cleanSellerType,
          businessName: cleanBusinessName || null,
          businessRegNo: cleanBusinessRegNo || null,
          representative: cleanRepresentative || null,
          userId: activeUserId,
        },
      });

      let product = null;
      if (firstProductDraft) {
        product = await tx.product.create({
          data: {
            name: firstProductDraft.name,
            price: firstProductDraft.price,
            cat: firstProductDraft.category,
            icon: iconForCategory(firstProductDraft.category),
            tone: "tone-a",
            badge: "new",
            desc: firstProductDraft.desc,
            images: firstProductDraft.imageUrl ? [firstProductDraft.imageUrl] : [],
            reviewStatus: "PENDING",
            isActive: true,
            sellerId: sellerId,
            spec: buildSellerProductSpec(firstProductDraft, name),
          },
        });
      }

      return { seller, product };
    });

    revalidateTag("sellers", "max");
    revalidateTag("home", "max");

    return {
      success: true,
      seller: result.seller,
      product: result.product ? {
        id: result.product.id,
        seller: result.product.sellerId,
        name: result.product.name,
        price: result.product.price,
        cat: result.product.cat,
        icon: result.product.icon,
        tone: result.product.tone,
        badge: result.product.badge,
        disc: result.product.disc,
        orig: result.product.orig,
        rating: result.product.rating,
        reviews: result.product.reviews,
        likes: result.product.likesCount,
        images: normalizeProductImages(result.product.images),
        spec: result.product.spec,
        desc: result.product.desc,
        isActive: result.product.isActive,
        reviewStatus: result.product.reviewStatus,
      } : null,
    };
  } catch (error) {
    console.error("Failed to onboard seller brand:", error);
    throw new Error(error.message || "브랜드 입점 신청에 실패했습니다.");
  }
}

/**
 * Create a new product for the currently logged-in seller.
 */
export async function createSellerProduct(input) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");

    const seller = await prisma.seller.findUnique({ where: { userId: authUser.id } });
    if (!seller) throw new Error("판매자 계정이 없습니다.");

    const draft = validateProductDraft(input || {});

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: draft.name,
          price: draft.price,
          cat: draft.category,
          icon: iconForCategory(draft.category),
          tone: seller.tone || "tone-a",
          badge: "new",
          rating: 4.8,
          reviews: 0,
          likesCount: 0,
          desc: draft.desc,
          images: draft.imageUrl ? [draft.imageUrl] : [],
          reviewStatus: "PENDING",
          isActive: true,
          sellerId: seller.id,
          spec: buildSellerProductSpec(draft, seller.name),
        },
      });

      const productsCount = await tx.product.count({ where: { sellerId: seller.id } });
      await tx.seller.update({
        where: { id: seller.id },
        data: { productsCount },
      });

      return created;
    });

    revalidateTag("products", "max");
    revalidateTag(`product-${product.id}`, "max");
    revalidateTag(`seller-${seller.id}`, "max");
    revalidateTag("sellers", "max");
    revalidateTag("home", "max");

    return { success: true, product: formatProduct(product) };
  } catch (error) {
    console.error("Failed to create seller product:", error);
    throw new Error(error.message || "상품 등록에 실패했습니다.");
  }
}

/**
 * Update seller compliance/KYC and settlement account details.
 */
export async function updateSellerCompliance(input = {}) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");

    const seller = await prisma.seller.findUnique({
      where: { userId: authUser.id },
      include: { bankAccount: true },
    });
    if (!seller) throw new Error("판매자 계정이 없습니다.");

    const sellerType = normalizeSellerType(input.sellerType);
    const businessName = cleanText(input.businessName);
    const representative = cleanText(input.representative);
    const businessRegNo = normalizeBusinessRegNo(input.businessRegNo);
    const businessDocumentUrl = normalizeDocumentUrl(input.businessDocumentUrl);
    const mailOrderDocumentUrl = normalizeDocumentUrl(input.mailOrderDocumentUrl);
    const businessDocumentPath = normalizeSellerDocumentPath(input.businessDocumentPath, seller.id);
    const mailOrderDocumentPath = normalizeSellerDocumentPath(input.mailOrderDocumentPath, seller.id);

    if (!representative) throw new Error("대표자 또는 판매자 성명을 입력해 주세요.");
    if (sellerType === "BUSINESS") {
      if (!businessName) throw new Error("사업자 판매자는 상호를 입력해야 합니다.");
      if (!businessRegNo) throw new Error("사업자 판매자는 사업자등록번호를 입력해야 합니다.");
      if (!businessDocumentUrl && !businessDocumentPath) {
        throw new Error("사업자등록증 증빙 파일을 업로드하거나 URL을 입력해 주세요.");
      }
    }

    const bankName = cleanText(input.bankName);
    const accountHolder = cleanText(input.accountHolder);
    const accountNumber = cleanText(input.accountNumber);
    const wantsBankUpdate = Boolean(bankName || accountHolder || accountNumber);
    if (!seller.bankAccount && wantsBankUpdate && (!bankName || !accountHolder || !accountNumber)) {
      throw new Error("정산 계좌를 저장하려면 은행명, 예금주, 계좌번호를 모두 입력해 주세요.");
    }
    if (seller.bankAccount && wantsBankUpdate && (!bankName || !accountHolder)) {
      throw new Error("정산 계좌를 수정하려면 은행명과 예금주를 입력해 주세요.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.seller.update({
        where: { id: seller.id },
        data: {
          sellerType,
          businessName: businessName || null,
          representative,
          businessRegNo: businessRegNo || null,
          businessDocumentUrl: businessDocumentUrl || null,
          mailOrderDocumentUrl: mailOrderDocumentUrl || null,
          businessDocumentPath: businessDocumentPath || null,
          mailOrderDocumentPath: mailOrderDocumentPath || null,
          kycStatus: "SUBMITTED",
          kycSubmittedAt: new Date(),
          kycMemo: null,
        },
      });

      let bankAccount = seller.bankAccount;
      if (wantsBankUpdate) {
        const bankChanged = !seller.bankAccount
          || seller.bankAccount.bankName !== bankName
          || seller.bankAccount.accountHolder !== accountHolder
          || Boolean(accountNumber);
        bankAccount = await tx.sellerBankAccount.upsert({
          where: { sellerId: seller.id },
          update: {
            bankName,
            accountHolder,
            ...(accountNumber ? { accountNumber: encryptSensitiveText(accountNumber) } : {}),
            isVerified: bankChanged ? false : seller.bankAccount.isVerified,
          },
          create: {
            sellerId: seller.id,
            bankName,
            accountHolder,
            accountNumber: encryptSensitiveText(accountNumber),
            isVerified: false,
          },
        });
      }

      return { seller: updatedSeller, bankAccount };
    });

    revalidateTag(`seller-${seller.id}`, "max");
    revalidateTag("sellers", "max");
    revalidateTag("home", "max");

    return {
      success: true,
      seller: formatSeller(result.seller, { includeSensitive: true }),
      bankAccount: formatBankAccount(result.bankAccount),
      compliance: {
        issues: sellerComplianceIssues(result.seller, result.bankAccount),
      },
    };
  } catch (error) {
    console.error("Failed to update seller compliance:", error);
    throw new Error(error.message || "판매자 운영 정보 저장에 실패했습니다.");
  }
}

/**
 * Current seller's private dashboard data.
 * This is intentionally not cached because it is user-scoped operational data.
 */
export async function getSellerDashboard() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { status: "guest", seller: null, products: [], orders: [], settlements: [] };
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: authUser.id },
      include: { bankAccount: true },
    });
    if (!seller) {
      return { status: "noSeller", seller: null, products: [], orders: [], settlements: [] };
    }

    const [products, orderItems, settlements] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: seller.id },
        orderBy: { name: "asc" },
      }),
      prisma.orderItem.findMany({
        where: { product: { sellerId: seller.id } },
        include: {
          product: { select: { id: true, name: true, icon: true, tone: true, images: true } },
          order: { select: { id: true, status: true, date: true, name: true, total: true, address: true } },
        },
        orderBy: { order: { date: "desc" } },
        take: 20,
      }),
      prisma.settlement.findMany({
        where: { sellerId: seller.id },
        include: {
          orderItem: { include: { product: { select: { name: true } }, order: { select: { date: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const totalSales = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pendingOrders = orderItems.filter((item) => !["배송완료", "구매확정", "취소", "환불완료"].includes(item.order.status)).length;
    const pendingSettlement = settlements
      .filter((s) => SETTLEMENT_PAYABLE_STATUSES.includes(s.status))
      .reduce((sum, s) => sum + s.netAmount, 0);

    return {
      status: "seller",
      seller: formatSeller(seller, { includeSensitive: true }),
      documentLinks: await formatSellerDocumentLinks(seller),
      bankAccount: formatBankAccount(seller.bankAccount),
      compliance: {
        issues: sellerComplianceIssues(seller, seller.bankAccount),
      },
      stats: {
        products: products.length,
        totalSales,
        pendingOrders,
        pendingSettlement,
      },
      products: products.map(formatProduct),
      orders: orderItems.map((item) => ({
        id: item.order.id,
        itemId: item.id,
        productId: item.product.id,
        productName: item.product.name,
        icon: item.product.icon,
        tone: item.product.tone,
        images: normalizeProductImages(item.product.images),
        buyer: item.order.name,
        status: item.order.status,
        date: item.order.date.toLocaleDateString("ko-KR"),
        total: item.order.total,
        itemTotal: item.price * item.quantity,
        quantity: item.quantity,
        address: item.order.address,
      })),
      settlements: settlements.map((s) => ({
        id: s.id,
        productName: s.orderItem.product.name,
        saleAmount: s.saleAmount,
        commissionAmount: s.commissionAmount,
        netAmount: s.netAmount,
        status: s.status,
        createdAt: s.createdAt.toLocaleDateString("ko-KR"),
        settledAt: s.settledAt ? s.settledAt.toLocaleDateString("ko-KR") : null,
      })),
    };
  } catch (error) {
    console.error("Failed to load seller dashboard:", error);
    return { status: "error", error: error.message, seller: null, products: [], orders: [], settlements: [] };
  }
}

// ============================================================
//  Admin operations (auth required → ADMIN only)
// ============================================================

const REQUIRED_ADMIN_SPEC = ["소재", "제조국", "치수", "취급 주의", "A/S 책임자", "KC 인증 여부"];
const PRODUCT_REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const ORDER_STATUS_OPTIONS = ["결제완료", "배송 준비중", "배송중", "배송완료", "구매확정", "취소", "반품", "환불완료", "반품 신청"];
const SETTLEMENT_STATUS_OPTIONS = ["PENDING", "CONFIRMED", "PAID", "CANCELED"];
const SETTLEMENT_PAYABLE_STATUSES = ["PENDING", "CONFIRMED"];
const SETTLEMENT_CANCEL_ORDER_STATUSES = ["취소", "환불완료"];
const KYC_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

function normalizeSellerType(value) {
  const clean = cleanText(value || "INDIVIDUAL").toUpperCase();
  return ["INDIVIDUAL", "BUSINESS"].includes(clean) ? clean : "INDIVIDUAL";
}

function normalizeBusinessRegNo(value) {
  const digits = cleanText(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length !== 10) throw new Error("사업자등록번호는 숫자 10자리로 입력해 주세요.");
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function normalizeDocumentUrl(value) {
  const url = cleanText(value);
  if (!url) return "";
  if (url.length > 800) throw new Error("증빙 문서 URL은 800자 이하여야 합니다.");
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    // handled below
  }
  throw new Error("증빙 문서 URL은 http(s) 또는 / 로 시작하는 경로여야 합니다.");
}

function normalizeSellerDocumentPath(value, sellerId) {
  const path = cleanText(value);
  if (!path) return "";
  if (path.length > 800) throw new Error("증빙 문서 경로는 800자 이하여야 합니다.");
  const cleanSellerId = cleanText(sellerId);
  if (!cleanSellerId || !path.startsWith(`${cleanSellerId}/`)) {
    throw new Error("증빙 문서 경로가 현재 판매자 폴더와 일치하지 않습니다.");
  }
  if (path.includes("..") || path.startsWith("/") || path.endsWith("/")) {
    throw new Error("증빙 문서 경로 형식이 올바르지 않습니다.");
  }
  return path;
}

function getStorageAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createSellerDocumentSignedUrl(path) {
  const storagePath = cleanText(path);
  if (!storagePath) return null;
  const adminClient = getStorageAdminClient();
  if (!adminClient) return null;

  const { data, error } = await adminClient.storage
    .from(SELLER_DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    console.error("Failed to create signed seller document URL:", error.message);
    return null;
  }
  return data?.signedUrl || null;
}

async function formatSellerDocumentLinks(seller) {
  return {
    businessDocument: seller.businessDocumentPath
      ? await createSellerDocumentSignedUrl(seller.businessDocumentPath)
      : seller.businessDocumentUrl || null,
    mailOrderDocument: seller.mailOrderDocumentPath
      ? await createSellerDocumentSignedUrl(seller.mailOrderDocumentPath)
      : seller.mailOrderDocumentUrl || null,
  };
}

function getEncryptionMaterial() {
  const key = process.env.ENCRYPTION_KEY;
  const iv = process.env.ENCRYPTION_IV;
  if (!/^[a-fA-F0-9]{64}$/.test(key || "") || !/^[a-fA-F0-9]{32}$/.test(iv || "")) {
    throw new Error("정산 계좌 저장에는 ENCRYPTION_KEY/ENCRYPTION_IV 환경변수 설정이 필요합니다.");
  }
  return { key: Buffer.from(key, "hex"), iv: Buffer.from(iv, "hex") };
}

function encryptSensitiveText(value) {
  const text = cleanText(value);
  if (!text) return "";
  const { key, iv } = getEncryptionMaterial();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return `${cipher.update(text, "utf8", "hex")}${cipher.final("hex")}`;
}

function decryptSensitiveText(value) {
  const encrypted = cleanText(value);
  if (!encrypted) return "";
  try {
    const { key, iv } = getEncryptionMaterial();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return `${decipher.update(encrypted, "hex", "utf8")}${decipher.final("utf8")}`;
  } catch {
    return "";
  }
}

function maskAccountNumber(value) {
  const clean = cleanText(value);
  if (!clean) return "";
  const raw = decryptSensitiveText(clean) || clean;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "저장됨";
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

function formatBankAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    bankName: account.bankName,
    accountHolder: account.accountHolder,
    accountNumberMasked: maskAccountNumber(account.accountNumber),
    isVerified: account.isVerified,
    updatedAt: formatDate(account.updatedAt),
  };
}

function sellerComplianceIssues(seller, bankAccount) {
  const issues = [];
  if (!seller.businessName && seller.sellerType === "BUSINESS") issues.push("상호 미입력");
  if (!seller.representative) issues.push("대표자/성명 미입력");
  if (seller.sellerType === "BUSINESS" && !seller.businessRegNo) issues.push("사업자등록번호 미입력");
  if (seller.sellerType === "BUSINESS" && !seller.businessDocumentUrl && !seller.businessDocumentPath) issues.push("사업자등록증 미제출");
  if (!bankAccount) issues.push("정산 계좌 미등록");
  if (bankAccount && !bankAccount.isVerified) issues.push("정산 계좌 미검증");
  return issues;
}

function productReviewIssues(product) {
  const issues = [];
  const specRows = Array.isArray(product.spec) ? product.spec : [];
  const specMap = new Map(specRows.map(([key, value]) => [String(key || "").trim(), String(value || "").trim()]));

  if (normalizeProductImages(product.images).length === 0) issues.push("이미지 없음");
  if (!cleanText(product.desc)) issues.push("상품 설명 없음");
  REQUIRED_ADMIN_SPEC.forEach((key) => {
    if (!specMap.get(key)) issues.push(`${key} 없음`);
  });

  return issues;
}

function formatAdminSeller(seller) {
  const issues = sellerComplianceIssues(seller, seller.bankAccount);
  return {
    ...formatSeller(seller, { includeSensitive: true }),
    ownerEmail: seller.user?.email || "",
    ownerName: seller.user?.name || "",
    ownerRole: seller.user?.role || "",
    bankAccount: formatBankAccount(seller.bankAccount),
    complianceIssues: issues,
    businessDocumentSubmitted: Boolean(seller.businessDocumentUrl),
    mailOrderDocumentSubmitted: Boolean(seller.mailOrderDocumentUrl),
    deletedAt: formatDate(seller.deletedAt),
  };
}

async function formatAdminSellerWithDocuments(seller) {
  return {
    ...formatAdminSeller(seller),
    documentLinks: await formatSellerDocumentLinks(seller),
    businessDocumentSubmitted: Boolean(seller.businessDocumentUrl || seller.businessDocumentPath),
    mailOrderDocumentSubmitted: Boolean(seller.mailOrderDocumentUrl || seller.mailOrderDocumentPath),
  };
}

function formatAdminProduct(product) {
  return {
    ...formatProduct(product),
    sellerName: product.seller?.name || product.sellerId,
    sellerActive: product.seller?.isActive ?? false,
    sellerVerified: product.seller?.verified ?? false,
    issues: productReviewIssues(product),
    reviewedAt: formatDate(product.reviewedAt),
    deletedAt: formatDate(product.deletedAt),
  };
}

function formatAdminOrder(order) {
  const sellers = Array.from(new Set(order.items.map((item) => item.product?.seller?.name || item.product?.sellerId).filter(Boolean)));
  return {
    id: order.id,
    buyer: order.name,
    buyerEmail: order.user?.email || "",
    total: order.total,
    status: order.status,
    date: formatDate(order.date),
    address: order.address,
    sellers,
    itemCount: order.items.length,
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || item.productId,
      sellerId: item.product?.sellerId || "",
      sellerName: item.product?.seller?.name || "",
      price: item.price,
      quantity: item.quantity,
    })),
  };
}

export async function getAdminDashboard() {
  try {
    const access = await getAdminAccess();
    if (access.status === "guest") return { status: "guest" };
    if (access.status !== "admin") {
      return {
        status: "forbidden",
        user: access.user ? { email: access.user.email, role: access.user.role } : null,
      };
    }

    const [sellers, products, orders, refunds, settlements, inquiries] = await Promise.all([
      prisma.seller.findMany({
        include: {
          user: { select: { email: true, name: true, role: true } },
          bankAccount: true,
        },
        orderBy: { since: "desc" },
        take: 80,
      }),
      prisma.product.findMany({
        include: { seller: { select: { id: true, name: true, verified: true, isActive: true } } },
        orderBy: { name: "asc" },
        take: 120,
      }),
      prisma.order.findMany({
        include: {
          user: { select: { email: true, name: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sellerId: true,
                  seller: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.refundRequest.findMany({
        include: {
          user: { select: { email: true, name: true } },
          order: { select: { id: true, status: true, total: true, name: true } },
        },
        orderBy: { requestedAt: "desc" },
        take: 30,
      }),
      prisma.settlement.findMany({
        include: {
          seller: { select: { id: true, name: true } },
          orderItem: { include: { product: { select: { name: true } }, order: { select: { id: true, date: true, status: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.csInquiry.findMany({
        include: {
          user: { select: { email: true, name: true } },
          seller: { select: { id: true, name: true } },
          replies: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

    const adminProducts = products
      .map(formatAdminProduct)
      .sort((a, b) => {
        const weight = { PENDING: 0, REJECTED: 1, APPROVED: 2 };
        return (weight[a.reviewStatus] ?? 9) - (weight[b.reviewStatus] ?? 9) || a.name.localeCompare(b.name, "ko");
      });

    return {
      status: "admin",
      user: { email: access.user.email, name: access.user.name, role: access.user.role },
      stats: {
        sellers: sellers.length,
        activeSellers: sellers.filter((seller) => seller.isActive && !seller.deletedAt).length,
        unverifiedSellers: sellers.filter((seller) => !seller.verified).length,
        pendingKyc: sellers.filter((seller) => seller.kycStatus === "SUBMITTED").length,
        products: products.length,
        pendingProducts: products.filter((product) => product.reviewStatus === "PENDING").length,
        rejectedProducts: products.filter((product) => product.reviewStatus === "REJECTED").length,
        orders: orders.length,
        openRefunds: refunds.filter((refund) => refund.status === "REQUESTED").length,
        pendingSettlement: settlements
          .filter((settlement) => SETTLEMENT_PAYABLE_STATUSES.includes(settlement.status))
          .reduce((sum, settlement) => sum + settlement.netAmount, 0),
        openInquiries: inquiries.filter((inquiry) => inquiry.status !== "CLOSED").length,
      },
      sellers: await Promise.all(sellers.map(formatAdminSellerWithDocuments)),
      products: adminProducts,
      orders: orders.map(formatAdminOrder),
      refunds: refunds.map((refund) => ({
        id: refund.id,
        orderId: refund.orderId,
        buyer: refund.user?.email || refund.userId,
        orderStatus: refund.order?.status || "",
        orderTotal: refund.order?.total || 0,
        reason: refund.reason,
        reasonDetail: refund.reasonDetail || "",
        status: refund.status,
        refundAmount: refund.refundAmount,
        requestedAt: formatDate(refund.requestedAt),
      })),
      settlements: settlements.map((settlement) => ({
        id: settlement.id,
        sellerId: settlement.sellerId,
        sellerName: settlement.seller?.name || settlement.sellerId,
        productName: settlement.orderItem?.product?.name || "",
        orderId: settlement.orderItem?.order?.id || "",
        orderStatus: settlement.orderItem?.order?.status || "",
        saleAmount: settlement.saleAmount,
        commissionAmount: settlement.commissionAmount,
        netAmount: settlement.netAmount,
        status: settlement.status,
        createdAt: formatDate(settlement.createdAt),
        settledAt: formatDate(settlement.settledAt),
      })),
      inquiries: inquiries.map((inquiry) => ({
        id: inquiry.id,
        title: inquiry.title,
        type: inquiry.type,
        content: inquiry.content,
        status: inquiry.status,
        userEmail: inquiry.user?.email || "",
        sellerName: inquiry.seller?.name || "",
        createdAt: formatDate(inquiry.createdAt),
        latestReply: inquiry.replies?.[0] ? {
          content: inquiry.replies[0].content,
          createdAt: formatDate(inquiry.replies[0].createdAt),
        } : null,
      })),
      options: {
        productReviewStatuses: PRODUCT_REVIEW_STATUSES,
        orderStatuses: ORDER_STATUS_OPTIONS,
        settlementStatuses: SETTLEMENT_STATUS_OPTIONS,
        refundStatuses: REFUND_STATUSES,
        inquiryStatuses: INQUIRY_STATUSES,
        kycStatuses: KYC_STATUSES,
      },
    };
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);
    return { status: "error", error: error.message };
  }
}

export async function updateAdminSellerStatus({ sellerId, verified, isActive, kycStatus, kycMemo, bankAccountVerified }) {
  try {
    const admin = await requireAdminUser();
    if (!sellerId || typeof sellerId !== "string") throw new Error("올바르지 않은 판매자 ID입니다.");

    const data = {};
    if (typeof verified === "boolean") data.verified = verified;
    if (typeof isActive === "boolean") {
      data.isActive = isActive;
      data.deletedAt = isActive ? null : new Date();
    }
    if (kycStatus !== undefined) {
      if (!KYC_STATUSES.includes(kycStatus)) throw new Error("올바르지 않은 KYC 상태입니다.");
      data.kycStatus = kycStatus;
      data.kycMemo = cleanText(kycMemo) || null;
      data.kycReviewedAt = new Date();
      data.kycReviewedBy = admin.id;
    }
    if (Object.keys(data).length === 0 && typeof bankAccountVerified !== "boolean") {
      throw new Error("변경할 판매자 상태가 없습니다.");
    }

    const existingSeller = await prisma.seller.findUnique({ where: { id: sellerId }, select: { id: true } });
    if (!existingSeller) throw new Error("판매자를 찾을 수 없습니다.");

    const seller = await prisma.$transaction(async (tx) => {
      const updated = Object.keys(data).length > 0
        ? await tx.seller.update({ where: { id: sellerId }, data })
        : await tx.seller.findUnique({ where: { id: sellerId } });
      if (typeof bankAccountVerified === "boolean") {
        await tx.sellerBankAccount.updateMany({
          where: { sellerId },
          data: { isVerified: bankAccountVerified },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_SELLER",
          targetTable: "Seller",
          targetId: sellerId,
        },
      });
      return updated;
    });

    revalidateTag("sellers", "max");
    revalidateTag(`seller-${sellerId}`, "max");
    revalidateTag("home", "max");
    revalidateTag("products", "max");

    return { success: true, seller: formatSeller(seller) };
  } catch (error) {
    console.error("Failed to update seller status:", error);
    throw new Error(error.message || "판매자 상태 변경에 실패했습니다.");
  }
}

export async function updateAdminProductReview({ productId, reviewStatus, isActive }) {
  try {
    const admin = await requireAdminUser();
    if (!productId || typeof productId !== "string") throw new Error("올바르지 않은 상품 ID입니다.");

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
    if (!product) throw new Error("상품을 찾을 수 없습니다.");

    const data = {};
    if (reviewStatus !== undefined) {
      if (!PRODUCT_REVIEW_STATUSES.includes(reviewStatus)) throw new Error("올바르지 않은 상품 검수 상태입니다.");
      data.reviewStatus = reviewStatus;
      data.reviewedAt = new Date();
      data.reviewedBy = admin.id;
    }
    if (typeof isActive === "boolean") {
      data.isActive = isActive;
      data.deletedAt = isActive ? null : new Date();
    }
    if (Object.keys(data).length === 0) throw new Error("변경할 상품 상태가 없습니다.");

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.product.update({ where: { id: productId }, data });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_PRODUCT_REVIEW",
          targetTable: "Product",
          targetId: productId,
        },
      });
      return row;
    });

    revalidateTag("products", "max");
    revalidateTag(`product-${productId}`, "max");
    revalidateTag(`seller-${product.sellerId}`, "max");
    revalidateTag("home", "max");

    return { success: true, product: formatProduct(updated) };
  } catch (error) {
    console.error("Failed to update product review:", error);
    throw new Error(error.message || "상품 검수 상태 변경에 실패했습니다.");
  }
}

export async function updateAdminOrderStatus({ orderId, status }) {
  try {
    const admin = await requireAdminUser();
    if (!orderId || typeof orderId !== "string") throw new Error("올바르지 않은 주문 ID입니다.");
    if (!ORDER_STATUS_OPTIONS.includes(status)) throw new Error("올바르지 않은 주문 상태입니다.");

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: { select: { id: true } } },
      });
      const orderItemIds = updated.items.map((item) => item.id);
      let settlementsUpdated = 0;

      if (orderItemIds.length > 0 && status === "구매확정") {
        const settlementResult = await tx.settlement.updateMany({
          where: { orderItemId: { in: orderItemIds }, status: "PENDING" },
          data: { status: "CONFIRMED", settledAt: null },
        });
        settlementsUpdated = settlementResult.count || 0;
      }

      if (orderItemIds.length > 0 && SETTLEMENT_CANCEL_ORDER_STATUSES.includes(status)) {
        const settlementResult = await tx.settlement.updateMany({
          where: { orderItemId: { in: orderItemIds }, status: { in: SETTLEMENT_PAYABLE_STATUSES } },
          data: { status: "CANCELED", settledAt: null },
        });
        settlementsUpdated = settlementResult.count || 0;
      }

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_ORDER_STATUS",
          targetTable: "Order",
          targetId: orderId,
        },
      });
      return { order: updated, settlementsUpdated };
    });

    revalidateTag(`order-${orderId}`, "max");
    return {
      success: true,
      order: { id: result.order.id, status: result.order.status },
      settlementsUpdated: result.settlementsUpdated,
    };
  } catch (error) {
    console.error("Failed to update order status:", error);
    throw new Error(error.message || "주문 상태 변경에 실패했습니다.");
  }
}

export async function updateAdminSettlementStatus({ settlementId, status }) {
  try {
    const admin = await requireAdminUser();
    if (!settlementId || typeof settlementId !== "string") throw new Error("올바르지 않은 정산 ID입니다.");
    if (!SETTLEMENT_STATUS_OPTIONS.includes(status)) throw new Error("올바르지 않은 정산 상태입니다.");

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        orderItem: {
          select: {
            order: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!settlement) throw new Error("정산 내역을 찾을 수 없습니다.");
    if (settlement.status === "PAID" && status !== "PAID") {
      throw new Error("이미 지급 완료된 정산은 되돌릴 수 없습니다.");
    }
    if (status === "CONFIRMED" && settlement.orderItem?.order?.status !== "구매확정") {
      throw new Error("구매확정 주문의 정산만 확정할 수 있습니다.");
    }
    if (status === "PAID" && !["CONFIRMED", "PAID"].includes(settlement.status)) {
      throw new Error("구매확정으로 확정된 정산만 지급 완료 처리할 수 있습니다.");
    }

    const data = {
      status,
      settledAt: status === "PAID" ? (settlement.settledAt || new Date()) : null,
    };
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.settlement.update({ where: { id: settlementId }, data });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_SETTLEMENT_STATUS",
          targetTable: "Settlement",
          targetId: settlementId,
        },
      });
      return row;
    });

    const orderId = settlement.orderItem?.order?.id;
    if (orderId) revalidateTag(`order-${orderId}`, "max");

    return {
      success: true,
      settlement: {
        id: updated.id,
        status: updated.status,
        settledAt: formatDate(updated.settledAt),
      },
    };
  } catch (error) {
    console.error("Failed to update settlement status:", error);
    throw new Error(error.message || "정산 상태 변경에 실패했습니다.");
  }
}

export async function updateAdminRefundStatus({ refundId, status, refundAmount }) {
  try {
    const admin = await requireAdminUser();
    if (!refundId || typeof refundId !== "string") throw new Error("올바르지 않은 환불 요청 ID입니다.");
    if (!REFUND_STATUSES.includes(status)) throw new Error("올바르지 않은 환불 상태입니다.");

    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            items: { select: { id: true } },
            payment: {
              select: {
                id: true,
                status: true,
                amount: true,
                paymentKey: true,
                rawResponse: true,
              },
            },
          },
        },
      },
    });
    if (!refund) throw new Error("환불 요청을 찾을 수 없습니다.");
    if (refund.status === "COMPLETED" && status !== "COMPLETED") {
      throw new Error("이미 환불 완료된 요청은 되돌릴 수 없습니다.");
    }

    const isFinalStatus = ["REJECTED", "COMPLETED"].includes(status);
    const numericRefundAmount = refundAmount === undefined || refundAmount === null || refundAmount === ""
      ? refund.order?.total
      : Number(refundAmount);
    if (status === "COMPLETED" && (!Number.isFinite(numericRefundAmount) || numericRefundAmount <= 0)) {
      throw new Error("환불 완료 금액이 올바르지 않습니다.");
    }
    const roundedRefundAmount = status === "COMPLETED" ? Math.round(numericRefundAmount) : null;
    let tossCancelResponse = null;

    if (status === "COMPLETED") {
      if (!refund.order?.id) throw new Error("환불할 주문을 찾을 수 없습니다.");
      if (roundedRefundAmount !== refund.order.total) {
        throw new Error("현재 관리자 환불 완료 처리는 주문 전체 환불만 지원합니다.");
      }

      const payment = refund.order.payment;
      if (!payment) throw new Error("환불할 결제 정보를 찾을 수 없습니다.");
      if (payment.amount !== refund.order.total) {
        throw new Error("결제 금액과 주문 금액이 일치하지 않아 환불을 진행할 수 없습니다.");
      }

      if (payment.status !== "CANCELED") {
        if (payment.status !== "PAID") {
          throw new Error("결제 완료 상태의 주문만 환불 완료 처리할 수 있습니다.");
        }
        tossCancelResponse = await cancelTossPayment({
          paymentKey: payment.paymentKey,
          cancelReason: `관리자 환불 처리 (${refund.id})`,
          cancelAmount: roundedRefundAmount,
          idempotencyKey: `refund-${refund.id}-${roundedRefundAmount}`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.refundRequest.update({
        where: { id: refundId },
        data: {
          status,
          refundAmount: status === "COMPLETED" ? roundedRefundAmount : refund.refundAmount,
          resolvedAt: isFinalStatus ? new Date() : null,
          resolvedBy: status === "REQUESTED" ? null : admin.id,
        },
      });

      if (status === "APPROVED" && refund.order?.id && refund.order.status !== "환불완료") {
        await tx.order.update({ where: { id: refund.order.id }, data: { status: "반품" } });
      }

      if (status === "COMPLETED" && refund.order?.id) {
        await tx.order.update({ where: { id: refund.order.id }, data: { status: "환불완료" } });
        if (refund.order.payment?.id) {
          await tx.payment.update({
            where: { id: refund.order.payment.id },
            data: {
              status: "CANCELED",
              failedAt: new Date(),
              failureCode: "ADMIN_REFUND",
              failureMessage: "관리자 환불 완료",
              ...(tossCancelResponse
                ? { rawResponse: mergePaymentRefundResponse(refund.order.payment.rawResponse, tossCancelResponse) }
                : {}),
            },
          });
        }
        const orderItemIds = refund.order.items.map((item) => item.id);
        if (orderItemIds.length > 0) {
          await tx.settlement.updateMany({
            where: { orderItemId: { in: orderItemIds }, status: { in: SETTLEMENT_PAYABLE_STATUSES } },
            data: { status: "CANCELED", settledAt: null },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_REFUND_STATUS",
          targetTable: "RefundRequest",
          targetId: refundId,
        },
      });
      return updated;
    });

    if (refund.order?.id) revalidateTag(`order-${refund.order.id}`, "max");
    revalidateTag("orders", "max");

    return {
      success: true,
      refund: {
        id: result.id,
        status: result.status,
        refundAmount: result.refundAmount,
        resolvedAt: formatDate(result.resolvedAt),
      },
    };
  } catch (error) {
    console.error("Failed to update refund status:", error);
    throw new Error(error.message || "환불 요청 처리에 실패했습니다.");
  }
}

export async function updateAdminInquiry({ inquiryId, status, reply }) {
  try {
    const admin = await requireAdminUser();
    if (!inquiryId || typeof inquiryId !== "string") throw new Error("올바르지 않은 문의 ID입니다.");
    const cleanReply = cleanText(reply);
    const nextStatus = status || (cleanReply ? "IN_PROGRESS" : null);
    if (nextStatus && !INQUIRY_STATUSES.includes(nextStatus)) throw new Error("올바르지 않은 문의 상태입니다.");
    if (!nextStatus && !cleanReply) throw new Error("변경할 문의 상태 또는 답변 내용을 입력해 주세요.");
    if (cleanReply && cleanReply.length < 5) throw new Error("답변은 5자 이상 입력해 주세요.");
    if (cleanReply.length > 2000) throw new Error("답변은 2000자 이하여야 합니다.");

    const inquiry = await prisma.csInquiry.findUnique({ where: { id: inquiryId }, select: { id: true, status: true } });
    if (!inquiry) throw new Error("문의를 찾을 수 없습니다.");

    const result = await prisma.$transaction(async (tx) => {
      if (cleanReply) {
        await tx.csReply.create({
          data: {
            inquiryId,
            responderId: admin.id,
            content: cleanReply,
          },
        });
      }

      const updated = await tx.csInquiry.update({
        where: { id: inquiryId },
        data: {
          status: nextStatus || inquiry.status,
          closedAt: nextStatus === "CLOSED" ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "ADMIN_UPDATE_INQUIRY",
          targetTable: "CsInquiry",
          targetId: inquiryId,
        },
      });
      return updated;
    });

    return {
      success: true,
      inquiry: {
        id: result.id,
        status: result.status,
        closedAt: formatDate(result.closedAt),
      },
    };
  } catch (error) {
    console.error("Failed to update inquiry:", error);
    throw new Error(error.message || "문의 처리에 실패했습니다.");
  }
}

/**
 * Let a seller compose the buyer-facing product detail page for their own item.
 */
export async function updateSellerProductDetail({ productId, name, price, desc, spec, imageUrl }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");

    const seller = await prisma.seller.findUnique({ where: { userId: authUser.id } });
    if (!seller) throw new Error("판매자 계정이 없습니다.");

    if (!productId || typeof productId !== "string") {
      throw new Error("올바르지 않은 상품 ID입니다.");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("상품명은 필수입니다.");
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      throw new Error("가격은 0보다 커야 합니다.");
    }
    if (!desc || typeof desc !== "string" || !desc.trim()) {
      throw new Error("상품 설명은 필수입니다.");
    }
    if (!Array.isArray(spec)) {
      throw new Error("상품 정보 형식이 올바르지 않습니다.");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id) {
      throw new Error("수정 권한이 없습니다.");
    }

    const cleanSpec = spec
      .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
      .filter(([key, value]) => key && value);
    const cleanImageUrl = normalizeProductImageUrl(imageUrl);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        price: Math.round(numericPrice),
        desc: desc.trim(),
        images: cleanImageUrl ? [cleanImageUrl] : [],
        spec: cleanSpec,
      },
    });

    revalidateTag("products", "max");
    revalidateTag(`product-${productId}`, "max");
    revalidateTag(`seller-${seller.id}`, "max");
    revalidateTag("home", "max");

    return { success: true, product: formatProduct(updated) };
  } catch (error) {
    console.error("Failed to update seller product detail:", error);
    throw new Error(error.message || "상품 상세 저장에 실패했습니다.");
  }
}

/**
 * Synchronize a Supabase Auth user record into the custom User table
 */
export async function syncUser({ name, phone } = {}) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("인증되지 않은 사용자입니다.");
    const id = authUser.id;
    const email = authUser.email;
    const cleanName = cleanText(name);
    const cleanPhone = cleanText(phone);

    const dataUpdate = {};
    if (cleanName) {
      dataUpdate.name = cleanName;
    }
    if (cleanPhone) {
      if (cleanPhone.length > 30) throw new Error("연락처는 30자 이하여야 합니다.");
      dataUpdate.phone = cleanPhone;
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: dataUpdate,
      create: {
        id,
        email,
        name: cleanName || email.split("@")[0],
        phone: cleanPhone || null,
        role: "BUYER",
      },
    });
    return { success: true, user };
  } catch (error) {
    console.error("Failed to sync auth user:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
//  약관 동의 이력 기록 (개인정보보호법 동의 증적 보존)
// ============================================================

/**
 * 회원가입 또는 약관 버전 업데이트 시 동의 이력을 DB에 저장.
 * consentedTypes: 동의한 약관 type 배열
 *   예) ["USER_TERMS", "PRIVACY_POLICY"]
 * ipAddress, userAgent: headers() 에서 추출하여 전달
 */
export async function recordConsents({ consentedTypes, ipAddress, userAgent }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");

    if (!Array.isArray(consentedTypes) || consentedTypes.length === 0) {
      throw new Error("동의 항목이 없습니다.");
    }

    // 동의한 각 약관의 최신 버전을 찾아 ConsentRecord 생성
    const results = await Promise.all(
      consentedTypes.map(async (type) => {
        const latestVersion = await prisma.termsVersion.findFirst({
          where: { type },
          orderBy: { effectiveAt: "desc" },
        });
        if (!latestVersion) {
          // 해당 약관 버전이 DB에 없으면 기록하지 않음 (seed 전 환경)
          return null;
        }
        return prisma.consentRecord.upsert({
          where: {
            // 동일 유저·버전 중복 방지 — unique constraint 없어서 직접 체크
            // (동일 버전에 재동의 시 업데이트 대신 skip)
            id: `${authUser.id}_${latestVersion.id}`,
          },
          update: { agreedAt: new Date() },
          create: {
            id: `${authUser.id}_${latestVersion.id}`,
            userId: authUser.id,
            termsVersionId: latestVersion.id,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      })
    );

    return { success: true, recorded: results.filter(Boolean).length };
  } catch (error) {
    console.error("Failed to record consents:", error);
    throw new Error(error.message || "동의 이력 저장에 실패했습니다.");
  }
}

// ============================================================
//  정산 (Settlement)
// ============================================================

/**
 * 주문항목에 대한 정산 레코드 생성.
 * 주문 생성 시 또는 구매확정 시 호출.
 * commissionRate는 site.config 기준 — 변경 시 site.config 수정.
 */
export async function createSettlementForOrder(orderId) {
  try {
    const commissionRate = siteConfig.commission.rate;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { include: { seller: true } } },
        },
      },
    });
    if (!order) throw new Error("주문을 찾을 수 없습니다.");

    const settlementStatus = order.status === "구매확정"
      ? "CONFIRMED"
      : SETTLEMENT_CANCEL_ORDER_STATUSES.includes(order.status)
        ? "CANCELED"
        : "PENDING";

    const settlements = await Promise.all(
      order.items.map((item) => {
        const saleAmount = item.price * item.quantity;
        const commissionAmount = Math.floor(saleAmount * commissionRate);
        const netAmount = saleAmount - commissionAmount;
        return prisma.settlement.upsert({
          where: { orderItemId: item.id },
          update: {},
          create: {
            sellerId: item.product.sellerId,
            orderItemId: item.id,
            saleAmount,
            commissionRate,
            commissionAmount,
            netAmount,
            status: settlementStatus,
          },
        });
      })
    );

    return { success: true, settlements };
  } catch (error) {
    console.error("Failed to create settlement:", error);
    throw new Error(error.message || "정산 레코드 생성에 실패했습니다.");
  }
}

/**
 * 판매자 자신의 정산 내역 조회
 */
export async function getMySettlements() {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("로그인이 필요합니다.");

    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new Error("판매자 계정이 없습니다.");

    const settlements = await prisma.settlement.findMany({
      where: { sellerId: seller.id },
      include: {
        orderItem: {
          include: { product: { select: { name: true } }, order: { select: { date: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return settlements;
  } catch (error) {
    console.error("Failed to get settlements:", error);
    throw new Error(error.message || "정산 내역 조회에 실패했습니다.");
  }
}

// ============================================================
//  주문 상태 관리 / 배송 추적
// ============================================================

/**
 * 판매자가 송장 등록 + 상태를 "배송중"으로 변경
 */
export async function updateShipment({ orderId, carrier, trackingNo }) {
  try {
    const access = await getAdminAccess();
    if (access.status === "guest") throw new Error("로그인이 필요합니다.");
    const userId = access.authUser.id;

    if (!orderId || typeof orderId !== "string") throw new Error("올바르지 않은 주문 ID입니다.");
    const cleanCarrier = cleanText(carrier);
    const cleanTrackingNo = cleanText(trackingNo);
    if (!cleanCarrier) throw new Error("택배사를 입력해 주세요.");
    if (!cleanTrackingNo) throw new Error("운송장 번호를 입력해 주세요.");

    // 해당 주문의 상품이 로그인 판매자 소유인지 검증
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { sellerId: true } } } } },
    });
    if (!order) throw new Error("주문을 찾을 수 없습니다.");

    const seller = await prisma.seller.findUnique({ where: { userId } });
    const isOwner = seller && order.items.some((i) => i.product.sellerId === seller.id);
    if (!isOwner && access.status !== "admin") throw new Error("권한이 없습니다.");
    if (["취소", "환불완료", "반품"].includes(order.status)) {
      throw new Error("배송 정보를 변경할 수 없는 주문 상태입니다.");
    }

    await prisma.$transaction([
      prisma.shipmentTracking.upsert({
        where: { orderId },
        update: { carrier: cleanCarrier, trackingNo: cleanTrackingNo, status: "SHIPPED", shippedAt: new Date() },
        create: { orderId, carrier: cleanCarrier, trackingNo: cleanTrackingNo, status: "SHIPPED", shippedAt: new Date() },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "배송중" },
      }),
    ]);

    revalidateTag(`order-${orderId}`, "max");
    revalidateTag("orders", "max");
    return { success: true };
  } catch (error) {
    console.error("Failed to update shipment:", error);
    throw new Error(error.message || "배송 정보 등록에 실패했습니다.");
  }
}

// ============================================================
//  청약철회·환불 요청
// ============================================================

export async function requestRefund({ orderId, reason, reasonDetail }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("로그인이 필요합니다.");

    if (!orderId || typeof orderId !== "string") throw new Error("올바르지 않은 주문 ID입니다.");

    const validReasons = ["CHANGE_OF_MIND", "DEFECTIVE", "WRONG_ITEM", "ETC"];
    if (!validReasons.includes(reason)) throw new Error("올바르지 않은 반품 사유입니다.");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) throw new Error("주문을 찾을 수 없습니다.");
    if (!REFUNDABLE_ORDER_STATUSES.has(order.status)) {
      throw new Error("현재 주문 상태에서는 반품·환불 신청이 어렵습니다.");
    }

    const existingRefund = await prisma.refundRequest.findUnique({ where: { orderId } });
    if (existingRefund) throw new Error("이미 반품·환불 신청이 접수되어 있습니다.");

    const refund = await prisma.$transaction([
      prisma.refundRequest.create({
        data: { orderId, userId, reason, reasonDetail: reasonDetail || null },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "반품 신청" },
      }),
    ]);

    revalidateTag(`order-${orderId}`, "max");
    revalidateTag("orders", "max");
    return { success: true };
  } catch (error) {
    console.error("Failed to request refund:", error);
    throw new Error(error.message || "반품·환불 신청에 실패했습니다.");
  }
}

// ============================================================
//  상품·브랜드 문의
// ============================================================

export async function createInquiry({ sellerId, productId, orderId, type = "INQUIRY", title, content }) {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("로그인이 필요합니다.");

    const cleanType = cleanText(type || "INQUIRY").toUpperCase();
    if (!INQUIRY_TYPES.includes(cleanType)) throw new Error("올바르지 않은 문의 유형입니다.");

    const cleanTitle = cleanText(title);
    const cleanContent = cleanText(content);
    if (!cleanTitle) throw new Error("문의 제목을 입력해 주세요.");
    if (cleanTitle.length > 100) throw new Error("문의 제목은 100자 이하여야 합니다.");
    if (cleanContent.length < 5) throw new Error("문의 내용은 5자 이상 입력해 주세요.");
    if (cleanContent.length > 2000) throw new Error("문의 내용은 2000자 이하여야 합니다.");

    let cleanSellerId = cleanText(sellerId) || null;
    const cleanProductId = cleanText(productId) || null;
    const cleanOrderId = cleanText(orderId) || null;

    if (cleanProductId) {
      const product = await prisma.product.findUnique({
        where: { id: cleanProductId },
        select: {
          id: true,
          sellerId: true,
          isActive: true,
          deletedAt: true,
          reviewStatus: true,
          seller: { select: { isActive: true, deletedAt: true } },
        },
      });
      if (!product || !product.isActive || product.deletedAt || product.reviewStatus !== "APPROVED" || !product.seller?.isActive || product.seller?.deletedAt) {
        throw new Error("문의할 수 없는 상품입니다.");
      }
      cleanSellerId = product.sellerId;
    }

    if (cleanSellerId) {
      const seller = await prisma.seller.findUnique({
        where: { id: cleanSellerId },
        select: { id: true, isActive: true, deletedAt: true },
      });
      if (!seller || !seller.isActive || seller.deletedAt) throw new Error("문의할 수 없는 판매자입니다.");
    }

    if (cleanOrderId) {
      const order = await prisma.order.findUnique({ where: { id: cleanOrderId }, select: { id: true, userId: true } });
      if (!order || order.userId !== userId) throw new Error("문의할 수 없는 주문입니다.");
    }

    const inquiry = await prisma.csInquiry.create({
      data: {
        userId,
        sellerId: cleanSellerId,
        productId: cleanProductId,
        orderId: cleanOrderId,
        type: cleanType,
        title: cleanTitle,
        content: cleanContent,
      },
    });

    return {
      success: true,
      inquiry: {
        id: inquiry.id,
        status: inquiry.status,
        createdAt: formatDate(inquiry.createdAt),
      },
    };
  } catch (error) {
    console.error("Failed to create inquiry:", error);
    throw new Error(error.message || "문의 접수에 실패했습니다.");
  }
}
