import { notFound } from "next/navigation";
import { OverlayHeader } from "@/components/nav";
import { DetailScreen } from "@/components/screens/other";
import { getProductDetailForViewer } from "@/app/actions";
import siteConfig from "@/site.config";


export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getProductDetailForViewer(id);
  if (!data) return { title: `상품을 찾을 수 없습니다 — ${siteConfig.service.name}` };
  const { product, seller } = data;
  return {
    title: `${product.name} — ${seller?.name || siteConfig.service.name}`,
    description: product.desc || `${seller?.name || ""}의 ${product.name}`,
    openGraph: {
      title: `${product.name} — ${seller?.name || siteConfig.service.name}`,
      description: product.desc || product.name,
    },
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const data = await getProductDetailForViewer(id);
  if (!data) notFound();

  return (
    <>
      <OverlayHeader title={data.seller?.name || "상품"} />
      <DetailScreen product={data.product} seller={data.seller} related={data.related} previewMode={data.previewMode} />
    </>
  );
}
