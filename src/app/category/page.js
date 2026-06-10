import { TabHeader } from "@/components/nav";
import { CategoryScreen } from "@/components/screens/other";
import { getCategoryProducts } from "@/app/actions";


export default async function CategoryPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const cat = typeof sp.cat === "string" ? sp.cat : "전체";
  const { items, hasMore, total } = await getCategoryProducts(cat, 0, 20);

  return (
    <>
      <TabHeader title="카테고리" bordered />
      <CategoryScreen cat={cat} initialItems={items} initialHasMore={hasMore} total={total} />
    </>
  );
}
