"use server";

import { prisma } from "../utils/prisma";
import { createClient } from "../utils/supabase/server";

/**
 * Fetch all sellers, products, and user-specific details (likes, follows, orders)
 * in a single roundtrip to hydrate the client.
 */
export async function getInitialData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const activeUserId = user?.id || null;

    // Parallel fetch for optimal performance
    const promises = [
      prisma.seller.findMany(),
      prisma.product.findMany(),
    ];

    if (activeUserId) {
      promises.push(
        prisma.like.findMany({
          where: { userId: activeUserId },
          select: { productId: true },
        }),
        prisma.follow.findMany({
          where: { userId: activeUserId },
          select: { sellerId: true },
        }),
        prisma.order.findMany({
          where: { userId: activeUserId },
          orderBy: { date: "desc" },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    sellerId: true,
                    icon: true,
                    tone: true
                  }
                }
              }
            }
          }
        })
      );
    }

    const [dbSellers, dbProducts, userLikes = [], userFollows = [], userOrders = []] = await Promise.all(promises);

    // Format sellers object to match the static data structure (id-keyed dictionary)
    const sellersMap = {};
    dbSellers.forEach((s) => {
      sellersMap[s.id] = {
        id: s.id,
        name: s.name,
        verified: s.verified,
        desc: s.desc,
        category: s.category,
        followers: s.followers,
        since: s.since,
        tone: s.tone,
        story: s.story,
        notice: s.notice,
        userId: s.userId,
      };
    });

    // Format products list to match front-end structure (remap sellerId -> seller)
    const formattedProducts = dbProducts.map((p) => ({
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
    }));

    // Format user-specific likes/follows as arrays of keys
    const likesArray = userLikes.map((l) => l.productId);
    const followsArray = userFollows.map((f) => f.sellerId);

    // Format orders array
    const formattedOrders = userOrders.map(o => ({
      id: o.id,
      total: o.total,
      status: o.status,
      date: o.date.toLocaleDateString("ko-KR"),
      address: o.address,
      buyer: o.name,
      items: o.items.map(i => ({
        id: i.productId,
        name: i.product.name,
        price: i.price,
        seller: i.product.sellerId,
        icon: i.product.icon,
        tone: i.product.tone,
        quantity: i.quantity
      }))
    }));

    return {
      sellers: sellersMap,
      products: formattedProducts,
      likes: likesArray,
      following: followsArray,
      orders: formattedOrders,
    };
  } catch (error) {
    console.error("Failed to load initial database data:", error);
    throw new Error("데이터베이스 초기 적재에 실패했습니다.");
  }
}

/**
 * Toggle like for a product
 */
export async function toggleLike(productId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }
    const activeUserId = user.id;

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }
    const activeUserId = user.id;

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }
    const activeUserId = user.id;

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
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error("로그인이 필요합니다.");
    }
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
            spec: [["입점일", new Date().toLocaleDateString("ko-KR")]],
          },
        });
      }

      return { seller, product };
    });

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
 * Synchronize a Supabase Auth user record into the custom User table
 */
export async function syncUser({ name } = {}) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error("인증되지 않은 사용자입니다.");
    }
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
