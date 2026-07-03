import { confirmReadyTossPayment } from "@/server/services/payment-service";

export const runtime = "nodejs";

function resultUrl(request, params = {}) {
  const url = new URL("/checkout/success", request.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

export async function GET(request) {
  const url = new URL(request.url);
  const paymentKey = url.searchParams.get("paymentKey");
  const providerOrderId = url.searchParams.get("orderId");
  const amount = url.searchParams.get("amount");

  try {
    const result = await confirmReadyTossPayment({ paymentKey, providerOrderId, amount });
    return Response.redirect(resultUrl(request, { orderId: result.orderId }), 303);
  } catch (error) {
    console.error("Failed to confirm checkout redirect:", error);
    return Response.redirect(
      resultUrl(request, {
        status: "error",
        message: error.message || "결제 승인 중 문제가 발생했습니다. 장바구니에서 다시 시도해 주세요.",
      }),
      303
    );
  }
}
