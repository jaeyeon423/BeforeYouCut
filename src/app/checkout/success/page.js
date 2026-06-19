import { OverlayHeader } from "@/components/nav";
import CheckoutResultScreen from "@/components/screens/checkout-result";
import { confirmCheckout } from "@/app/actions";
import siteConfig from "@/site.config";

export const metadata = {
  title: `결제 완료 — ${siteConfig.service.name}`,
};

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = await searchParams;
  const paymentKey = params?.paymentKey;
  const providerOrderId = params?.orderId;
  const amount = params?.amount;
  let result = null;
  let errorMessage = "";

  try {
    result = await confirmCheckout({ paymentKey, providerOrderId, amount });
  } catch (error) {
    errorMessage = error.message || "결제 승인 중 문제가 발생했습니다. 장바구니에서 다시 시도해 주세요.";
  }

  if (result?.success) {
    return (
      <>
        <OverlayHeader title="결제 완료" showBag={false} showShare={false} />
        <CheckoutResultScreen
          status="success"
          title="결제가 완료되었습니다"
          desc="결제 승인을 확인했고 주문을 생성했습니다."
          orderId={result.orderId}
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
        desc={errorMessage}
      />
    </>
  );
}
