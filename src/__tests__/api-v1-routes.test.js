import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFetchApiHomeData,
  mockFetchApiProductDetail,
  mockFetchApiProducts,
  mockFetchApiSellerProfile,
  mockFetchApiSellers,
} = vi.hoisted(() => ({
  mockFetchApiHomeData: vi.fn(),
  mockFetchApiProductDetail: vi.fn(),
  mockFetchApiProducts: vi.fn(),
  mockFetchApiSellerProfile: vi.fn(),
  mockFetchApiSellers: vi.fn(),
}));

vi.mock("@/server/services/catalog-service", () => ({
  fetchApiHomeData: mockFetchApiHomeData,
  fetchApiProductDetail: mockFetchApiProductDetail,
  fetchApiProducts: mockFetchApiProducts,
  fetchApiSellerProfile: mockFetchApiSellerProfile,
  fetchApiSellers: mockFetchApiSellers,
}));

const healthRoute = await import("../app/api/v1/health/route.js");
const homeRoute = await import("../app/api/v1/home/route.js");
const productsRoute = await import("../app/api/v1/products/route.js");
const productDetailRoute = await import("../app/api/v1/products/[productId]/route.js");
const sellersRoute = await import("../app/api/v1/sellers/route.js");
const sellerDetailRoute = await import("../app/api/v1/sellers/[sellerId]/route.js");

describe("public /api/v1 routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchApiHomeData.mockResolvedValue({
      ranking: [],
      newItems: [],
      spotlightSellers: [],
      mainBanner: null,
    });
    mockFetchApiProducts.mockResolvedValue({
      items: [],
      page: 0,
      limit: 20,
      total: 0,
      hasMore: false,
    });
    mockFetchApiProductDetail.mockResolvedValue({
      product: { id: "product-1" },
      seller: { id: "seller-1" },
      related: [],
    });
    mockFetchApiSellers.mockResolvedValue({ items: [] });
    mockFetchApiSellerProfile.mockResolvedValue({ seller: { id: "seller-1" }, products: [] });
  });

  it("health endpoint returns the standard success envelope", async () => {
    const response = await healthRoute.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok" } });
  });

  it("home endpoint returns app home data in the standard envelope", async () => {
    const response = await homeRoute.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        ranking: [],
        newItems: [],
        spotlightSellers: [],
        mainBanner: null,
      },
    });
  });

  it("products endpoint validates and forwards catalog query params", async () => {
    const response = await productsRoute.GET(new Request("https://miyongsa.test/api/v1/products?category=헤어케어&page=2&limit=12&filter=best&query=드라이기"));

    expect(response.status).toBe(200);
    expect(mockFetchApiProducts).toHaveBeenCalledWith({
      category: "헤어케어",
      page: 2,
      limit: 12,
      filter: "best",
      query: "드라이기",
    });
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        items: [],
        page: 0,
        limit: 20,
        total: 0,
        hasMore: false,
      },
    });
  });

  it("products endpoint rejects invalid filters without calling the service", async () => {
    const response = await productsRoute.GET(new Request("https://miyongsa.test/api/v1/products?filter=admin"));

    expect(response.status).toBe(400);
    expect(mockFetchApiProducts).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "filter 값은 new 또는 best만 사용할 수 있습니다.",
      },
    });
  });

  it("products endpoint caps excessive limit values", async () => {
    const response = await productsRoute.GET(new Request("https://miyongsa.test/api/v1/products?limit=200"));

    expect(response.status).toBe(400);
    expect(mockFetchApiProducts).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "limit 값은 1부터 50까지만 사용할 수 있습니다.",
      },
    });
  });

  it("product detail endpoint returns 404 envelope when the public product is missing", async () => {
    mockFetchApiProductDetail.mockResolvedValue(null);

    const response = await productDetailRoute.GET(
      new Request("https://miyongsa.test/api/v1/products/missing"),
      { params: Promise.resolve({ productId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "상품을 찾을 수 없습니다.",
      },
    });
  });

  it("sellers endpoint returns public seller list", async () => {
    mockFetchApiSellers.mockResolvedValue({ items: [{ id: "seller-1", name: "브랜드" }] });

    const response = await sellersRoute.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { items: [{ id: "seller-1", name: "브랜드" }] },
    });
  });

  it("seller detail endpoint returns 404 envelope when the public seller is missing", async () => {
    mockFetchApiSellerProfile.mockResolvedValue(null);

    const response = await sellerDetailRoute.GET(
      new Request("https://miyongsa.test/api/v1/sellers/missing"),
      { params: Promise.resolve({ sellerId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "판매자를 찾을 수 없습니다.",
      },
    });
  });

  it("unexpected service errors do not expose internal messages", async () => {
    mockFetchApiHomeData.mockRejectedValue(new Error("database password leaked"));

    const response = await homeRoute.GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "잠시 후 다시 시도해 주세요.",
      },
    });
  });
});
