import { requireApiBuyer } from "@/server/http/api-auth";
import { readApiJson } from "@/server/http/api-request";
import { withApiHandler } from "@/server/http/api-response";
import { prepareBuyerCheckout, resolveCheckoutOrigin } from "@/server/services/checkout-service";

export const runtime = "nodejs";

export async function POST(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const input = await readApiJson(request);
    const origin = resolveCheckoutOrigin(request.url);
    return prepareBuyerCheckout({ userId: buyer.id, input, origin });
  });
}
