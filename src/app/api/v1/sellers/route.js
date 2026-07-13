import { withApiHandler } from "@/server/http/api-response";
import { fetchApiSellers } from "@/server/services/catalog-service";

export const runtime = "nodejs";

export async function GET() {
  return withApiHandler(() => fetchApiSellers());
}
