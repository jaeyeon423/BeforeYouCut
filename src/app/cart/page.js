import { OverlayHeader } from "@/components/nav";
import { CartScreen } from "@/components/screens/other";

export default function CartPage() {
  return (
    <>
      <OverlayHeader title="장바구니" showBag={false} showShare={false} />
      <CartScreen />
    </>
  );
}
