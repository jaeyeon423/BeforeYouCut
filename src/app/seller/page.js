import { TabHeader } from "@/components/nav";
import SellerDashboardScreen from "@/components/screens/seller-dashboard";
import { getSellerDashboard } from "@/app/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "판매자 센터 — BEFORE YOU CUT",
  description: "입점 판매자가 자신의 상품 상세페이지, 주문, 정산을 관리하는 판매자 전용 화면입니다.",
};

export default async function SellerPage() {
  const dashboard = await getSellerDashboard();

  return (
    <>
      <TabHeader title="판매자 센터" bordered />
      <SellerDashboardScreen dashboard={dashboard} />
    </>
  );
}
