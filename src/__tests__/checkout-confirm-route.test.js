import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockConfirmReadyTossPayment } = vi.hoisted(() => ({
  mockConfirmReadyTossPayment: vi.fn(),
}));

vi.mock("@/server/services/payment-service", () => ({
  confirmReadyTossPayment: mockConfirmReadyTossPayment,
}));

const { GET } = await import("../app/checkout/confirm/route.js");

describe("checkout confirm route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmReadyTossPayment.mockResolvedValue({ success: true, orderId: "order-1" });
  });

  it("토스 성공 redirect를 서버에서 승인한 뒤 표시 전용 성공 페이지로 이동시킨다", async () => {
    const response = await GET(new Request("https://before-you-cut.vercel.app/checkout/confirm?orderId=ms-order-1&paymentKey=payment-key-1&amount=30000"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://before-you-cut.vercel.app/checkout/success?orderId=order-1");
    expect(mockConfirmReadyTossPayment).toHaveBeenCalledWith({
      paymentKey: "payment-key-1",
      providerOrderId: "ms-order-1",
      amount: "30000",
    });
  });

  it("승인 실패 시 success 화면의 실패 상태로 이동시킨다", async () => {
    mockConfirmReadyTossPayment.mockRejectedValue(new Error("결제 금액이 서버에 저장된 금액과 일치하지 않습니다."));

    const response = await GET(new Request("https://before-you-cut.vercel.app/checkout/confirm?orderId=ms-order-1&paymentKey=payment-key-1&amount=29000"));
    const location = new URL(response.headers.get("location"));

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/checkout/success");
    expect(location.searchParams.get("status")).toBe("error");
    expect(location.searchParams.get("message")).toBe("결제 금액이 서버에 저장된 금액과 일치하지 않습니다.");
  });
});
