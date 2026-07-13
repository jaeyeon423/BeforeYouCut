import { prisma } from "@/utils/prisma";
import { badRequest, notFound } from "@/server/http/api-errors";
import { PUBLIC_PRODUCT_WHERE, PUBLIC_SELLER_WHERE } from "./catalog-service";
import { cleanBuyerText, requireBuyerId } from "./buyer-validation";

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function createBuyerInquiry({ userId, input = {} }) {
  const type = cleanBuyerText(input.type || "INQUIRY").toUpperCase();
  const title = cleanBuyerText(input.title);
  const content = cleanBuyerText(input.content);
  let sellerId = requireBuyerId(input.sellerId, "판매자 ID");
  const productId = input.productId ? requireBuyerId(input.productId, "상품 ID") : null;
  const orderId = input.orderId ? requireBuyerId(input.orderId, "주문 ID") : null;

  if (type !== "INQUIRY") throw badRequest("문의 유형은 INQUIRY만 사용할 수 있습니다.");
  if (!title) throw badRequest("문의 제목을 입력해 주세요.");
  if (title.length > 100) throw badRequest("문의 제목은 100자 이하여야 합니다.");
  if (content.length < 5) throw badRequest("문의 내용은 5자 이상 입력해 주세요.");
  if (content.length > 2000) throw badRequest("문의 내용은 2000자 이하여야 합니다.");

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, ...PUBLIC_PRODUCT_WHERE },
      select: { sellerId: true },
    });
    if (!product) throw notFound("문의할 수 있는 상품을 찾을 수 없습니다.", "PRODUCT_NOT_FOUND");
    sellerId = product.sellerId;
  }

  const seller = await prisma.seller.findFirst({
    where: { id: sellerId, ...PUBLIC_SELLER_WHERE },
    select: { id: true },
  });
  if (!seller) throw notFound("문의할 수 있는 판매자를 찾을 수 없습니다.", "SELLER_NOT_FOUND");

  if (orderId) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId }, select: { id: true } });
    if (!order) throw notFound("문의할 수 있는 주문을 찾을 수 없습니다.", "ORDER_NOT_FOUND");
  }

  const inquiry = await prisma.csInquiry.create({
    data: { userId, sellerId, productId, orderId, type, title, content },
  });

  return {
    inquiry: {
      id: inquiry.id,
      status: inquiry.status,
      createdAt: toIso(inquiry.createdAt),
    },
  };
}
