import { requireApiBuyer } from "@/server/http/api-auth";
import { readApiJson } from "@/server/http/api-request";
import { withApiHandler } from "@/server/http/api-response";
import { createBuyerInquiry } from "@/server/services/inquiry-service";

export const runtime = "nodejs";

export async function POST(request) {
  return withApiHandler(async () => {
    const buyer = await requireApiBuyer(request);
    const input = await readApiJson(request);
    return createBuyerInquiry({ userId: buyer.id, input });
  });
}
