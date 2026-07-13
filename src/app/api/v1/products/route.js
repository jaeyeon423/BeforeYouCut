import { parseProductsQuery } from "@/app/api/v1/_params";
import { withApiHandler } from "@/server/http/api-response";
import { fetchApiProducts } from "@/server/services/catalog-service";

export const runtime = "nodejs";

export async function GET(request) {
  return withApiHandler(() => {
    const url = new URL(request.url);
    return fetchApiProducts(parseProductsQuery(url.searchParams));
  });
}
