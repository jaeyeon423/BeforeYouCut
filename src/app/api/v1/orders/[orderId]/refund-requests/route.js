import { requireApiBuyer } from "@/server/http/api-auth";
import { readApiJson } from "@/server/http/api-request";
import { withApiHandler } from "@/server/http/api-response";
import { createBuyerRefundRequest } from "@/server/services/order-service";

export const runtime = "nodejs";

export async function POST(request, context) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const { orderId } = await context.params;
    const input = await readApiJson(request);
    return createBuyerRefundRequest({ userId: buyer.id, orderId, input });
  });
}
