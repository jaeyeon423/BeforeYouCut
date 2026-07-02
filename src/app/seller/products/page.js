import { SellerRoutePage } from "../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `판매 상품 — ${siteConfig.service.name}`,
  description: "판매자가 등록 상품 상태와 상세 수정 진입점을 확인하는 화면입니다.",
};

export default async function SellerProductsPage() {
  return SellerRoutePage({ view: "products" });
}
