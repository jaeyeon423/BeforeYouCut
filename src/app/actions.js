"use server";

import { prisma } from "../utils/prisma";

// Helper to ensure guest user exists in the database
async function ensureGuestUser() {
  return await prisma.user.upsert({
    where: { id: "user_default" },
    update: {},
    create: {
      id: "user_default",
      email: "guest@beforeyoucut.com",
      name: "게스트 사용자",
      role: "BUYER",
    },
  });
}

/**
 * Fetch all sellers, products, and user-specific details (likes, follows, orders)
 * in a single roundtrip to hydrate the client.
 */
export async function getInitialData(userId) {
  try {
    const activeUserId = userId || "user_default";
    
    // Ensure the default guest exists if that's what we are using
    if (activeUserId === "user_default") {
      await ensureGuestUser();
    }

    // Parallel fetch for optimal performance
    const [dbSellers, dbProducts, userLikes, userFollows, userOrders] = await Promise.all([
      prisma.seller.findMany(),
      prisma.product.findMany(),
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
      }),
    ]);

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
export async function toggleLike(userId, productId) {
  try {
    const activeUserId = userId || "user_default";
    if (activeUserId === "user_default") {
      await ensureGuestUser();
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
    throw new Error("상품 찜 처리에 실패했습니다.");
  }
}

/**
 * Toggle follow for a brand
 */
export async function toggleFollow(userId, sellerId) {
  try {
    const activeUserId = userId || "user_default";
    if (activeUserId === "user_default") {
      await ensureGuestUser();
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
    throw new Error("브랜드 팔로우 처리에 실패했습니다.");
  }
}

/**
 * Create a new checkout order
 */
export async function createOrder(userId, { name, address, total, items }) {
  try {
    const activeUserId = userId || "user_default";
    if (activeUserId === "user_default") {
      await ensureGuestUser();
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
    throw new Error("주문 및 결제 처리에 실패했습니다.");
  }
}

/**
 * Create a new Seller profile (onboarding)
 */
export async function createSeller(userId, { sellerId, name, desc, category, story, notice, firstProduct }) {
  try {
    const activeUserId = userId || "user_default";
    
    // Ensure the specific User exists in the database
    // If it's a guest or if we don't have this user, ensure it
    let user = await prisma.user.findUnique({ where: { id: activeUserId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: activeUserId,
          email: `${sellerId}@beforeyoucut.com`,
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
    throw new Error("브랜드 입점 신청에 실패했습니다.");
  }
}

/**
 * Synchronize a Supabase Auth user record into the custom User table
 */
export async function syncUser({ id, email, name }) {
  try {
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        name: name || user?.name,
      },
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
