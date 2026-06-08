import { TabHeader } from "@/components/nav";
import { SavedScreen } from "@/components/screens/other";
import { getCategoryProducts } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  // The full catalog is filtered client-side against the user's likes.
  const { items } = await getCategoryProducts("전체", 0, 1000);

  return (
    <>
      <TabHeader title="저장" bordered />
      <SavedScreen products={items} />
    </>
  );
}
