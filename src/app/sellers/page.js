import { getSellersMap } from "@/app/actions";
import { TabHeader } from "@/components/nav";
import BrandsScreen from "@/components/screens/brands";

export const metadata = {
  title: "입점 브랜드 디렉토리 — BEFORE YOU CUT",
  description: "BEFORE YOU CUT에 입점한 프리미엄 미용 전문가 도구 브랜드들을 모아서 확인하고 팔로우해보세요.",
  openGraph: {
    title: "입점 브랜드 디렉토리 — BEFORE YOU CUT",
    description: "BEFORE YOU CUT에 입점한 프리미엄 미용 전문가 도구 브랜드들을 모아서 확인하고 팔로우해보세요.",
  },
};

export default async function SellersPage() {
  const sellersMap = await getSellersMap();
  const sellers = Object.values(sellersMap);

  return (
    <>
      <TabHeader title="브랜드" bordered />
      <BrandsScreen sellers={sellers} />
    </>
  );
}
