import { requireApiBuyer } from "@/server/http/api-auth";
import { withApiHandler } from "@/server/http/api-response";
import { addBuyerFollow, removeBuyerFollow } from "@/server/services/interaction-service";

export const runtime = "nodejs";

async function handle(request, context, operation) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const { sellerId } = await context.params;
    return operation({ userId: buyer.id, sellerId });
  });
}

export function PUT(request, context) {
  return handle(request, context, addBuyerFollow);
}

export function DELETE(request, context) {
  return handle(request, context, removeBuyerFollow);
}
