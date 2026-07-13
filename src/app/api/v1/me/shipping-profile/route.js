import { requireApiBuyer } from "@/server/http/api-auth";
import { readApiJson } from "@/server/http/api-request";
import { withApiHandler } from "@/server/http/api-response";
import { updateBuyerShippingProfile } from "@/server/services/buyer-profile-service";

export const runtime = "nodejs";

export async function PATCH(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const input = await readApiJson(request);
    return updateBuyerShippingProfile({ userId: buyer.id, input });
  });
}
