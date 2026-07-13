import crypto from "crypto";
import { prisma } from "@/utils/prisma";
import siteConfig from "@/site.config";
import { badRequest, conflict, notFound } from "@/server/http/api-errors";
import { PUBLIC_PRODUCT_WHERE, normalizeProductImages } from "./catalog-service";
import { cleanBuyerText, normalizeBuyerPhone } from "./buyer-validation";

const CHECKOUT_SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_CHECKOUT_ITEMS = 50;
const MAX_QUANTITY = 99;

function getCheckoutSessionSecret() {
  const secret = cleanBuyerText(process.env.CHECKOUT_SESSION_SECRET);
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CHECKOUT_SESSION_SECRET environment variable is not configured.");
    }
    return "dev-only-checkout-session-secret";
  }
  return secret;
}

function getTossClientKey() {
  const clientKey = cleanBuyerText(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
  if (!clientKey) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY environment variable is not configured.");
  return clientKey;
}

function createProviderOrderId() {
  return `ms-${crypto.randomUUID()}`;
}

function encodeCheckoutToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getCheckoutSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function decodeCheckoutToken(token) {
  const [encodedPayload, signature, extra] = cleanBuyerText(token).split(".");
  if (!encodedPayload || !signature || extra) throw notFound("결제 세션을 찾을 수 없습니다.", "CHECKOUT_NOT_FOUND");

  const expected = crypto
    .createHmac("sha256", getCheckoutSessionSecret())
    .update(encodedPayload)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    throw notFound("결제 세션을 찾을 수 없습니다.", "CHECKOUT_NOT_FOUND");
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw notFound("결제 세션을 찾을 수 없습니다.", "CHECKOUT_NOT_FOUND");
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload?.checkoutId || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
      throw new Error("expired");
    }
    return payload;
  } catch {
    throw conflict("결제 세션이 만료되었습니다. 주문을 다시 준비해 주세요.", "CHECKOUT_EXPIRED");
  }
}

export function resolveCheckoutOrigin(requestUrl) {
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    siteConfig.service.url,
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean);

  const requestOrigin = new URL(requestUrl).origin;
  const requestHost = new URL(requestOrigin).hostname;
  if (["localhost", "127.0.0.1"].includes(requestHost)) return requestOrigin;

  for (const value of configuredOrigins) {
    try {
      const origin = new URL(value).origin;
      if (origin.startsWith("https://")) return origin;
    } catch {
      // Ignore malformed optional deployment URLs and continue to the next one.
    }
  }
  if (requestOrigin.startsWith("https://")) return requestOrigin;
  throw new Error("HTTPS checkout origin is not configured.");
}

function validateCheckoutInput(input = {}) {
  const name = cleanBuyerText(input.name);
  const phone = normalizeBuyerPhone(input.phone);
  const address = cleanBuyerText(input.address);
  if (!name) throw badRequest("수령인 이름을 입력해 주세요.");
  if (name.length > 50) throw badRequest("수령인 이름은 50자 이하여야 합니다.");
  if (!address) throw badRequest("배송지 주소를 입력해 주세요.");
  if (address.length > 400) throw badRequest("배송지 주소는 400자 이하여야 합니다.");
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw badRequest("주문할 상품을 한 개 이상 선택해 주세요.");
  }
  if (input.items.length > MAX_CHECKOUT_ITEMS) {
    throw badRequest(`한 번에 주문할 수 있는 상품은 ${MAX_CHECKOUT_ITEMS}개까지입니다.`);
  }

  const quantityByProductId = new Map();
  for (const item of input.items) {
    const productId = cleanBuyerText(item?.productId);
    const quantity = Number(item?.quantity);
    if (!productId || productId.length > 100) throw badRequest("올바르지 않은 상품 정보가 포함되어 있습니다.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw badRequest(`상품 수량은 1부터 ${MAX_QUANTITY} 사이의 정수여야 합니다.`);
    }
    const combined = (quantityByProductId.get(productId) || 0) + quantity;
    if (combined > MAX_QUANTITY) throw badRequest(`상품별 수량은 ${MAX_QUANTITY}개를 초과할 수 없습니다.`);
    quantityByProductId.set(productId, combined);
  }

  return { name, phone, address, quantityByProductId };
}

async function buildServerPricedLines(quantityByProductId) {
  const productIds = [...quantityByProductId.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, ...PUBLIC_PRODUCT_WHERE },
    include: { seller: { select: { id: true, name: true } } },
  });
  if (products.length !== productIds.length) {
    throw notFound("현재 주문할 수 없는 상품이 포함되어 있습니다.", "PRODUCT_NOT_AVAILABLE");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = productIds.map((productId) => {
    const product = productById.get(productId);
    return {
      productId,
      productName: product.name,
      sellerId: product.sellerId,
      sellerName: product.seller?.name || product.sellerId,
      price: product.price,
      quantity: quantityByProductId.get(productId),
      icon: product.icon,
      tone: product.tone,
      images: normalizeProductImages(product.images),
    };
  });
  const amount = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw badRequest("결제 금액을 계산할 수 없습니다.");
  return { lines, amount };
}

function buildOrderName(lines) {
  const firstName = lines[0]?.productName || "미용사 상품";
  return (lines.length > 1 ? `${firstName} 외 ${lines.length - 1}건` : firstName).slice(0, 100);
}

export async function prepareBuyerCheckout({ userId, input, origin }) {
  getTossClientKey();
  const clean = validateCheckoutInput(input);
  const { lines, amount } = await buildServerPricedLines(clean.quantityByProductId);
  const orderName = buildOrderName(lines);
  const checkoutId = createProviderOrderId();
  const payment = await prisma.payment.create({
    data: {
      provider: "TOSS",
      providerOrderId: checkoutId,
      status: "READY",
      amount,
      orderName,
      buyerName: clean.name,
      buyerPhone: clean.phone,
      shippingAddress: clean.address,
      itemsSnapshot: lines,
      userId,
    },
  });
  const token = encodeCheckoutToken({
    checkoutId: payment.providerOrderId,
    exp: Date.now() + CHECKOUT_SESSION_TTL_MS,
  });

  return {
    checkoutId: payment.providerOrderId,
    amount,
    orderName,
    checkoutUrl: `${origin}/checkout/app/${encodeURIComponent(token)}`,
  };
}

export async function fetchAppCheckoutSession({ token, origin }) {
  const { checkoutId } = decodeCheckoutToken(token);
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: checkoutId },
    include: { user: { select: { email: true } } },
  });
  if (!payment) throw notFound("결제 세션을 찾을 수 없습니다.", "CHECKOUT_NOT_FOUND");
  if (payment.status !== "READY") {
    throw conflict("이미 처리되었거나 사용할 수 없는 결제 세션입니다.", "CHECKOUT_ALREADY_PROCESSED");
  }

  const items = Array.isArray(payment.itemsSnapshot) ? payment.itemsSnapshot : [];
  if (items.length === 0) throw notFound("결제 상품 정보를 찾을 수 없습니다.", "CHECKOUT_ITEMS_NOT_FOUND");

  return {
    clientKey: getTossClientKey(),
    providerOrderId: payment.providerOrderId,
    amount: payment.amount,
    orderName: payment.orderName,
    customerName: payment.buyerName,
    customerEmail: payment.user?.email || "",
    customerMobilePhone: cleanBuyerText(payment.buyerPhone).replace(/\D/g, ""),
    successUrl: `${origin}/checkout/confirm`,
    failUrl: `${origin}/checkout/fail`,
    items: items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      price: item.price,
      quantity: item.quantity,
      image: normalizeProductImages(item.images)[0] || "",
    })),
  };
}
