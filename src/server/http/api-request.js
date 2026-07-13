import { badRequest } from "./api-errors";

export async function readApiJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw badRequest("JSON 형식의 요청 본문이 필요합니다.");
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid body");
    }
    return body;
  } catch {
    throw badRequest("요청 본문의 JSON 형식을 확인해 주세요.");
  }
}
