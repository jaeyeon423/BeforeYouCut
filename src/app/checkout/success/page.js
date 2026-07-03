import { OverlayHeader } from "@/components/nav";
import CheckoutResultScreen from "@/components/screens/checkout-result";
import siteConfig from "@/site.config";
import { redirect } from "next/navigation";

export const metadata = {
  title: `결제 완료 — ${siteConfig.service.name}`,
};

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = await searchParams;
  const paymentKey = firstParam(params?.paymentKey);
  const providerOrderId = firstParam(params?.orderId);
  const amount = firstParam(params?.amount);

  if (paymentKey || amount) {
    const legacyParams = new URLSearchParams();
    if (providerOrderId) legacyParams.set("orderId", providerOrderId);
    if (paymentKey) legacyParams.set("paymentKey", paymentKey);
    if (amount) legacyParams.set("amount", amount);
    redirect(`/checkout/confirm?${legacyParams.toString()}`);
  }

  const orderId = firstParam(params?.orderId);
  const status = firstParam(params?.status);
  const message = firstParam(params?.message) || "결제 승인 중 문제가 발생했습니다. 장바구니에서 다시 시도해 주세요.";

  if (status !== "error" && orderId) {
    return (
      <>
        <OverlayHeader title="결제 완료" showBag={false} showShare={false} />
        <CheckoutResultScreen
          status="success"
          title="결제가 완료되었습니다"
          desc="결제 승인을 확인했고 주문을 생성했습니다."
          orderId={orderId}
          clearCart
        />
      </>
    );
  }

  return (
    <>
      <OverlayHeader title="결제 확인 실패" showBag={false} showShare={false} />
      <CheckoutResultScreen
        status="error"
        title="결제를 확인하지 못했습니다"
        desc={message}
      />
    </>
  );
}
