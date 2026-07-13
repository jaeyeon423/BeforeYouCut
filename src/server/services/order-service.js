import { revalidateTag } from "next/cache";
import { prisma } from "@/utils/prisma";
import { badRequest, conflict, notFound } from "@/server/http/api-errors";
import { formatApiProduct } from "./catalog-service";
import { cleanBuyerText, requireBuyerId } from "./buyer-validation";

export const REFUNDABLE_ORDER_STATUSES = new Set(["결제완료", "배송 준비중", "배송중", "배송완료"]);
const REFUND_REASONS = new Set(["CHANGE_OF_MIND", "DEFECTIVE", "WRONG_ITEM", "ETC"]);

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;
}

export function formatApiShipment(shipment) {
  if (!shipment) return null;
  return {
    carrier: shipment.carrier || "",
    trackingNo: shipment.trackingNo || "",
    status: shipment.status,
    shippedAt: toIso(shipment.shippedAt),
    deliveredAt: toIso(shipment.deliveredAt),
    updatedAt: toIso(shipment.updatedAt),
  };
}

export function formatApiRefundRequest(refundRequest) {
  if (!refundRequest) return null;
  return {
    id: refundRequest.id,
    reason: refundRequest.reason,
    reasonDetail: refundRequest.reasonDetail || "",
    status: refundRequest.status,
    requestedAt: toIso(refundRequest.requestedAt),
  };
}

export function formatApiOrder(order, { detail = false } = {}) {
  const formatted = {
    id: order.id,
    total: order.total,
    status: order.status,
    date: toIso(order.date),
    address: order.address,
    name: order.name,
    phone: order.phone || "",
    shipment: formatApiShipment(order.shipment),
    refundRequest: formatApiRefundRequest(order.refundRequest),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
      product: formatApiProduct(item.product),
    })),
  };

  if (detail) {
    formatted.canRequestRefund = !order.refundRequest && REFUNDABLE_ORDER_STATUSES.has(order.status);
  }
  return formatted;
}

const ORDER_INCLUDE = {
  shipment: true,
  refundRequest: true,
  items: { include: { product: { include: { seller: true } } } },
};

export async function fetchBuyerOrders({ userId }) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: ORDER_INCLUDE,
    orderBy: { date: "desc" },
  });
  return { items: orders.map((order) => formatApiOrder(order)) };
}

export async function fetchBuyerOrderDetail({ userId, orderId }) {
  const cleanOrderId = requireBuyerId(orderId, "주문 ID");
  const order = await prisma.order.findFirst({
    where: { id: cleanOrderId, userId },
    include: ORDER_INCLUDE,
  });
  return order ? { order: formatApiOrder(order, { detail: true }) } : null;
}

export async function createBuyerRefundRequest({ userId, orderId, input = {} }) {
  const cleanOrderId = requireBuyerId(orderId, "주문 ID");
  const reason = cleanBuyerText(input.reason).toUpperCase();
  const reasonDetail = cleanBuyerText(input.reasonDetail);
  if (!REFUND_REASONS.has(reason)) throw badRequest("올바르지 않은 반품 사유입니다.");
  if (reasonDetail.length > 2000) throw badRequest("상세 사유는 2000자 이하여야 합니다.");

  const order = await prisma.order.findFirst({
    where: { id: cleanOrderId, userId },
    select: { id: true, status: true, refundRequest: { select: { id: true } } },
  });
  if (!order) throw notFound("주문을 찾을 수 없습니다.", "ORDER_NOT_FOUND");
  if (order.refundRequest) throw conflict("이미 반품·환불 신청이 접수되어 있습니다.", "REFUND_ALREADY_REQUESTED");
  if (!REFUNDABLE_ORDER_STATUSES.has(order.status)) {
    throw conflict("현재 주문 상태에서는 반품·환불 신청이 어렵습니다.", "ORDER_NOT_REFUNDABLE");
  }

  try {
    const [refundRequest] = await prisma.$transaction([
      prisma.refundRequest.create({
        data: {
          orderId: cleanOrderId,
          userId,
          reason,
          reasonDetail: reasonDetail || null,
        },
      }),
      prisma.order.update({ where: { id: cleanOrderId }, data: { status: "반품 신청" } }),
    ]);

    revalidateTag(`order-${cleanOrderId}`, "max");
    revalidateTag("orders", "max");
    return { refundRequest: formatApiRefundRequest(refundRequest) };
  } catch (error) {
    if (error?.code === "P2002") {
      throw conflict("이미 반품·환불 신청이 접수되어 있습니다.", "REFUND_ALREADY_REQUESTED");
    }
    throw error;
  }
}
