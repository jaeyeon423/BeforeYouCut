import { SellerRoutePage } from "../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `판매자 운영 정보 — ${siteConfig.service.name}`,
  description: "판매자가 입점 심사, 사업자 서류, 정산 계좌 정보를 관리하는 화면입니다.",
};

export default async function SellerSettingsPage() {
  return SellerRoutePage({ view: "settings" });
}
