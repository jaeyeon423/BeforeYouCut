export class ApiError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function badRequest(message = "요청 값을 확인해 주세요.", code = "VALIDATION_ERROR") {
  return new ApiError(code, message, 400);
}

export function unauthorized(message = "로그인이 필요합니다.", code = "UNAUTHORIZED") {
  return new ApiError(code, message, 401);
}

export function forbidden(message = "접근 권한이 없습니다.", code = "FORBIDDEN") {
  return new ApiError(code, message, 403);
}

export function notFound(message = "요청한 정보를 찾을 수 없습니다.", code = "NOT_FOUND") {
  return new ApiError(code, message, 404);
}

export function conflict(message = "이미 처리된 요청입니다.", code = "CONFLICT") {
  return new ApiError(code, message, 409);
}

export function internalError(message = "잠시 후 다시 시도해 주세요.", code = "INTERNAL_ERROR") {
  return new ApiError(code, message, 500);
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) return error;
  return internalError();
}
