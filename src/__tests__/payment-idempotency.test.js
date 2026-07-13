import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    payment: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/utils/prisma", () => ({ prisma: mockPrisma }));

const { confirmReadyTossPayment } = await import("../server/services/payment-service.js");

describe("checkout confirmation idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the existing order without another Toss confirmation or order creation", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      providerOrderId: "checkout-1",
      status: "PAID",
      amount: 30000,
      userId: "buyer-1",
      order: { id: "order-1" },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await confirmReadyTossPayment({
      paymentKey: "payment-key",
      providerOrderId: "checkout-1",
      amount: 30000,
      authUserId: "buyer-1",
    });

    expect(result).toEqual({ success: true, orderId: "order-1", alreadyConfirmed: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
