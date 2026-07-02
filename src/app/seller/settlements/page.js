import { SellerRoutePage } from "../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `판매 정산 — ${siteConfig.service.name}`,
  description: "판매자가 정산 예정 금액과 지급 상태를 확인하는 화면입니다.",
};

export default async function SellerSettlementsPage() {
  return SellerRoutePage({ view: "settlements" });
}
