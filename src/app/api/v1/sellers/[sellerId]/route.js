import { notFound } from "@/server/http/api-errors";
import { withApiHandler } from "@/server/http/api-response";
import { fetchApiSellerProfile } from "@/server/services/catalog-service";

export const runtime = "nodejs";

export async function GET(_request, context) {
  return withApiHandler(async () => {
    const { sellerId } = await context.params;
    const result = await fetchApiSellerProfile(sellerId);
    if (!result) throw notFound("판매자를 찾을 수 없습니다.");
    return result;
  });
}
