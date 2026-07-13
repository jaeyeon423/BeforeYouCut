import { revalidateTag } from "next/cache";
import { prisma } from "@/utils/prisma";
import { notFound } from "@/server/http/api-errors";
import { PUBLIC_PRODUCT_WHERE, PUBLIC_SELLER_WHERE } from "./catalog-service";
import { requireBuyerId } from "./buyer-validation";

export async function fetchBuyerInteractions({ userId }) {
  const [likes, follows] = await Promise.all([
    prisma.like.findMany({ where: { userId }, select: { productId: true } }),
    prisma.follow.findMany({ where: { userId }, select: { sellerId: true } }),
  ]);

  return {
    likedProductIds: likes.map((item) => item.productId),
    followedSellerIds: follows.map((item) => item.sellerId),
  };
}

export async function addBuyerLike({ userId, productId }) {
  const cleanProductId = requireBuyerId(productId, "상품 ID");
  const product = await prisma.product.findFirst({
    where: { id: cleanProductId, ...PUBLIC_PRODUCT_WHERE },
    select: { id: true },
  });
  if (!product) throw notFound("저장할 수 있는 상품을 찾을 수 없습니다.", "PRODUCT_NOT_FOUND");

  const created = await prisma.$transaction(async (tx) => {
    const result = await tx.like.createMany({
      data: [{ userId, productId: cleanProductId }],
      skipDuplicates: true,
    });
    if (result.count === 1) {
      await tx.product.update({
        where: { id: cleanProductId },
        data: { likesCount: { increment: 1 } },
      });
    }
    return result.count === 1;
  });

  if (created) {
    revalidateTag(`product-${cleanProductId}`, "max");
    revalidateTag("home", "max");
  }
  return { liked: true };
}

export async function removeBuyerLike({ userId, productId }) {
  const cleanProductId = requireBuyerId(productId, "상품 ID");
  const removed = await prisma.$transaction(async (tx) => {
    const result = await tx.like.deleteMany({ where: { userId, productId: cleanProductId } });
    if (result.count === 1) {
      await tx.product.updateMany({
        where: { id: cleanProductId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
    }
    return result.count === 1;
  });

  if (removed) {
    revalidateTag(`product-${cleanProductId}`, "max");
    revalidateTag("home", "max");
  }
  return { liked: false };
}

export async function addBuyerFollow({ userId, sellerId }) {
  const cleanSellerId = requireBuyerId(sellerId, "판매자 ID");
  const seller = await prisma.seller.findFirst({
    where: { id: cleanSellerId, ...PUBLIC_SELLER_WHERE },
    select: { id: true },
  });
  if (!seller) throw notFound("팔로우할 수 있는 판매자를 찾을 수 없습니다.", "SELLER_NOT_FOUND");

  await prisma.follow.createMany({
    data: [{ userId, sellerId: cleanSellerId }],
    skipDuplicates: true,
  });
  return { followed: true };
}

export async function removeBuyerFollow({ userId, sellerId }) {
  const cleanSellerId = requireBuyerId(sellerId, "판매자 ID");
  await prisma.follow.deleteMany({ where: { userId, sellerId: cleanSellerId } });
  return { followed: false };
}
