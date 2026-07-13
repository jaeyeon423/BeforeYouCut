import { requireApiBuyer } from "@/server/http/api-auth";
import { withApiHandler } from "@/server/http/api-response";
import { addBuyerLike, removeBuyerLike } from "@/server/services/interaction-service";

export const runtime = "nodejs";

async function handle(request, context, operation) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const { productId } = await context.params;
    return operation({ userId: buyer.id, productId });
  });
}

export function PUT(request, context) {
  return handle(request, context, addBuyerLike);
}

export function DELETE(request, context) {
  return handle(request, context, removeBuyerLike);
}
