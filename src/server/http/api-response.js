import { normalizeApiError } from "./api-errors";

export function apiOk(data = {}, init = {}) {
  const status = init.status || 200;
  return Response.json({ ok: true, data }, { ...init, status });
}

export function apiFail(error) {
  const normalized = normalizeApiError(error);
  return Response.json(
    {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    },
    { status: normalized.status }
  );
}

export async function withApiHandler(handler) {
  try {
    return apiOk(await handler());
  } catch (error) {
    if (error?.status >= 500 || !error?.status) {
      console.error("API route failed:", error);
    }
    return apiFail(error);
  }
}
