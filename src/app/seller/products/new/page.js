import { SellerRoutePage } from "../../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `상품 등록 — ${siteConfig.service.name}`,
  description: "판매자가 새 상품의 판매 정보, 대표 이미지, 상품정보고시를 등록하는 화면입니다.",
};

export default async function SellerProductNewPage() {
  return SellerRoutePage({ view: "productNew" });
}
