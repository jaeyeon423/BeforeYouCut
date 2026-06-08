import { notFound } from "next/navigation";
import { OverlayHeader } from "@/components/nav";
import { SellerScreen } from "@/components/screens/other";
import { getSellerProfile } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getSellerProfile(id);
  if (!data) return { title: "브랜드를 찾을 수 없습니다 — BEFORE YOU CUT" };
  const { seller } = data;
  return {
    title: `${seller.name} — BEFORE YOU CUT`,
    description: seller.desc || `${seller.name} 입점 브랜드`,
    openGraph: {
      title: `${seller.name} — BEFORE YOU CUT`,
      description: seller.desc || `${seller.name} 입점 브랜드`,
    },
  };
}

export default async function SellerPage({ params }) {
  const { id } = await params;
  const data = await getSellerProfile(id);
  if (!data) notFound();

  return (
    <>
      <OverlayHeader title="브랜드" />
      <SellerScreen seller={data.seller} products={data.products} />
    </>
  );
}
