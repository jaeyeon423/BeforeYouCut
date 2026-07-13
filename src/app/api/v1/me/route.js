import { requireApiBuyer } from "@/server/http/api-auth";
import { withApiHandler } from "@/server/http/api-response";
import { fetchBuyerMe } from "@/server/services/buyer-profile-service";

export const runtime = "nodejs";

export async function GET(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    return fetchBuyerMe({ account: buyer.account, authUser: buyer });
  });
}
