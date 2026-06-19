import { TabHeader } from "@/components/nav";
import AdminDashboardScreen from "@/components/screens/admin-dashboard";
import { getAdminDashboard } from "@/app/actions";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `관리자 콘솔 — ${siteConfig.service.name}`,
  description: "판매자 승인, 상품 검수, 주문·정산·문의 상태를 관리하는 운영자 전용 화면입니다.",
};

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();

  return (
    <>
      <TabHeader title="관리자 콘솔" bordered />
      <AdminDashboardScreen dashboard={dashboard} />
    </>
  );
}
