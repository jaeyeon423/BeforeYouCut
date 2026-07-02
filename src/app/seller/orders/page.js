import { SellerRoutePage } from "../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `판매 주문 — ${siteConfig.service.name}`,
  description: "판매자가 주문과 배송 처리 대상을 확인하는 화면입니다.",
};

export default async function SellerOrdersPage() {
  return SellerRoutePage({ view: "orders" });
}
