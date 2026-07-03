import { prisma } from "@/utils/prisma";
import siteConfig from "@/site.config";

const PAID_PROVIDER_STATUS = "DONE";
const FAILED_PROVIDER_STATUSES = new Set(["ABORTED", "EXPIRED"]);
const CANCELED_PROVIDER_STATUSES = new Set(["CANCELED", "PARTIAL_CANCELED"]);
const SUPPORTED_TOSS_WEBHOOK_EVENTS = new Set(["PAYMENT_STATUS_CHANGED", "CANCEL_STATUS_CHANGED"]);
const TOSS_CANCEL_URL_BASE = "https://api.tosspayments.com/v1/payments";
const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

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

function getTossSecretKey() {
  return cleanText(process.env.TOSS_SECRET_KEY);
}

function createTossAuthorizationHeader(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const secretKey = getTossSecretKey();
  if (!secretKey) throw new Error("TOSS_SECRET_KEY 환경변수를 설정해야 결제를 승인할 수 있습니다.");

  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: createTossAuthorizationHeader(secretKey),
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

export async function cancelTossPayment({ paymentKey, cancelReason, cancelAmount, idempotencyKey } = {}) {
  const cleanPaymentKey = cleanText(paymentKey);
  if (!cleanPaymentKey) {
    throw new Error("토스페이먼츠 paymentKey가 없어 환불을 처리할 수 없습니다.");
  }

  const secretKey = getTossSecretKey();
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY 환경변수를 설정해야 환불을 처리할 수 있습니다.");
  }

  const body = {
    cancelReason: cleanText(cancelReason) || "관리자 환불 처리",
  };
  const numericCancelAmount = Number(cancelAmount);
  if (Number.isFinite(numericCancelAmount) && numericCancelAmount > 0) {
    body.cancelAmount = Math.round(numericCancelAmount);
  }

  const headers = {
    Authorization: createTossAuthorizationHeader(secretKey),
    "Content-Type": "application/json",
  };
  const cleanIdempotencyKey = cleanText(idempotencyKey);
  if (cleanIdempotencyKey) {
    headers["Idempotency-Key"] = cleanIdempotencyKey;
  }

  const response = await fetch(`${TOSS_CANCEL_URL_BASE}/${encodeURIComponent(cleanPaymentKey)}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "토스페이먼츠 결제 취소에 실패했습니다.");
  }
  return payload;
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

export async function confirmReadyTossPayment({ paymentKey, providerOrderId, amount, authUserId } = {}) {
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
  if (!payment || (authUserId && payment.userId !== authUserId)) {
    throw new Error("결제 요청을 찾을 수 없습니다.");
  }
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
  if (tossPayment.status && tossPayment.status !== PAID_PROVIDER_STATUS) {
    throw new Error("결제가 완료 상태가 아닙니다.");
  }

  const approvedAt = tossPayment.approvedAt ? new Date(tossPayment.approvedAt) : null;
  const order = await settlePaidPaymentWithOrder({
    paymentId: payment.id,
    activeUserId: payment.userId,
    paymentKey: cleanPaymentKey,
    rawResponse: tossPayment,
    approvedAt: approvedAt && !Number.isNaN(approvedAt.getTime()) ? approvedAt : undefined,
  });

  return { success: true, orderId: order.id };
}

export async function handleTossPaymentWebhook(event = {}) {
  const eventType = cleanText(event.eventType);
  if (eventType && !SUPPORTED_TOSS_WEBHOOK_EVENTS.has(eventType)) {
    return { success: true, ignored: true, reason: "unsupported_event" };
  }

  const data = event.data || event.payment || event;
  const providerOrderId = cleanText(data.orderId);
  const providerStatus = cleanText(data.status) || cleanText(data.cancelStatus);
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
      where: { id: payment.id, status: { in: nextStatus === "CANCELED" ? ["READY", "PAID"] : ["READY"] } },
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
