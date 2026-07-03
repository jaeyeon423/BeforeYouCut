import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockSignUp = vi.fn();
vi.mock("../utils/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser, signUp: mockSignUp } })
  ),
}));

const mockPrisma = {
  like: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  follow: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  product: { update: vi.fn(), create: vi.fn(), count: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  order: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  payment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  refundRequest: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  settlement: { updateMany: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  csInquiry: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  csReply: { create: vi.fn() },
  phoneVerification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  termsVersion: { findFirst: vi.fn() },
  consentRecord: { upsert: vi.fn() },
  seller: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("../utils/prisma", () => ({ prisma: mockPrisma, default: mockPrisma }));

// ── Import after mocks ─────────────────────────────────────────────────────
const {
  confirmCheckout,
  createInquiry,
  createOrder,
  getAdminDashboard,
  getMyAccountSummary,
  getMyShippingProfile,
  prepareCheckout,
  registerBuyer,
  requestSignupPhoneVerification,
  syncUser,
  toggleLike,
  toggleFollow,
  createSeller,
  createSellerProduct,
  updateSellerProductDetail,
  updateAdminInquiry,
  updateAdminOrderStatus,
  updateAdminProductReview,
  updateAdminRefundStatus,
  updateAdminSettlementStatus,
  updateMyShippingProfile,
  verifySignupPhoneCode,
} = await import("../app/actions.js");
const { handleTossPaymentWebhook } = await import("../server/services/payment-service.js");

// ── Helpers ────────────────────────────────────────────────────────────────
const authedUser = (id = "user-1", email = "test@example.com", user_metadata = {}) =>
  ({ data: { user: { id, email, user_metadata } } });
const noUser = () => ({ data: { user: null } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ══════════════════════════════════════════════════════════════════════════
// toggleLike
// ══════════════════════════════════════════════════════════════════════════
describe("toggleLike", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(toggleLike("product-1")).rejects.toThrow("로그인이 필요합니다.");
  });

  it("빈 productId 는 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(toggleLike("")).rejects.toThrow("올바르지 않은 상품 ID입니다.");
  });

  it("공백만 있는 productId 는 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(toggleLike("   ")).rejects.toThrow("올바르지 않은 상품 ID입니다.");
  });

  it("좋아요가 없으면 추가하고 { liked: true } 를 반환한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.like.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (ops) => {
      for (const op of ops) await op;
    });
    mockPrisma.like.create.mockResolvedValue({});
    mockPrisma.product.update.mockResolvedValue({});

    const result = await toggleLike("product-1");
    expect(result).toEqual({ liked: true });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("좋아요가 이미 있으면 삭제하고 { liked: false } 를 반환한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.like.findUnique.mockResolvedValue({ userId: "user-1", productId: "product-1" });
    mockPrisma.$transaction.mockImplementation(async (ops) => {
      for (const op of ops) await op;
    });
    mockPrisma.like.delete.mockResolvedValue({});
    mockPrisma.product.update.mockResolvedValue({});

    const result = await toggleLike("product-1");
    expect(result).toEqual({ liked: false });
  });

  it("DB 오류가 나도 원래 에러 메시지를 re-throw 한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.like.findUnique.mockRejectedValue(new Error("DB connection failed"));
    await expect(toggleLike("product-1")).rejects.toThrow("DB connection failed");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// createInquiry
// ══════════════════════════════════════════════════════════════════════════
describe("createInquiry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(createInquiry({ title: "상품 문의", content: "문의 내용입니다." }))
      .rejects.toThrow("로그인이 필요합니다.");
  });

  it("상품 문의를 실제 CS 문의로 저장한다", async () => {
    const createdAt = new Date("2026-06-19T00:00:00.000Z");
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.product.findUnique.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      isActive: true,
      deletedAt: null,
      reviewStatus: "APPROVED",
      seller: { isActive: true, deletedAt: null },
    });
    mockPrisma.seller.findUnique.mockResolvedValue({ id: "seller-1", isActive: true, deletedAt: null });
    mockPrisma.csInquiry.create.mockResolvedValue({ id: "inquiry-1", status: "OPEN", createdAt });

    const result = await createInquiry({
      sellerId: "seller-1",
      productId: "product-1",
      title: "상품 문의",
      content: "배송 일정이 궁금합니다.",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.csInquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        sellerId: "seller-1",
        productId: "product-1",
        type: "INQUIRY",
        title: "상품 문의",
        content: "배송 일정이 궁금합니다.",
      }),
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// prepareCheckout / createOrder
// ══════════════════════════════════════════════════════════════════════════
describe("checkout payment flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_checkout";
  });

  it("직접 주문 생성은 결제 승인 전에는 막는다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createOrder()).rejects.toThrow("주문은 PG 결제 승인 후에만 생성할 수 있습니다.");
  });

  it("결제 준비 시 서버 가격 기준으로 Payment 세션을 생성한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1", "buyer@example.com"));
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        name: "프로 가위",
        price: 30000,
        sellerId: "seller-1",
        icon: "scissors",
        tone: "tone-a",
        images: [],
        seller: { id: "seller-1", name: "셀러" },
      },
    ]);
    mockPrisma.payment.create.mockResolvedValue({ id: "payment-1" });

    const result = await prepareCheckout({
      name: "구매자",
      phone: "01012345678",
      address: "서울시 강남구",
      total: 30000,
      items: [{ id: "product-1", quantity: 1 }],
      origin: "http://localhost:3000",
    });

    expect(result.success).toBe(true);
    expect(result.clientKey).toBe("test_ck_checkout");
    expect(result.amount).toBe(30000);
    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "TOSS",
        status: "READY",
        amount: 30000,
        buyerName: "구매자",
        userId: "user-1",
      }),
    });
  });

  it("토스 DONE 웹훅은 READY 결제를 선점하고 주문과 정산을 생성한다", async () => {
    const payment = {
      id: "payment-1",
      providerOrderId: "ms-order-1",
      status: "READY",
      amount: 30000,
      orderName: "프로 가위",
      buyerName: "구매자",
      buyerPhone: "01012345678",
      shippingAddress: "서울시 강남구",
      itemsSnapshot: [{ productId: "product-1", sellerId: "seller-1", price: 30000, quantity: 1 }],
      userId: "user-1",
      order: null,
    };
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
    mockPrisma.payment.findUnique
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(payment);
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.create.mockResolvedValue({
      id: "order-1",
      items: [{ id: "item-1", productId: "product-1", price: 30000, quantity: 1 }],
    });
    mockPrisma.settlement.upsert.mockResolvedValue({});
    mockPrisma.payment.update.mockResolvedValue({});

    const result = await handleTossPaymentWebhook({
      eventType: "PAYMENT_STATUS_CHANGED",
      data: {
        orderId: "ms-order-1",
        paymentKey: "payment-key-1",
        status: "DONE",
        totalAmount: 30000,
        approvedAt: "2026-06-29T12:00:00+09:00",
      },
    });

    expect(result).toEqual({ success: true, action: "paid", orderId: "order-1" });
    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "READY" },
      data: expect.objectContaining({
        status: "PAID",
        paymentKey: "payment-key-1",
      }),
    });
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-1",
        total: 30000,
        status: "결제완료",
      }),
    }));
    expect(mockPrisma.settlement.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        sellerId: "seller-1",
        orderItemId: "item-1",
        saleAmount: 30000,
      }),
    }));
  });

  it("성공 리다이렉트는 현재 로그인 세션이 없어도 저장된 Payment 소유자로 결제를 확정한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "DONE",
        paymentKey: "payment-key-1",
        approvedAt: "2026-07-03T11:50:00+09:00",
        totalAmount: 30000,
      }),
    });
    const payment = {
      id: "payment-1",
      providerOrderId: "ms-order-1",
      status: "READY",
      amount: 30000,
      orderName: "프로 가위",
      buyerName: "구매자",
      buyerPhone: "01012345678",
      shippingAddress: "서울시 강남구",
      itemsSnapshot: [{ productId: "product-1", sellerId: "seller-1", price: 30000, quantity: 1 }],
      userId: "user-1",
      order: null,
    };

    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_checkout");
    vi.stubGlobal("fetch", fetchMock);
    mockGetUser.mockResolvedValue(noUser());
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
    mockPrisma.payment.findUnique
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(payment);
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.create.mockResolvedValue({
      id: "order-1",
      items: [{ id: "item-1", productId: "product-1", price: 30000, quantity: 1 }],
    });
    mockPrisma.settlement.upsert.mockResolvedValue({});
    mockPrisma.payment.update.mockResolvedValue({});

    const result = await confirmCheckout({
      paymentKey: "payment-key-1",
      providerOrderId: "ms-order-1",
      amount: 30000,
    });

    expect(result).toEqual({ success: true, orderId: "order-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tosspayments.com/v1/payments/confirm",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          paymentKey: "payment-key-1",
          orderId: "ms-order-1",
          amount: 30000,
        }),
      })
    );
    expect(mockPrisma.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-1",
        total: 30000,
        status: "결제완료",
      }),
    }));
  });

  it("토스 웹훅 금액이 서버 결제 세션과 다르면 거부한다", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      providerOrderId: "ms-order-1",
      status: "READY",
      amount: 30000,
      paymentKey: null,
      userId: "user-1",
      order: null,
    });

    await expect(handleTossPaymentWebhook({
      eventType: "PAYMENT_STATUS_CHANGED",
      data: {
        orderId: "ms-order-1",
        paymentKey: "payment-key-1",
        status: "DONE",
        totalAmount: 29000,
      },
    })).rejects.toThrow("결제 금액");
  });

  it("토스 취소 웹훅은 PAID 결제를 취소 상태로 반영한다", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      providerOrderId: "ms-order-1",
      status: "PAID",
      amount: 30000,
      paymentKey: "payment-key-1",
      userId: "user-1",
      order: { id: "order-1" },
    });
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    const result = await handleTossPaymentWebhook({
      eventType: "CANCEL_STATUS_CHANGED",
      data: {
        orderId: "ms-order-1",
        paymentKey: "payment-key-1",
        status: "CANCELED",
        totalAmount: 30000,
        message: "관리자 환불",
      },
    });

    expect(result).toEqual({ success: true, action: "canceled", status: "CANCELED" });
    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: { in: ["READY", "PAID"] } },
      data: expect.objectContaining({
        status: "CANCELED",
        failureCode: "CANCELED",
        failureMessage: "관리자 환불",
      }),
    });
  });

  it("지원하지 않는 토스 웹훅 이벤트는 무시한다", async () => {
    const result = await handleTossPaymentWebhook({
      eventType: "PAYOUT_STATUS_CHANGED",
      data: { orderId: "ms-order-1", status: "DONE" },
    });

    expect(result).toEqual({ success: true, ignored: true, reason: "unsupported_event" });
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
  });
});

describe("shipping profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("게스트는 기본 배송지를 반환하지 않는다", async () => {
    mockGetUser.mockResolvedValue(noUser());

    const result = await getMyShippingProfile();

    expect(result).toBeNull();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("로그인 사용자의 저장된 기본 배송지를 조회한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1", "buyer@example.com"));
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "기존 이름",
      phone: "01000000000",
      defaultShippingName: "수령인",
      defaultShippingPhone: "01012345678",
      defaultShippingAddress: "서울시 강남구",
      defaultShippingAddressDetail: "101동 202호",
    });

    const result = await getMyShippingProfile();

    expect(result).toEqual({
      name: "수령인",
      phone: "01012345678",
      address: "서울시 강남구",
      addressDetail: "101동 202호",
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        name: true,
        phone: true,
        defaultShippingName: true,
        defaultShippingPhone: true,
        defaultShippingAddress: true,
        defaultShippingAddressDetail: true,
      },
    });
  });

  it("저장된 수령인 정보가 없으면 회원 이름과 연락처를 기본값으로 사용한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1", "buyer@example.com", { name: "가입자", phone: "01099998888" }));
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "가입자",
      phone: "01099998888",
      defaultShippingName: null,
      defaultShippingPhone: null,
      defaultShippingAddress: null,
      defaultShippingAddressDetail: null,
    });

    const result = await getMyShippingProfile();

    expect(result).toEqual({
      name: "가입자",
      phone: "01099998888",
      address: "",
      addressDetail: "",
    });
  });

  it("기본 배송지를 user upsert 로 저장한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1", "buyer@example.com"));
    mockPrisma.user.upsert.mockResolvedValue({
      name: "구매자",
      phone: "01012345678",
      defaultShippingName: "구매자",
      defaultShippingPhone: "01012345678",
      defaultShippingAddress: "서울시 강남구",
      defaultShippingAddressDetail: "101동 202호",
    });

    const result = await updateMyShippingProfile({
      name: "구매자",
      phone: "01012345678",
      address: "서울시 강남구",
      addressDetail: "101동 202호",
    });

    expect(result).toEqual({
      success: true,
      profile: {
        name: "구매자",
        phone: "01012345678",
        address: "서울시 강남구",
        addressDetail: "101동 202호",
      },
    });
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        update: {
          defaultShippingName: "구매자",
          defaultShippingPhone: "01012345678",
          defaultShippingAddress: "서울시 강남구",
          defaultShippingAddressDetail: "101동 202호",
        },
        create: expect.objectContaining({
          id: "user-1",
          email: "buyer@example.com",
          phone: "01012345678",
          role: "BUYER",
        }),
      })
    );
  });

  it("기본 배송지 저장은 로그인이 필요하다", async () => {
    mockGetUser.mockResolvedValue(noUser());

    await expect(updateMyShippingProfile({
      name: "구매자",
      phone: "01012345678",
      address: "서울시 강남구",
      addressDetail: "101동 202호",
    })).rejects.toThrow("로그인이 필요합니다.");
  });
});

describe("account summary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("게스트는 계정 요약을 반환하지 않는다", async () => {
    mockGetUser.mockResolvedValue(noUser());

    const result = await getMyAccountSummary();

    expect(result).toBeNull();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("로그인 사용자의 역할과 판매자 연결 상태를 반환한다", async () => {
    const createdAt = new Date("2026-06-20T00:00:00.000Z");
    mockGetUser.mockResolvedValue(authedUser("user-1", "seller@example.com", { name: "판매자" }));
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "seller@example.com",
      name: "판매자",
      phone: "01012345678",
      role: "SELLER",
      createdAt,
      seller: {
        id: "steelgrain",
        name: "STEEL & GRAIN",
        verified: true,
        isActive: true,
        kycStatus: "APPROVED",
        productsCount: 3,
      },
    });

    const result = await getMyAccountSummary();

    expect(result).toEqual({
      email: "seller@example.com",
      name: "판매자",
      phone: "01012345678",
      role: "SELLER",
      isAdmin: false,
      isSeller: true,
      joinedAt: "2026. 6. 20.",
      seller: {
        id: "steelgrain",
        name: "STEEL & GRAIN",
        verified: true,
        isActive: true,
        kycStatus: "APPROVED",
        productsCount: 3,
      },
    });
  });
});

describe("signup phone verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PHONE_VERIFICATION_SECRET = "test-phone-secret";
    process.env.NAVER_SENS_SERVICE_ID = "";
    process.env.NAVER_SENS_ACCESS_KEY = "";
    process.env.NAVER_SENS_SECRET_KEY = "";
    process.env.NAVER_SENS_SMS_FROM = "";
  });

  it("회원가입 휴대폰 인증번호를 생성하고 개발용 코드를 반환한다", async () => {
    mockPrisma.phoneVerification.findFirst.mockResolvedValue(null);
    mockPrisma.phoneVerification.create.mockResolvedValue({ id: "verification-1" });

    const result = await requestSignupPhoneVerification({ phone: "010-1234-5678" });

    expect(result.success).toBe(true);
    expect(result.phone).toBe("01012345678");
    expect(result.debugCode).toMatch(/^\d{6}$/);
    expect(mockPrisma.phoneVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: "01012345678",
        purpose: "SIGNUP",
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("인증번호가 맞으면 인증 완료 처리한다", async () => {
    mockPrisma.phoneVerification.findFirst.mockResolvedValueOnce(null);
    mockPrisma.phoneVerification.create.mockImplementation(async ({ data }) => ({ id: "verification-1", ...data }));

    const request = await requestSignupPhoneVerification({ phone: "01012345678" });
    const created = mockPrisma.phoneVerification.create.mock.calls[0][0].data;

    mockPrisma.phoneVerification.findFirst.mockResolvedValueOnce({
      id: "verification-1",
      phone: "01012345678",
      purpose: "SIGNUP",
      codeHash: created.codeHash,
      attempts: 0,
      expiresAt: created.expiresAt,
    });
    mockPrisma.phoneVerification.update.mockResolvedValue({});

    const result = await verifySignupPhoneCode({ phone: "01012345678", code: request.debugCode });

    expect(result).toEqual({ success: true, phone: "01012345678" });
    expect(mockPrisma.phoneVerification.update).toHaveBeenCalledWith({
      where: { id: "verification-1" },
      data: { verifiedAt: expect.any(Date) },
    });
  });

  it("휴대폰 인증이 완료된 경우에만 구매자 회원가입을 완료한다", async () => {
    mockPrisma.phoneVerification.findFirst.mockResolvedValue({
      id: "verification-1",
      phone: "01012345678",
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: "new-user", email: "buyer@example.com" },
        session: null,
      },
      error: null,
    });
    mockPrisma.user.upsert.mockResolvedValue({ id: "new-user" });
    mockPrisma.termsVersion.findFirst.mockImplementation(async ({ where }) => ({ id: `${where.type}-v1` }));
    mockPrisma.consentRecord.upsert.mockResolvedValue({});
    mockPrisma.phoneVerification.update.mockResolvedValue({});

    const result = await registerBuyer({
      name: "구매자",
      phone: "010-1234-5678",
      email: "buyer@example.com",
      password: "password1",
      consentedTypes: ["USER_TERMS", "PRIVACY_POLICY"],
    });

    expect(result.success).toBe(true);
    expect(result.emailConfirmationRequired).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: "password1",
      options: { data: { name: "구매자", phone: "01012345678" } },
    });
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "new-user" },
      update: {
        email: "buyer@example.com",
        name: "구매자",
        phone: "01012345678",
      },
      create: {
        id: "new-user",
        email: "buyer@example.com",
        name: "구매자",
        phone: "01012345678",
        role: "BUYER",
      },
    });
    expect(mockPrisma.phoneVerification.update).toHaveBeenCalledWith({
      where: { id: "verification-1" },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it("휴대폰 인증 없이는 회원가입을 막는다", async () => {
    mockPrisma.phoneVerification.findFirst.mockResolvedValue(null);

    await expect(registerBuyer({
      name: "구매자",
      phone: "01012345678",
      email: "buyer@example.com",
      password: "password1",
      consentedTypes: ["USER_TERMS", "PRIVACY_POLICY"],
    })).rejects.toThrow("휴대폰 인증을 완료해 주세요.");
  });
});

describe("syncUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("회원가입 메타데이터의 이름과 연락처를 User 테이블에 동기화한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("user-1", "buyer@example.com"));
    mockPrisma.user.upsert.mockResolvedValue({ id: "user-1", email: "buyer@example.com", name: "가입자", phone: "01099998888" });

    const result = await syncUser({ name: "가입자", phone: "01099998888" });

    expect(result.success).toBe(true);
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-1" },
      update: {
        name: "가입자",
        phone: "01099998888",
      },
      create: {
        id: "user-1",
        email: "buyer@example.com",
        name: "가입자",
        phone: "01099998888",
        role: "BUYER",
      },
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateAdminProductReview
// ══════════════════════════════════════════════════════════════════════════
describe("updateAdminProductReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockReset();
  });

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(updateAdminProductReview({ productId: "product-1", reviewStatus: "APPROVED" }))
      .rejects.toThrow("로그인이 필요합니다.");
  });

  it("관리자가 아니면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", role: "SELLER", email: "seller@example.com" });

    await expect(updateAdminProductReview({ productId: "product-1", reviewStatus: "APPROVED" }))
      .rejects.toThrow("관리자 권한이 필요합니다.");
  });

  it("관리자는 상품 검수 상태를 변경하고 감사 로그를 남긴다", async () => {
    mockGetUser.mockResolvedValue(authedUser("admin-1", "admin@example.com"));
    mockPrisma.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@example.com" });
    mockPrisma.product.findUnique.mockResolvedValue({ sellerId: "seller-1" });
    mockPrisma.product.update.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      name: "검수 상품",
      price: 10000,
      cat: "가위",
      icon: "scissors",
      tone: "tone-a",
      badge: null,
      disc: null,
      orig: null,
      rating: 4.8,
      reviews: 0,
      likesCount: 0,
      images: ["/product-images/scissors.svg"],
      spec: [],
      desc: "검수 대상 상품",
      isActive: true,
      reviewStatus: "APPROVED",
    });
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

    const result = await updateAdminProductReview({ productId: "product-1", reviewStatus: "APPROVED", isActive: true });

    expect(result.success).toBe(true);
    expect(result.product.reviewStatus).toBe("APPROVED");
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-1" },
        data: expect.objectContaining({
          reviewStatus: "APPROVED",
          isActive: true,
          deletedAt: null,
          reviewedBy: "admin-1",
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin-1",
          action: "ADMIN_UPDATE_PRODUCT_REVIEW",
          targetTable: "Product",
          targetId: "product-1",
        }),
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateAdminOrderStatus / updateAdminSettlementStatus
// ══════════════════════════════════════════════════════════════════════════
describe("admin settlement operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
    mockGetUser.mockResolvedValue(authedUser("admin-1", "admin@example.com"));
    mockPrisma.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@example.com" });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("주문을 구매확정으로 바꾸면 대기 정산을 지급 대기로 확정한다", async () => {
    mockPrisma.order.update.mockResolvedValue({ id: "order-1", status: "구매확정", items: [{ id: "item-1" }] });
    mockPrisma.settlement.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateAdminOrderStatus({ orderId: "order-1", status: "구매확정" });

    expect(result).toEqual({
      success: true,
      order: { id: "order-1", status: "구매확정" },
      settlementsUpdated: 1,
    });
    expect(mockPrisma.settlement.updateMany).toHaveBeenCalledWith({
      where: { orderItemId: { in: ["item-1"] }, status: "PENDING" },
      data: { status: "CONFIRMED", settledAt: null },
    });
  });

  it("주문을 환불완료로 바꾸면 미지급 정산을 제외 처리한다", async () => {
    mockPrisma.order.update.mockResolvedValue({ id: "order-1", status: "환불완료", items: [{ id: "item-1" }] });
    mockPrisma.settlement.updateMany.mockResolvedValue({ count: 1 });

    await updateAdminOrderStatus({ orderId: "order-1", status: "환불완료" });

    expect(mockPrisma.settlement.updateMany).toHaveBeenCalledWith({
      where: { orderItemId: { in: ["item-1"] }, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELED", settledAt: null },
    });
  });

  it("확정된 정산은 지급 완료 처리하고 감사 로그를 남긴다", async () => {
    const paidAt = new Date("2026-06-19T00:00:00.000Z");
    mockPrisma.settlement.findUnique.mockResolvedValue({
      id: "settlement-1",
      status: "CONFIRMED",
      settledAt: null,
      orderItem: { order: { id: "order-1", status: "구매확정" } },
    });
    mockPrisma.settlement.update.mockResolvedValue({ id: "settlement-1", status: "PAID", settledAt: paidAt });

    const result = await updateAdminSettlementStatus({ settlementId: "settlement-1", status: "PAID" });

    expect(result.success).toBe(true);
    expect(result.settlement.status).toBe("PAID");
    expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "settlement-1" },
        data: expect.objectContaining({ status: "PAID", settledAt: expect.any(Date) }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin-1",
          action: "ADMIN_UPDATE_SETTLEMENT_STATUS",
          targetTable: "Settlement",
          targetId: "settlement-1",
        }),
      })
    );
  });

  it("구매확정 전 정산은 바로 지급 완료 처리할 수 없다", async () => {
    mockPrisma.settlement.findUnique.mockResolvedValue({
      id: "settlement-1",
      status: "PENDING",
      settledAt: null,
      orderItem: { order: { id: "order-1", status: "배송중" } },
    });

    await expect(updateAdminSettlementStatus({ settlementId: "settlement-1", status: "PAID" }))
      .rejects.toThrow("구매확정으로 확정된 정산만 지급 완료 처리할 수 있습니다.");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// admin refund / inquiry operations
// ══════════════════════════════════════════════════════════════════════════
describe("admin support operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
    mockGetUser.mockResolvedValue(authedUser("admin-1", "admin@example.com"));
    mockPrisma.user.findUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN", email: "admin@example.com" });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("관리자 대시보드는 환불 요청 구매자 정보를 주문의 구매자 관계로 불러온다", async () => {
    mockPrisma.seller.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.refundRequest.findMany.mockResolvedValue([
      {
        id: "refund-1",
        orderId: "order-1",
        userId: "buyer-1",
        reason: "CHANGE_OF_MIND",
        reasonDetail: "단순 변심",
        status: "REQUESTED",
        refundAmount: 30000,
        requestedAt: new Date("2026-06-19T00:00:00.000Z"),
        order: {
          id: "order-1",
          status: "결제완료",
          total: 30000,
          name: "구매자 테스트",
          user: { email: "buyer@example.com", name: "구매자 테스트" },
        },
      },
    ]);
    mockPrisma.settlement.findMany.mockResolvedValue([]);
    mockPrisma.csInquiry.findMany.mockResolvedValue([]);

    const result = await getAdminDashboard();

    expect(result.status).toBe("admin");
    expect(result.refunds[0]).toMatchObject({
      id: "refund-1",
      buyer: "buyer@example.com",
      orderStatus: "결제완료",
      orderTotal: 30000,
    });
    expect(mockPrisma.refundRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ user: expect.anything() }),
      })
    );
    expect(mockPrisma.refundRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          order: expect.objectContaining({
            select: expect.objectContaining({
              user: { select: { email: true, name: true } },
            }),
          }),
        }),
      })
    );
  });

  it("환불 완료 처리 시 주문을 환불완료로 바꾸고 미지급 정산을 제외한다", async () => {
    const resolvedAt = new Date("2026-06-19T00:00:00.000Z");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "CANCELED",
        paymentKey: "payment-key-1",
        cancels: [{ cancelAmount: 30000, cancelReason: "관리자 환불 처리" }],
      }),
    });
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_refund");
    vi.stubGlobal("fetch", fetchMock);
    mockPrisma.refundRequest.findUnique.mockResolvedValue({
      id: "refund-1",
      status: "APPROVED",
      refundAmount: null,
      order: {
        id: "order-1",
        status: "반품",
        total: 30000,
        items: [{ id: "item-1" }],
        payment: {
          id: "payment-1",
          status: "PAID",
          amount: 30000,
          paymentKey: "payment-key-1",
          rawResponse: { status: "DONE" },
        },
      },
    });
    mockPrisma.refundRequest.update.mockResolvedValue({
      id: "refund-1",
      status: "COMPLETED",
      refundAmount: 30000,
      resolvedAt,
    });
    mockPrisma.order.update.mockResolvedValue({});
    mockPrisma.payment.update.mockResolvedValue({});
    mockPrisma.settlement.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateAdminRefundStatus({ refundId: "refund-1", status: "COMPLETED" });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tosspayments.com/v1/payments/payment-key-1/cancel",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "application/json",
          "Idempotency-Key": "refund-refund-1-30000",
        }),
        body: JSON.stringify({
          cancelReason: "관리자 환불 처리 (refund-1)",
          cancelAmount: 30000,
        }),
      })
    );
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "환불완료" },
    });
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        status: "CANCELED",
        failureCode: "ADMIN_REFUND",
        rawResponse: expect.objectContaining({
          status: "DONE",
          refundCancelResponse: expect.objectContaining({ status: "CANCELED" }),
        }),
      }),
    });
    expect(mockPrisma.settlement.updateMany).toHaveBeenCalledWith({
      where: { orderItemId: { in: ["item-1"] }, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELED", settledAt: null },
    });
  });

  it("문의 답변을 저장하고 상태를 종료한다", async () => {
    const closedAt = new Date("2026-06-19T00:00:00.000Z");
    mockPrisma.csInquiry.findUnique.mockResolvedValue({ id: "inquiry-1", status: "OPEN" });
    mockPrisma.csReply.create.mockResolvedValue({});
    mockPrisma.csInquiry.update.mockResolvedValue({ id: "inquiry-1", status: "CLOSED", closedAt });

    const result = await updateAdminInquiry({ inquiryId: "inquiry-1", status: "CLOSED", reply: "확인 후 처리했습니다." });

    expect(result.success).toBe(true);
    expect(mockPrisma.csReply.create).toHaveBeenCalledWith({
      data: {
        inquiryId: "inquiry-1",
        responderId: "admin-1",
        content: "확인 후 처리했습니다.",
      },
    });
    expect(mockPrisma.csInquiry.update).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: expect.objectContaining({ status: "CLOSED", closedAt: expect.any(Date) }),
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// toggleFollow
// ══════════════════════════════════════════════════════════════════════════
describe("toggleFollow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(toggleFollow("seller-1")).rejects.toThrow("로그인이 필요합니다.");
  });

  it("빈 sellerId 는 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(toggleFollow("")).rejects.toThrow("올바르지 않은 셀러 ID입니다.");
  });

  it("팔로우가 없으면 추가하고 { followed: true } 를 반환한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.follow.findUnique.mockResolvedValue(null);
    mockPrisma.follow.create.mockResolvedValue({});

    const result = await toggleFollow("seller-1");
    expect(result).toEqual({ followed: true });
  });

  it("팔로우가 이미 있으면 삭제하고 { followed: false } 를 반환한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.follow.findUnique.mockResolvedValue({ userId: "user-1", sellerId: "seller-1" });
    mockPrisma.follow.delete.mockResolvedValue({});

    const result = await toggleFollow("seller-1");
    expect(result).toEqual({ followed: false });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// createSeller
// ══════════════════════════════════════════════════════════════════════════
describe("createSeller — 입력 검증", () => {
  beforeEach(() => vi.clearAllMocks());

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(createSeller({ sellerId: "abc", name: "테스트", category: "도구" }))
      .rejects.toThrow("로그인이 필요합니다.");
  });

  it("sellerId 가 영문 소문자/숫자가 아니면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "AB!CD", name: "브랜드", category: "도구" }))
      .rejects.toThrow("셀러 ID는 3자 이상 20자 이하의 영문 소문자와 숫자만 사용할 수 있습니다.");
  });

  it("sellerId 가 2자 이하면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "ab", name: "브랜드", category: "도구" }))
      .rejects.toThrow("셀러 ID는 3자 이상 20자 이하의 영문 소문자와 숫자만 사용할 수 있습니다.");
  });

  it("sellerId 가 21자 이상이면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "a".repeat(21), name: "브랜드", category: "도구" }))
      .rejects.toThrow("셀러 ID는 3자 이상 20자 이하의 영문 소문자와 숫자만 사용할 수 있습니다.");
  });

  it("브랜드 이름이 비어 있으면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "validid", name: "", category: "도구" }))
      .rejects.toThrow("브랜드 이름은 필수 입력 항목입니다.");
  });

  it("브랜드 이름이 51자 이상이면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "validid", name: "가".repeat(51), category: "도구" }))
      .rejects.toThrow("브랜드 이름은 50자 이하여야 합니다.");
  });

  it("카테고리가 비어 있으면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({ sellerId: "validid", name: "브랜드", category: "" }))
      .rejects.toThrow("카테고리는 필수 입력 항목입니다.");
  });

  it("firstProduct.name 이 비어 있으면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({
      sellerId: "validid", name: "브랜드", category: "도구",
      firstProduct: { name: "", price: 10000, desc: "설명", material: "스틸", origin: "대한민국", size: "6인치", care: "건조 보관", kcStatus: "해당 없음" },
    })).rejects.toThrow("상품명은 필수입니다.");
  });

  it("firstProduct.price 가 0 이하면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({
      sellerId: "validid", name: "브랜드", category: "도구",
      firstProduct: { name: "상품명", price: 0, desc: "설명", material: "스틸", origin: "대한민국", size: "6인치", care: "건조 보관", kcStatus: "해당 없음" },
    })).rejects.toThrow("가격은 0보다 커야 합니다.");
  });
});

describe("createSeller — 성공 케이스", () => {
  beforeEach(() => vi.clearAllMocks());

  const validInput = {
    sellerId: "mybrand",
    name: "마이 브랜드",
    desc: "설명",
    category: "도구",
    story: "스토리",
    notice: null,
    firstProduct: null,
  };

  it("기존 유저가 없으면 user.create 를 호출한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: "user-1" });
    mockPrisma.$transaction.mockResolvedValue({ seller: { id: "mybrand" }, product: null });

    const result = await createSeller(validInput);
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("기존 유저가 있으면 role 을 SELLER 로 업데이트한다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", role: "BUYER" });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue({ seller: { id: "mybrand" }, product: null });

    await createSeller(validInput);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "SELLER" } })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// createSellerProduct
// ══════════════════════════════════════════════════════════════════════════
describe("createSellerProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockReset();
  });

  const validInput = {
    name: "테스트 커팅 시저",
    category: "가위",
    price: 129000,
    desc: "현장 테스트용 커팅 시저입니다.",
    material: "440C 스테인리스",
    origin: "대한민국",
    size: "6.0 inch",
    care: "사용 후 마른 천으로 닦아 보관하세요.",
    kcStatus: "해당 없음",
  };

  it("미로그인 시 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(noUser());
    await expect(createSellerProduct(validInput)).rejects.toThrow("로그인이 필요합니다.");
  });

  it("판매자 계정이 없으면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.seller.findUnique.mockResolvedValue(null);
    await expect(createSellerProduct(validInput)).rejects.toThrow("판매자 계정이 없습니다.");
  });

  it("필수 상품 정보가 없으면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.seller.findUnique.mockResolvedValue({ id: "seller-1", name: "셀러", tone: "tone-a" });
    await expect(createSellerProduct({ ...validInput, material: "" })).rejects.toThrow("소재는 필수입니다.");
  });

  it("로그인 판매자의 상품을 생성하고 상품 수를 갱신한다", async () => {
    const inputWithImage = { ...validInput, imageUrl: "/product-images/scissors.svg" };
    mockGetUser.mockResolvedValue(authedUser());
    mockPrisma.seller.findUnique.mockResolvedValue({ id: "seller-1", name: "셀러", tone: "tone-b" });
    mockPrisma.product.create.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      name: validInput.name,
      price: validInput.price,
      cat: validInput.category,
      icon: "scissors",
      tone: "tone-b",
      badge: "new",
      disc: null,
      orig: null,
      rating: 4.8,
      reviews: 0,
      likesCount: 0,
      images: [inputWithImage.imageUrl],
      spec: [],
      desc: validInput.desc,
    });
    mockPrisma.product.count.mockResolvedValue(3);
    mockPrisma.seller.update.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));

    const result = await createSellerProduct(inputWithImage);

    expect(result.success).toBe(true);
    expect(result.product.images).toEqual([inputWithImage.imageUrl]);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sellerId: "seller-1",
          name: validInput.name,
          cat: validInput.category,
          icon: "scissors",
          badge: "new",
          images: [inputWithImage.imageUrl],
        }),
      })
    );
    expect(mockPrisma.seller.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { productsCount: 3 } })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════
// updateSellerProductDetail
// ══════════════════════════════════════════════════════════════════════════
describe("updateSellerProductDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("판매자 상세 이미지 URL을 spec에 정규화해서 저장한다", async () => {
    mockGetUser.mockResolvedValue(authedUser("seller-user-1"));
    mockPrisma.seller.findUnique.mockResolvedValue({ id: "seller-1", name: "셀러" });
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1", sellerId: "seller-1" });
    mockPrisma.product.update.mockResolvedValue({
      id: "product-1",
      sellerId: "seller-1",
      name: "상세 이미지 상품",
      price: 20000,
      cat: "가위",
      icon: "scissors",
      tone: "tone-a",
      badge: "new",
      disc: null,
      orig: null,
      rating: 4.8,
      reviews: 0,
      likesCount: 0,
      images: ["/product-images/main.svg"],
      spec: [],
      desc: "상세 이미지 테스트 상품입니다.",
      isActive: true,
      reviewStatus: "PENDING",
    });

    const result = await updateSellerProductDetail({
      productId: "product-1",
      name: "상세 이미지 상품",
      price: 20000,
      desc: "상세 이미지 테스트 상품입니다.",
      imageUrl: "/product-images/main.svg",
      spec: [
        ["소재", "440C"],
        ["상세 이미지", "/product-images/detail-1.jpg\nhttps://example.com/detail-2.webp\n/product-images/detail-1.jpg"],
      ],
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: expect.objectContaining({
        spec: [
          ["소재", "440C"],
          ["상세 이미지", "/product-images/detail-1.jpg\nhttps://example.com/detail-2.webp"],
        ],
      }),
    });
  });
});
