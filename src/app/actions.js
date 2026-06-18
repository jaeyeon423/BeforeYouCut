"use server";

import { prisma } from "../utils/prisma";
import { createClient } from "../utils/supabase/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import { buildProductSpec } from "@/utils/product-detail";

// ============================================================
//  Internal formatters & helpers (not exported → not server actions)
// ============================================================

// Map a Prisma Seller row to the front-end shape (id-keyed friendly).
function formatSeller(s) {
  return {
    id: s.id,
    name: s.name,
    verified: s.verified,
    desc: s.desc,
    category: s.category,
    followers: s.followers,
    products: s.productsCount,
    since: s.since,
    tone: s.tone,
    story: s.story,
    notice: s.notice,
    userId: s.userId,
    sellerType: s.sellerType,
    businessName: s.businessName,
    businessRegNo: s.businessRegNo,
    representative: s.representative,
    isActive: s.isActive,
  };
}

// Map a Prisma Product row to the front-end shape (sellerId → seller, likesCount → likes).
function formatProduct(p) {
  return {
    id: p.id,
    seller: p.sellerId,
    name: p.name,
    price: p.price,
    cat: p.cat,
    icon: p.icon,
    tone: p.tone,
    badge: p.badge,
    disc: p.disc,
    orig: p.orig,
    rating: p.rating,
    reviews: p.reviews,
    likes: p.likesCount,
    spec: p.spec,
    desc: p.desc,
  };
}

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

const RANKING_IDS = ["p6", "p1", "p9", "p4", "p13"];
const HANDMADE_CATS = ["핸드메이드", "앞치마·유니폼"];

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
        const dbSellers = await prisma.seller.findMany();
        const map = {};
        dbSellers.forEach((s) => { map[s.id] = formatSeller(s); });
        return map;
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
        const [rankingRows, newRows, spotlightSellers, mainBanner] = await Promise.all([
          prisma.product.findMany({ orderBy: { likesCount: "desc" }, take: 5 }),
          prisma.product.findMany({ where: { badge: { in: ["new", "best"] } }, take: 6 }),
          prisma.seller.findMany({ take: 2, orderBy: { since: "desc" } }),
          prisma.mainBanner.findUnique({ where: { id: "hero" } }),
        ]);

        const ranking = rankingRows.map(formatProduct);

        return {
          ranking,
          newItems: newRows.map(formatProduct),
          spotlightSellers: spotlightSellers.map(formatSeller),
          mainBanner: mainBanner ? {
            kicker: mainBanner.kicker,
            title: mainBanner.title,
            desc: mainBanner.desc,
            ctaText: mainBanner.ctaText,
            ctaLink: mainBanner.ctaLink,
            icon: mainBanner.icon,
            tone: mainBanner.tone,
          } : null,
        };
      } catch (error) {
        console.error("Failed to load home data:", error);
        return { ranking: [], newItems: [], spotlightSellers: [], mainBanner: null };
      }
    },
    ["home-data"],
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
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return null;

        const [seller, relatedRows] = await Promise.all([
          prisma.seller.findUnique({ where: { id: product.sellerId } }),
          prisma.product.findMany({
            where: { sellerId: product.sellerId, id: { not: productId } },
            take: 4,
          }),
        ]);

        return {
          product: formatProduct(product),
          seller: seller ? formatSeller(seller) : null,
          related: relatedRows.map(formatProduct),
        };
      } catch (error) {
        console.error("Failed to load product detail:", error);
        return null;
      }
    },
    ["product-detail", productId],
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
        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return null;

        const products = await prisma.product.findMany({ where: { sellerId } });
        return {
          seller: formatSeller(seller),
          products: products.map(formatProduct),
        };
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
        const where = cat && cat !== "전체" ? { cat } : {};
        const orderBy = {};

        if (filter === "new") {
          where.badge = "new";
        } else if (filter === "best") {
          orderBy.likesCount = "desc";
        }

        const skip = page * limit;
        const [rows, count] = await Promise.all([
          prisma.product.findMany({
            where,
            skip,
            take: limit,
            ...(Object.keys(orderBy).length > 0 ? { orderBy } : {})
          }),
          prisma.product.count({ where }),
        ]);
        return {
          items: rows.map(formatProduct),
          hasMore: skip + rows.length < count,
          total: count,
        };
      } catch (error) {
        console.error("Failed to load category products:", error);
        return { items: [], hasMore: false, total: 0 };
      }
    },
    ["category-products", cat, String(page), String(limit), filter || "all"],
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
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, sellerId: true, icon: true, tone: true },
            },
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
      buyer: o.name,
      items: o.items.map((i) => ({
        id: i.productId,
        name: i.product.name,
        price: i.price,
        seller: i.product.sellerId,
        icon: i.product.icon,
        tone: i.product.tone,
        quantity: i.quantity,
      })),
    }));
  } catch (error) {
    console.error("Failed to load user orders:", error);
    return [];
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

/**
 * Create a new checkout order
 */
export async function createOrder({ name, address, total, items }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("로그인이 필요합니다.");
    const activeUserId = authUser.id;

    // Input validations
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error("수령인 이름은 필수 입력 항목입니다.");
    }
    if (!address || typeof address !== 'string' || address.trim() === '') {
      throw new Error("배송지 주소는 필수 입력 항목입니다.");
    }
    if (total === undefined || typeof total !== 'number' || total <= 0) {
      throw new Error("결제 금액은 0보다 커야 합니다.");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("주문할 상품 목록이 비어 있습니다.");
    }
    for (const item of items) {
      if (!item.id || typeof item.id !== 'string') {
        throw new Error("올바르지 않은 상품 정보가 포함되어 있습니다.");
      }
      if (item.price === undefined || typeof item.price !== 'number' || item.price <= 0) {
        throw new Error("올바르지 않은 상품 가격이 포함되어 있습니다.");
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: activeUserId,
        name,
        address,
        total,
        items: {
          create: items.map((p) => ({
            productId: p.id,
            price: p.price,
            quantity: 1, // checkout logic assumes quantity=1 for simple prototype
          })),
        },
      },
    });

    return {
      success: true,
      order: {
        id: order.id,
        total: order.total,
        status: order.status,
        date: order.date.toLocaleDateString("ko-KR"),
        address: order.address,
        buyer: order.name,
        items: items,
      },
    };
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error(error.message || "주문 및 결제 처리에 실패했습니다.");
  }
}

/**
 * Create a new Seller profile (onboarding)
 */
export async function createSeller({ sellerId, name, desc, category, story, notice, firstProduct }) {
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
    
    if (firstProduct) {
      if (!firstProduct.name || typeof firstProduct.name !== 'string' || firstProduct.name.trim() === '') {
        throw new Error("첫 상품명은 필수 입력 항목입니다.");
      }
      if (firstProduct.price === undefined || typeof firstProduct.price !== 'number' || firstProduct.price <= 0) {
        throw new Error("올바르지 않은 상품 가격이 포함되어 있습니다.");
      }
    }

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
          since: new Date().getFullYear().toString(),
          tone: "tone-a",
          story: story ? [story] : ["신규 입점 브랜드 스토리입니다."],
          notice: notice || null,
          userId: activeUserId,
        },
      });

      let product = null;
      if (firstProduct && firstProduct.name && firstProduct.price) {
        product = await tx.product.create({
          data: {
            name: firstProduct.name,
            price: Number(firstProduct.price) || 10000,
            cat: category,
            icon: "scissors",
            tone: "tone-a",
            badge: "new",
            desc: `${firstProduct.name} 설명입니다.`,
            sellerId: sellerId,
            spec: buildProductSpec(
              [
                ["입점일", new Date().toLocaleDateString("ko-KR")],
                ["소재", "판매자 입력 예정"],
                ["제조국", "판매자 입력 예정"],
                ["치수", "판매자 입력 예정"],
                ["취급 주의", "판매자 입력 예정"],
                ["A/S 책임자", `${name} 고객센터`],
                ["KC 인증 여부", "판매자 확인 예정"],
              ],
              {
                intro: `${firstProduct.name}의 상세 소개를 작성해 주세요.`,
                highlights: "상품의 핵심 장점을 한 줄씩 입력해 주세요.",
                usage: "사용 후 관리 방법과 보관법을 작성해 주세요.",
                shipping: "출고일과 배송 정책을 작성해 주세요.",
                returns: "교환/반품 가능 조건을 작성해 주세요.",
                notice: "구매 전 확인해야 할 내용을 작성해 주세요.",
              }
            ),
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
        spec: result.product.spec,
        desc: result.product.desc,
      } : null,
    };
  } catch (error) {
    console.error("Failed to onboard seller brand:", error);
    throw new Error(error.message || "브랜드 입점 신청에 실패했습니다.");
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
          product: { select: { id: true, name: true, icon: true, tone: true } },
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
      .filter((s) => s.status !== "PAID")
      .reduce((sum, s) => sum + s.netAmount, 0);

    return {
      status: "seller",
      seller: formatSeller(seller),
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

/**
 * Let a seller compose the buyer-facing product detail page for their own item.
 */
export async function updateSellerProductDetail({ productId, name, price, desc, spec }) {
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

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        price: Math.round(numericPrice),
        desc: desc.trim(),
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
export async function syncUser({ name } = {}) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error("인증되지 않은 사용자입니다.");
    const id = authUser.id;
    const email = authUser.email;

    const dataUpdate = {};
    if (name) {
      dataUpdate.name = name;
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: dataUpdate,
      create: {
        id,
        email,
        name: name || email.split("@")[0],
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
    const siteConfig = (await import("../site.config")).default;
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
            status: "PENDING",
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
    const userId = await getAuthUserId();
    if (!userId) throw new Error("로그인이 필요합니다.");

    // 해당 주문의 상품이 로그인 판매자 소유인지 검증
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { sellerId: true } } } } },
    });
    if (!order) throw new Error("주문을 찾을 수 없습니다.");

    const seller = await prisma.seller.findUnique({ where: { userId } });
    const isOwner = seller && order.items.some((i) => i.product.sellerId === seller.id);
    if (!isOwner) throw new Error("권한이 없습니다.");

    await prisma.$transaction([
      prisma.shipmentTracking.upsert({
        where: { orderId },
        update: { carrier, trackingNo, status: "SHIPPED", shippedAt: new Date() },
        create: { orderId, carrier, trackingNo, status: "SHIPPED", shippedAt: new Date() },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "배송중" },
      }),
    ]);

    revalidateTag(`order-${orderId}`, "max");
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
    return { success: true };
  } catch (error) {
    console.error("Failed to request refund:", error);
    throw new Error(error.message || "반품·환불 신청에 실패했습니다.");
  }
}
