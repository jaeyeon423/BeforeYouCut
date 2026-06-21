import { OverlayHeader } from "@/components/nav";
import { CartScreen } from "@/components/screens/other";
import { getMyShippingProfile } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }) {
  const [params, shippingProfile] = await Promise.all([
    searchParams,
    getMyShippingProfile(),
  ]);
  const initialCheckout = params?.checkout === "1";

  return (
    <>
      <OverlayHeader title="장바구니" showBag={false} showShare={false} />
      <CartScreen initialCheckout={initialCheckout} shippingProfile={shippingProfile} />
    </>
  );
}
