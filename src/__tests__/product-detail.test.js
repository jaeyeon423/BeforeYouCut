import { describe, expect, it } from "vitest";
import {
  PRODUCT_DETAIL_IMAGE_FIELD,
  buildDetailValues,
  buildProductSpec,
  parseDetailImageUrls,
  parseProductSpec,
  serializeDetailImageUrls,
} from "../utils/product-detail.js";

describe("product detail helpers", () => {
  it("상세 이미지 URL 목록을 Product.spec 예약 필드로 왕복한다", () => {
    const spec = buildProductSpec(
      [["소재", "카본"]],
      {
        intro: "현장 테스트용 상품입니다.",
        detailImages: serializeDetailImageUrls([
          "/product-images/detail-1.jpg",
          "https://example.com/detail-2.webp",
          "/product-images/detail-1.jpg",
        ]),
      }
    );

    expect(spec).toContainEqual([PRODUCT_DETAIL_IMAGE_FIELD.key, "/product-images/detail-1.jpg\nhttps://example.com/detail-2.webp"]);

    const parsed = parseProductSpec(spec);
    const details = buildDetailValues(parsed.details);
    expect(parseDetailImageUrls(details.detailImages)).toEqual([
      "/product-images/detail-1.jpg",
      "https://example.com/detail-2.webp",
    ]);
  });
});
