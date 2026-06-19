import { OverlayHeader } from "@/components/nav";
import CheckoutResultScreen from "@/components/screens/checkout-result";
import { markCheckoutFailed } from "@/app/actions";
import siteConfig from "@/site.config";

export const metadata = {
  title: `결제 실패 — ${siteConfig.service.name}`,
};

export default async function CheckoutFailPage({ searchParams }) {
  const params = await searchParams;
  await markCheckoutFailed({
    providerOrderId: params?.orderId,
    code: params?.code,
    message: params?.message,
  });

  return (
    <>
      <OverlayHeader title="결제 실패" showBag={false} showShare={false} />
      <CheckoutResultScreen
        status="error"
        title="결제가 완료되지 않았습니다"
        desc={params?.message || "결제가 취소되었거나 실패했습니다. 장바구니에서 다시 시도해 주세요."}
      />
    </>
  );
}
