import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "../server/http/api-errors.js";

const mocks = vi.hoisted(() => ({
  requireApiBuyer: vi.fn(),
  fetchBuyerMe: vi.fn(),
  updateBuyerShippingProfile: vi.fn(),
  fetchBuyerInteractions: vi.fn(),
  addBuyerLike: vi.fn(),
  removeBuyerLike: vi.fn(),
  addBuyerFollow: vi.fn(),
  removeBuyerFollow: vi.fn(),
  fetchBuyerOrders: vi.fn(),
  fetchBuyerOrderDetail: vi.fn(),
  createBuyerRefundRequest: vi.fn(),
  createBuyerInquiry: vi.fn(),
  prepareBuyerCheckout: vi.fn(),
  resolveCheckoutOrigin: vi.fn(),
}));

vi.mock("@/server/http/api-auth", () => ({ requireApiBuyer: mocks.requireApiBuyer }));
vi.mock("@/server/services/buyer-profile-service", () => ({
  fetchBuyerMe: mocks.fetchBuyerMe,
  updateBuyerShippingProfile: mocks.updateBuyerShippingProfile,
}));
vi.mock("@/server/services/interaction-service", () => ({
  fetchBuyerInteractions: mocks.fetchBuyerInteractions,
  addBuyerLike: mocks.addBuyerLike,
  removeBuyerLike: mocks.removeBuyerLike,
  addBuyerFollow: mocks.addBuyerFollow,
  removeBuyerFollow: mocks.removeBuyerFollow,
}));
vi.mock("@/server/services/order-service", () => ({
  fetchBuyerOrders: mocks.fetchBuyerOrders,
  fetchBuyerOrderDetail: mocks.fetchBuyerOrderDetail,
  createBuyerRefundRequest: mocks.createBuyerRefundRequest,
}));
vi.mock("@/server/services/inquiry-service", () => ({ createBuyerInquiry: mocks.createBuyerInquiry }));
vi.mock("@/server/services/checkout-service", () => ({
  prepareBuyerCheckout: mocks.prepareBuyerCheckout,
  resolveCheckoutOrigin: mocks.resolveCheckoutOrigin,
}));

const meRoute = await import("../app/api/v1/me/route.js");
const shippingRoute = await import("../app/api/v1/me/shipping-profile/route.js");
const likeRoute = await import("../app/api/v1/me/likes/[productId]/route.js");
const orderDetailRoute = await import("../app/api/v1/orders/[orderId]/route.js");
const refundRoute = await import("../app/api/v1/orders/[orderId]/refund-requests/route.js");
const inquiryRoute = await import("../app/api/v1/inquiries/route.js");
const checkoutRoute = await import("../app/api/v1/checkout/prepare/route.js");

const buyer = { id: "token-user", email: "buyer@example.com", account: { id: "token-user", role: "BUYER" } };

function jsonRequest(url, method, body) {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private buyer /api/v1 routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiBuyer.mockResolvedValue(buyer);
    mocks.resolveCheckoutOrigin.mockReturnValue("https://before-you-cut.vercel.app");
  });

  it("returns the standard 401 envelope when auth fails", async () => {
    mocks.requireApiBuyer.mockRejectedValue(unauthorized());
    const response = await meRoute.GET(new Request("https://miyongsa.test/api/v1/me"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
    });
  });

  it("ignores a body userId and always forwards the token user id", async () => {
    mocks.updateBuyerShippingProfile.mockResolvedValue({ shippingProfile: { name: "구매자" } });
    const response = await shippingRoute.PATCH(jsonRequest(
      "https://miyongsa.test/api/v1/me/shipping-profile",
      "PATCH",
      { userId: "attacker", name: "구매자", phone: "01012345678", address: "서울", addressDetail: "101호" }
    ));

    expect(response.status).toBe(200);
    expect(mocks.updateBuyerShippingProfile).toHaveBeenCalledWith(expect.objectContaining({ userId: "token-user" }));
  });

  it("uses explicit idempotent like operations", async () => {
    mocks.addBuyerLike.mockResolvedValue({ liked: true });
    mocks.removeBuyerLike.mockResolvedValue({ liked: false });
    const context = { params: Promise.resolve({ productId: "product-1" }) };

    const putResponse = await likeRoute.PUT(new Request("https://miyongsa.test", { method: "PUT" }), context);
    const deleteResponse = await likeRoute.DELETE(new Request("https://miyongsa.test", { method: "DELETE" }), context);

    expect(await putResponse.json()).toEqual({ ok: true, data: { liked: true } });
    expect(await deleteResponse.json()).toEqual({ ok: true, data: { liked: false } });
  });

  it("returns 404 for an order not owned by the token user", async () => {
    mocks.fetchBuyerOrderDetail.mockResolvedValue(null);
    const response = await orderDetailRoute.GET(
      new Request("https://miyongsa.test/api/v1/orders/other", { headers: { Authorization: "Bearer token" } }),
      { params: Promise.resolve({ orderId: "other" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.fetchBuyerOrderDetail).toHaveBeenCalledWith({ userId: "token-user", orderId: "other" });
  });

  it("passes validated refund and inquiry bodies to buyer-scoped services", async () => {
    mocks.createBuyerRefundRequest.mockResolvedValue({ refundRequest: { id: "refund-1" } });
    mocks.createBuyerInquiry.mockResolvedValue({ inquiry: { id: "inquiry-1" } });

    await refundRoute.POST(
      jsonRequest("https://miyongsa.test/api/v1/orders/order-1/refund-requests", "POST", { reason: "DEFECTIVE", reasonDetail: "불량" }),
      { params: Promise.resolve({ orderId: "order-1" }) }
    );
    await inquiryRoute.POST(jsonRequest("https://miyongsa.test/api/v1/inquiries", "POST", {
      sellerId: "seller-1", type: "INQUIRY", title: "상품 문의", content: "재고가 있나요?",
    }));

    expect(mocks.createBuyerRefundRequest).toHaveBeenCalledWith(expect.objectContaining({ userId: "token-user", orderId: "order-1" }));
    expect(mocks.createBuyerInquiry).toHaveBeenCalledWith(expect.objectContaining({ userId: "token-user" }));
  });

  it("prepares checkout with the token user and server-selected HTTPS origin", async () => {
    mocks.prepareBuyerCheckout.mockResolvedValue({
      checkoutId: "checkout-1",
      amount: 30000,
      orderName: "가위",
      checkoutUrl: "https://before-you-cut.vercel.app/checkout/app/token",
    });
    const input = { name: "구매자", phone: "01012345678", address: "서울", items: [{ productId: "product-1", quantity: 1 }] };
    const response = await checkoutRoute.POST(jsonRequest("https://miyongsa.test/api/v1/checkout/prepare", "POST", input));

    expect(response.status).toBe(200);
    expect(mocks.prepareBuyerCheckout).toHaveBeenCalledWith({
      userId: "token-user",
      input,
      origin: "https://before-you-cut.vercel.app",
    });
  });
});
