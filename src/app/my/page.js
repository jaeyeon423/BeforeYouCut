import { TabHeader } from "@/components/nav";
import { MyScreen } from "@/components/screens/other";
import { getUserOrders } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const orders = await getUserOrders();

  return (
    <>
      <TabHeader title="마이페이지" bordered />
      <MyScreen orders={orders} />
    </>
  );
}
