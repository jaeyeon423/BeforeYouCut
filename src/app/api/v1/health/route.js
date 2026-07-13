import { apiOk } from "@/server/http/api-response";

export const runtime = "nodejs";

export async function GET() {
  return apiOk({ status: "ok" });
}
