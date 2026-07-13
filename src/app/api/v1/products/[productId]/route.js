import { notFound } from "@/server/http/api-errors";
import { withApiHandler } from "@/server/http/api-response";
import { fetchApiProductDetail } from "@/server/services/catalog-service";

export const runtime = "nodejs";

export async function GET(_request, context) {
  return withApiHandler(async () => {
    const { productId } = await context.params;
    const result = await fetchApiProductDetail(productId);
    if (!result) throw notFound("상품을 찾을 수 없습니다.");
    return result;
  });
}
