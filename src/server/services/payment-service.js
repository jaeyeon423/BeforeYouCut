import { prisma } from "@/utils/prisma";
import siteConfig from "@/site.config";

const PAID_PROVIDER_STATUS = "DONE";
const FAILED_PROVIDER_STATUSES = new Set(["ABORTED", "EXPIRED"]);
const CANCELED_PROVIDER_STATUSES = new Set(["CANCELED", "PARTIAL_CANCELED"]);

function cleanText(value) {
  return String(value || "").trim();
}

function getTossAmount(data = {}) {
  const rawAmount = data.totalAmount ?? data.amount ?? data.balanceAmount;
  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function parseTossDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFailureMessage(data = {}) {
  if (typeof data.failure === "string") return data.failure;
  return cleanText(data.failure?.message) || cleanText(data.message) || null;
}

export async function createOrderFromPaidPayment(tx, payment, activeUserId) {
  const lines = Array.isArray(payment.itemsSnapshot) ? payment.itemsSnapshot : [];
  if (lines.length === 0) throw new Error("결제 상품 정보가 비어 있습니다.");
  const commissionRate = siteConfig.commission.rate;

  const created = await tx.order.create({
    data: {
      userId: activeUserId,
      name: payment.buyerName,
      phone: payment.buyerPhone,
      address: payment.shippingAddress,
      total: payment.amount,
      status: "결제완료",
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          price: line.price,
          quantity: line.quantity,
        })),
      },
    },
    include: { items: true },
  });

  await Promise.all(
    created.items.map((item) => {
      const line = lines.find((candidate) => candidate.productId === item.productId);
      if (!line) throw new Error("결제 상품 정보가 주문 항목과 일치하지 않습니다.");
      const saleAmount = item.price * item.quantity;
      const commissionAmount = Math.floor(saleAmount * commissionRate);
      return tx.settlement.upsert({
        where: { orderItemId: item.id },
        update: {},
        create: {
          sellerId: line.sellerId,
          orderItemId: item.id,
          saleAmount,
          commissionRate,
          commissionAmount,
          netAmount: saleAmount - commissionAmount,
          status: "PENDING",
        },
      });
    })
  );

  return created;
}

export async function settlePaidPaymentWithOrder({ paymentId, activeUserId, paymentKey, rawResponse, approvedAt }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment || payment.userId !== activeUserId) {
      throw new Error("결제 요청을 찾을 수 없습니다.");
    }
    if (payment.status === "PAID" && payment.order) {
      return payment.order;
    }

    const cleanPaymentKey = cleanText(paymentKey);
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "READY" },
      data: {
        status: "PAID",
        ...(cleanPaymentKey ? { paymentKey: cleanPaymentKey } : {}),
        approvedAt: approvedAt || new Date(),
        ...(rawResponse ? { rawResponse } : {}),
      },
    });

    if (claimed.count !== 1) {
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
        include: { order: true },
      });
      if (current?.status === "PAID" && current.order) {
        return current.order;
      }
      throw new Error("이미 처리 중이거나 처리된 결제 요청입니다.");
    }

    const createdOrder = await createOrderFromPaidPayment(tx, payment, activeUserId);
    await tx.payment.update({
      where: { id: payment.id },
      data: { orderId: createdOrder.id },
    });

    return createdOrder;
  });
}

export async function handleTossPaymentWebhook(event = {}) {
  const eventType = cleanText(event.eventType);
  if (eventType && eventType !== "PAYMENT_STATUS_CHANGED") {
    return { success: true, ignored: true, reason: "unsupported_event" };
  }

  const data = event.data || event.payment || event;
  const providerOrderId = cleanText(data.orderId);
  const providerStatus = cleanText(data.status);
  if (!providerOrderId || !providerStatus) {
    throw new Error("토스페이먼츠 웹훅 데이터가 올바르지 않습니다.");
  }

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId },
    include: { order: true },
  });
  if (!payment) {
    return { success: true, ignored: true, reason: "payment_not_found" };
  }

  const webhookAmount = getTossAmount(data);
  if (webhookAmount && webhookAmount !== payment.amount) {
    throw new Error("토스페이먼츠 웹훅 결제 금액이 서버 결제 금액과 일치하지 않습니다.");
  }

  const webhookPaymentKey = cleanText(data.paymentKey);
  if (webhookPaymentKey && payment.paymentKey && webhookPaymentKey !== payment.paymentKey) {
    throw new Error("토스페이먼츠 웹훅 paymentKey가 기존 결제와 일치하지 않습니다.");
  }

  if (providerStatus === PAID_PROVIDER_STATUS) {
    const order = await settlePaidPaymentWithOrder({
      paymentId: payment.id,
      activeUserId: payment.userId,
      paymentKey: webhookPaymentKey,
      rawResponse: data,
      approvedAt: parseTossDate(data.approvedAt),
    });

    return { success: true, action: "paid", orderId: order.id };
  }

  if (FAILED_PROVIDER_STATUSES.has(providerStatus) || CANCELED_PROVIDER_STATUSES.has(providerStatus)) {
    const nextStatus = CANCELED_PROVIDER_STATUSES.has(providerStatus) ? "CANCELED" : "FAILED";
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: "READY" },
      data: {
        status: nextStatus,
        failedAt: new Date(),
        failureCode: providerStatus,
        failureMessage: getFailureMessage(data),
        rawResponse: data,
      },
    });
    return { success: true, action: updated.count ? nextStatus.toLowerCase() : "observed", status: providerStatus };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { rawResponse: data },
  });
  return { success: true, action: "observed", status: providerStatus };
}
