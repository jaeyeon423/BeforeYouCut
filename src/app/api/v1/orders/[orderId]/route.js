import { requireApiBuyer } from "@/server/http/api-auth";
import { notFound } from "@/server/http/api-errors";
import { withApiHandler } from "@/server/http/api-response";
import { fetchBuyerOrderDetail } from "@/server/services/order-service";

export const runtime = "nodejs";

export async function GET(request, context) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const { orderId } = await context.params;
    const result = await fetchBuyerOrderDetail({ userId: buyer.id, orderId });
    if (!result) throw notFound("주문을 찾을 수 없습니다.", "ORDER_NOT_FOUND");
    return result;
  });
}
