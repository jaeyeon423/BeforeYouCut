import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockCreateClient, mockPrisma } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockPrisma: { user: { findFirst: vi.fn() } },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/utils/prisma", () => ({ prisma: mockPrisma }));

const { requireApiBuyer, requireApiUser } = await import("../server/http/api-auth.js");

describe("buyer API bearer authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    mockCreateClient.mockReturnValue({ auth: { getUser: mockGetUser } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without a bearer token with 401", async () => {
    await expect(requireApiUser(new Request("https://miyongsa.test/api/v1/me"))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer tokens with 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid jwt") });

    await expect(requireApiUser(new Request("https://miyongsa.test/api/v1/me", {
      headers: { Authorization: "Bearer invalid-token" },
    }))).rejects.toMatchObject({ code: "INVALID_TOKEN", status: 401 });
  });

  it("derives the buyer id from the verified token and DB mirror", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "token-user", email: "buyer@example.com", user_metadata: { name: "구매자" } } },
      error: null,
    });
    mockPrisma.user.findFirst.mockResolvedValue({ id: "token-user", role: "BUYER", email: "buyer@example.com" });

    const buyer = await requireApiBuyer(new Request("https://miyongsa.test/api/v1/me", {
      headers: { Authorization: "Bearer valid-token" },
    }));

    expect(buyer.id).toBe("token-user");
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "token-user", deletedAt: null },
    }));
  });
});
