import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    like: { findMany: vi.fn() },
    follow: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    product: { findFirst: vi.fn(), findMany: vi.fn() },
    seller: { findFirst: vi.fn() },
    order: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    refundRequest: { create: vi.fn() },
    csInquiry: { create: vi.fn() },
    payment: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/utils/prisma", () => ({ prisma: mockPrisma }));

const { addBuyerLike, removeBuyerLike } = await import("../server/services/interaction-service.js");
const { createBuyerInquiry } = await import("../server/services/inquiry-service.js");
const { createBuyerRefundRequest, fetchBuyerOrderDetail, formatApiOrder } = await import("../server/services/order-service.js");
const { prepareBuyerCheckout } = await import("../server/services/checkout-service.js");

describe("private buyer services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_ck_client");
    vi.stubEnv("CHECKOUT_SESSION_SECRET", "checkout-session-secret-for-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps like PUT and DELETE idempotent and changes likesCount once", async () => {
    let liked = false;
    const tx = {
      like: {
        createMany: vi.fn(async () => {
          if (liked) return { count: 0 };
          liked = true;
          return { count: 1 };
        }),
        deleteMany: vi.fn(async () => {
          if (!liked) return { count: 0 };
          liked = false;
          return { count: 1 };
        }),
      },
      product: { update: vi.fn(), updateMany: vi.fn() },
    };
    mockPrisma.product.findFirst.mockResolvedValue({ id: "product-1" });
    mockPrisma.$transaction.mockImplementation((callback) => callback(tx));

    await addBuyerLike({ userId: "buyer-1", productId: "product-1" });
    await addBuyerLike({ userId: "buyer-1", productId: "product-1" });
    await removeBuyerLike({ userId: "buyer-1", productId: "product-1" });
    await removeBuyerLike({ userId: "buyer-1", productId: "product-1" });

    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
  });

  it("hides another user's order by querying with both order id and token user id", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const result = await fetchBuyerOrderDetail({ userId: "buyer-1", orderId: "order-2" });

    expect(result).toBeNull();
    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "order-2", userId: "buyer-1" },
    }));
  });

  it("blocks duplicate refund requests before writing", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: "order-1", status: "결제완료", refundRequest: { id: "refund-1" } });

    await expect(createBuyerRefundRequest({
      userId: "buyer-1",
      orderId: "order-1",
      input: { reason: "DEFECTIVE", reasonDetail: "불량" },
    })).rejects.toMatchObject({ code: "REFUND_ALREADY_REQUESTED", status: 409 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("validates inquiry lengths before querying targets", async () => {
    await expect(createBuyerInquiry({
      userId: "buyer-1",
      input: { sellerId: "seller-1", type: "INQUIRY", title: "상품 문의", content: "짧음" },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });

    await expect(createBuyerInquiry({
      userId: "buyer-1",
      input: { sellerId: "seller-1", type: "INQUIRY", title: "가".repeat(101), content: "충분한 문의 내용" },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(mockPrisma.seller.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an inquiry target that is not a public approved product", async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);

    await expect(createBuyerInquiry({
      userId: "buyer-1",
      input: {
        sellerId: "seller-1",
        productId: "hidden-product",
        type: "INQUIRY",
        title: "상품 문의",
        content: "판매 중인 상품인지 궁금합니다.",
      },
    })).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND", status: 404 });
    expect(mockPrisma.csInquiry.create).not.toHaveBeenCalled();
  });

  it("formats order products without seller or admin sensitive fields", () => {
    const order = formatApiOrder({
      id: "order-1",
      total: 30000,
      status: "결제완료",
      date: new Date("2026-07-13T00:00:00.000Z"),
      address: "서울",
      name: "구매자",
      phone: "01012345678",
      shipment: null,
      refundRequest: null,
      items: [{
        id: "item-1",
        productId: "product-1",
        price: 30000,
        quantity: 1,
        product: {
          id: "product-1", sellerId: "seller-1", name: "가위", cat: "가위", desc: "전문가용", price: 30000,
          orig: null, disc: null, rating: 4.8, reviews: 0, likesCount: 0, images: ["/scissors.jpg"], spec: [],
          badge: null, icon: "scissors", tone: "tone-a",
          seller: {
            id: "seller-1", name: "브랜드", category: "가위", desc: "설명", productsCount: 1, followers: "0",
            verified: true, tone: "tone-a", businessName: "브랜드", representative: "대표",
            userId: "private-user", businessRegNo: "1234567890", kycMemo: "private",
          },
        },
      }],
    });

    expect(order.items[0].product.images).toEqual(["/scissors.jpg"]);
    expect(order.items[0].product.seller).not.toHaveProperty("userId");
    expect(order.items[0].product.seller).not.toHaveProperty("businessRegNo");
    expect(order).not.toHaveProperty("userId");
  });

  it("recalculates checkout amount from approved DB products and exposes only the app contract", async () => {
    mockPrisma.product.findMany.mockResolvedValue([{
      id: "product-1", name: "가위", price: 30000, sellerId: "seller-1", icon: "scissors", tone: "tone-a",
      images: ["/scissors.jpg"], seller: { id: "seller-1", name: "브랜드" },
    }]);
    mockPrisma.payment.create.mockImplementation(async ({ data }) => ({ id: "payment-db-id", ...data }));

    const result = await prepareBuyerCheckout({
      userId: "buyer-1",
      origin: "https://before-you-cut.vercel.app",
      input: {
        name: "구매자",
        phone: "010-1234-5678",
        address: "서울 101호",
        amount: 1,
        items: [{ productId: "product-1", quantity: 2 }],
      },
    });

    expect(result.amount).toBe(60000);
    expect(Object.keys(result).sort()).toEqual(["amount", "checkoutId", "checkoutUrl", "orderName"].sort());
    expect(result.checkoutUrl).toMatch(/^https:\/\/before-you-cut\.vercel\.app\/checkout\/app\//);
    expect(result.checkoutUrl).not.toContain("test_ck_client");
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 60000, userId: "buyer-1" }),
    }));
  });

  it("rejects non-integer checkout quantities before reading product prices", async () => {
    await expect(prepareBuyerCheckout({
      userId: "buyer-1",
      origin: "https://before-you-cut.vercel.app",
      input: {
        name: "구매자",
        phone: "01012345678",
        address: "서울",
        items: [{ productId: "product-1", quantity: 1.5 }],
      },
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
  });
});
