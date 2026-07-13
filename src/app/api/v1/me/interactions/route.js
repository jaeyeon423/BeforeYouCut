import { requireApiBuyer } from "@/server/http/api-auth";
import { withApiHandler } from "@/server/http/api-response";
import { fetchBuyerInteractions } from "@/server/services/interaction-service";

export const runtime = "nodejs";

export async function GET(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    return fetchBuyerInteractions({ userId: buyer.id });
  });
}
