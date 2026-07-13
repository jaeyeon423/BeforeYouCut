import { describe, expect, it } from "vitest";
import { formatApiProduct, formatApiSeller } from "../server/services/catalog-service.js";

describe("catalog API formatters", () => {
  const seller = {
    id: "seller-1",
    name: "프로살롱랩",
    verified: true,
    desc: "미용 전문가용 도구 브랜드",
    category: "헤어케어",
    followers: "1.2만",
    productsCount: 12,
    tone: "tone-a",
    businessName: "프로살롱랩",
    representative: "김대표",
    userId: "private-user-id",
    businessRegNo: "1234567890",
    businessDocumentUrl: "https://private.example/doc",
    businessDocumentPath: "seller-documents/private.pdf",
    kycStatus: "APPROVED",
    kycMemo: "private memo",
    isActive: true,
  };

  it("formats sellers for the buyer app without private seller/admin fields", () => {
    const formatted = formatApiSeller(seller);

    expect(formatted).toEqual({
      id: "seller-1",
      name: "프로살롱랩",
      verified: true,
      desc: "미용 전문가용 도구 브랜드",
      category: "헤어케어",
      followers: "1.2만",
      products: 12,
      productsCount: 12,
      tone: "tone-a",
      businessName: "프로살롱랩",
      representative: "김대표",
    });
    expect(formatted).not.toHaveProperty("userId");
    expect(formatted).not.toHaveProperty("businessRegNo");
    expect(formatted).not.toHaveProperty("businessDocumentUrl");
    expect(formatted).not.toHaveProperty("kycStatus");
  });

  it("formats products with Flutter-friendly aliases and parsed detail content", () => {
    const formatted = formatApiProduct({
      id: "product-1",
      sellerId: "seller-1",
      seller,
      name: "프로 드라이어",
      cat: "헤어케어",
      desc: "가벼운 전문가용 드라이어",
      price: 79000,
      orig: 99000,
      disc: 20,
      rating: 4.9,
      reviews: 18,
      likesCount: 42,
      images: [" /product.jpg ", { url: "https://example.com/detail.jpg" }],
      spec: [
        ["소비전력", "1500W"],
        ["상세 소개", "살롱 현장용으로 설계했습니다."],
        ["핵심 포인트", "가벼운 무게\n빠른 건조"],
      ],
      badge: "best",
      icon: "dryer",
      tone: "tone-b",
      isActive: true,
      reviewStatus: "APPROVED",
    });

    expect(formatted).toMatchObject({
      id: "product-1",
      sellerId: "seller-1",
      name: "프로 드라이어",
      cat: "헤어케어",
      category: "헤어케어",
      price: 79000,
      orig: 99000,
      originalPrice: 99000,
      disc: 20,
      discount: 20,
      likes: 42,
      specRows: [["소비전력", "1500W"]],
      details: {
        intro: "살롱 현장용으로 설계했습니다.",
        highlights: "가벼운 무게\n빠른 건조",
        usage: "",
        shipping: "",
        returns: "",
        notice: "",
      },
    });
    expect(formatted.images).toEqual(["/product.jpg", "https://example.com/detail.jpg"]);
    expect(formatted.seller).not.toHaveProperty("userId");
    expect(formatted).not.toHaveProperty("isActive");
    expect(formatted).not.toHaveProperty("reviewStatus");
  });
});
