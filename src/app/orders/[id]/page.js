import { notFound } from "next/navigation";
import { OverlayHeader } from "@/components/nav";
import OrderDetailScreen from "@/components/screens/order-detail";
import { getOrderDetail } from "@/app/actions";
import siteConfig from "@/site.config";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `주문 ${id.slice(0, 8)} — ${siteConfig.service.name}`,
  };
}

export default async function OrderPage({ params }) {
  const { id } = await params;
  const data = await getOrderDetail(id);
  if (data.status === "notFound") notFound();

  return (
    <>
      <OverlayHeader title="주문 상세" showBag={false} showShare={false} />
      <OrderDetailScreen data={data} />
    </>
  );
}
