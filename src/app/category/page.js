import { TabHeader } from "@/components/nav";
import { CategoryScreen } from "@/components/screens/other";
import { getCategoryProducts, getSellersMap } from "@/app/actions";

const BRAND_DIRECTORY_TIMEOUT_MS = 4000;

async function getSellersForDirectory() {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve({}), BRAND_DIRECTORY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([getSellersMap(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function CategoryPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const cat = typeof sp.cat === "string" ? sp.cat : "전체";
  const filter = typeof sp.filter === "string" ? sp.filter : null;
  const tab = sp.tab === "brand" ? "brand" : "category";
  const catalogData = tab === "category"
    ? await getCategoryProducts(cat, 0, 20, filter)
    : { items: [], hasMore: false, total: 0 };
  const sellers = tab === "brand" ? Object.values(await getSellersForDirectory()) : [];

  return (
    <>
      <TabHeader title="카테고리" bordered />
      <CategoryScreen
        cat={cat}
        initialItems={catalogData.items}
        initialHasMore={catalogData.hasMore}
        total={catalogData.total}
        filter={filter}
        tab={tab}
        sellers={sellers}
      />
    </>
  );
}
