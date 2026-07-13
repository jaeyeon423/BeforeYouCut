import { badRequest } from "@/server/http/api-errors";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 0;
const ALLOWED_FILTERS = new Set(["new", "best"]);

function cleanText(value) {
  return String(value || "").trim();
}

function parseInteger(value, fallback, name) {
  if (value == null || value === "") return fallback;
  if (!/^\d+$/.test(value)) {
    throw badRequest(`${name} 값을 확인해 주세요.`);
  }
  return Number(value);
}

export function parseProductsQuery(searchParams) {
  const category = cleanText(searchParams.get("category")) || "전체";
  const query = cleanText(searchParams.get("query"));
  const rawFilter = cleanText(searchParams.get("filter"));
  const filter = rawFilter || null;
  const page = parseInteger(searchParams.get("page"), DEFAULT_PAGE, "page");
  const limit = parseInteger(searchParams.get("limit"), DEFAULT_LIMIT, "limit");

  if (page < 0) throw badRequest("page 값은 0 이상이어야 합니다.");
  if (limit < 1 || limit > MAX_LIMIT) {
    throw badRequest(`limit 값은 1부터 ${MAX_LIMIT}까지만 사용할 수 있습니다.`);
  }
  if (filter && !ALLOWED_FILTERS.has(filter)) {
    throw badRequest("filter 값은 new 또는 best만 사용할 수 있습니다.");
  }
  if (category.length > 40) throw badRequest("category 값이 너무 깁니다.");
  if (query.length > 80) throw badRequest("검색어는 80자 이하로 입력해 주세요.");

  return { category, page, limit, filter, query };
}
