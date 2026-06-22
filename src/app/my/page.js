import { TabHeader } from "@/components/nav";
import { MyScreen } from "@/components/screens/other";
import { getMyAccountSummary, getMyShippingProfile, getUserOrders } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function MyPage({ searchParams }) {
  const [orders, params, shippingProfile, accountSummary] = await Promise.all([
    getUserOrders(),
    searchParams,
    getMyShippingProfile(),
    getMyAccountSummary(),
  ]);
  const initialAuthMode = ["signin", "signup"].includes(params?.auth) ? params.auth : null;
  const authReturnTo =
    typeof params?.returnTo === "string" && params.returnTo.startsWith("/") && !params.returnTo.startsWith("//")
      ? params.returnTo
      : null;

  return (
    <>
      <TabHeader title="마이페이지" bordered />
      <MyScreen
        orders={orders}
        initialAuthMode={initialAuthMode}
        authReturnTo={authReturnTo}
        shippingProfile={shippingProfile}
        accountSummary={accountSummary}
      />
    </>
  );
}
