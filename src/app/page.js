import HomeScreen from "@/components/screens/home";
import { TabHeader } from "@/components/nav";
import { getHomeData, getSellersMap } from "@/app/actions";


export default async function HomePage() {
  const [data, sellers] = await Promise.all([getHomeData(), getSellersMap()]);

  // Ranking rows display a brand name; enrich on the server.
  const ranking = data.ranking.map((p) => ({ ...p, sellerName: sellers[p.seller]?.name }));

  return (
    <>
      <TabHeader />
      <HomeScreen ranking={ranking} newItems={data.newItems} handmade={data.handmade} spotlightSellers={data.spotlightSellers} mainBanner={data.mainBanner} />
    </>
  );
}
