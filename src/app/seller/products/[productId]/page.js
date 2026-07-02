import { SellerRoutePage } from "../../_SellerRoutePage";
import siteConfig from "@/site.config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `상품 상세 수정 — ${siteConfig.service.name}`,
  description: "판매자가 구매자에게 노출되는 상품 상세페이지 내용을 수정하는 화면입니다.",
};

export default async function SellerProductEditPage({ params }) {
  const { productId } = await params;
  return SellerRoutePage({ view: "productEdit", selectedProductId: productId });
}
