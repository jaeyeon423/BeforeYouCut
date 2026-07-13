import { withApiHandler } from "@/server/http/api-response";
import { fetchApiHomeData } from "@/server/services/catalog-service";

export const runtime = "nodejs";

export async function GET() {
  return withApiHandler(() => fetchApiHomeData());
}
