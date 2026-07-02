import { TabHeader } from "@/components/nav";
import SellerDashboardScreen from "@/components/screens/seller-dashboard";
import { getSellerDashboard } from "@/app/actions";

export async function SellerRoutePage({ view = "overview", selectedProductId = null }) {
  const dashboard = await getSellerDashboard();

  return (
    <>
      <TabHeader title="판매자 센터" bordered />
      <SellerDashboardScreen dashboard={dashboard} view={view} selectedProductId={selectedProductId} />
    </>
  );
}
