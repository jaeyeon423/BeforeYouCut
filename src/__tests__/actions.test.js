import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn();
vi.mock("../utils/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } })
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
  product: { update: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  seller: { create: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("../utils/prisma", () => ({ prisma: mockPrisma, default: mockPrisma }));

// ── Import after mocks ─────────────────────────────────────────────────────
const { toggleLike, toggleFollow, createSeller } = await import("../app/actions.js");

// ── Helpers ────────────────────────────────────────────────────────────────
const authedUser = (id = "user-1", email = "test@example.com") =>
  ({ data: { user: { id, email, user_metadata: {} } } });
const noUser = () => ({ data: { user: null } });

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
      firstProduct: { name: "", price: 10000 },
    })).rejects.toThrow("첫 상품명은 필수 입력 항목입니다.");
  });

  it("firstProduct.price 가 0 이하면 에러를 던진다", async () => {
    mockGetUser.mockResolvedValue(authedUser());
    await expect(createSeller({
      sellerId: "validid", name: "브랜드", category: "도구",
      firstProduct: { name: "상품명", price: 0 },
    })).rejects.toThrow("올바르지 않은 상품 가격이 포함되어 있습니다.");
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
