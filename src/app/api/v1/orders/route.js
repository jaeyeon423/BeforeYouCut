import { requireApiBuyer } from "@/server/http/api-auth";
import { withApiHandler } from "@/server/http/api-response";
import { fetchBuyerOrders } from "@/server/services/order-service";

export const runtime = "nodejs";

export async function GET(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    return fetchBuyerOrders({ userId: buyer.id });
  });
}
