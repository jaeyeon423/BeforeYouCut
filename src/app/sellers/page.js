import { getSellersMap } from "@/app/actions";
import { TabHeader } from "@/components/nav";
import BrandsScreen from "@/components/screens/brands";
import siteConfig from "@/site.config";

export const metadata = {
  title: `입점 브랜드 디렉토리 — ${siteConfig.service.name}`,
  description: `${siteConfig.service.name}에 입점한 미용 전문가 도구 브랜드들을 확인하세요.`,
  openGraph: {
    title: `입점 브랜드 디렉토리 — ${siteConfig.service.name}`,
    description: `${siteConfig.service.name}에 입점한 미용 전문가 도구 브랜드들을 확인하세요.`,
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
