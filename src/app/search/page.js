import { TabHeader } from "@/components/nav";
import { SearchScreen } from "@/components/screens/other";
import { getCategoryProducts } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  // Search filters client-side over the full catalog.
  const { items } = await getCategoryProducts("전체", 0, 1000);

  return (
    <>
      <TabHeader title="검색" bordered />
      <SearchScreen products={items} />
    </>
  );
}
