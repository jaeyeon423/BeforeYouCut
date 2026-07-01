import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHandleTossPaymentWebhook } = vi.hoisted(() => ({
  mockHandleTossPaymentWebhook: vi.fn(),
}));

vi.mock("@/server/services/payment-service", () => ({
  handleTossPaymentWebhook: mockHandleTossPaymentWebhook,
}));

const { POST } = await import("../app/api/webhooks/toss/route.js");

describe("Toss webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleTossPaymentWebhook.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("운영 환경에서는 secret 없이 웹훅을 처리하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOSS_WEBHOOK_SECRET", "webhook-secret");

    const response = await POST(new Request("https://before-you-cut.vercel.app/api/webhooks/toss", {
      method: "POST",
      body: JSON.stringify({ eventType: "PAYMENT_STATUS_CHANGED" }),
    }));

    expect(response.status).toBe(401);
    expect(mockHandleTossPaymentWebhook).not.toHaveBeenCalled();
  });

  it("token secret이 일치하면 토스 웹훅 payload를 처리한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOSS_WEBHOOK_SECRET", "webhook-secret");

    const payload = {
      eventType: "CANCEL_STATUS_CHANGED",
      data: { orderId: "ms-order-1", status: "CANCELED" },
    };
    const response = await POST(new Request("https://before-you-cut.vercel.app/api/webhooks/toss?token=webhook-secret", {
      method: "POST",
      body: JSON.stringify(payload),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockHandleTossPaymentWebhook).toHaveBeenCalledWith(payload);
  });
});
