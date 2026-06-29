import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("role-specific UI contracts", () => {
  it("seller center keeps next action and role quick links", () => {
    const source = readSource("src/components/screens/seller-dashboard.js");

    expect(source).toContain("getSellerNextTask");
    expect(source).toContain("NEXT ACTION");
    expect(source).toContain("상품 등록/수정");
    expect(source).toContain("운영 정보");
    expect(source).toContain("주문·정산");
    expect(source).toContain("seller-products");
    expect(source).toContain("seller-compliance");
    expect(source).toContain("seller-orders");
  });

  it("admin console keeps operating runbook and risk summary", () => {
    const source = readSource("src/components/screens/admin-dashboard.js");

    expect(source).toContain("오늘 처리 기준");
    expect(source).toContain("RunbookStep");
    expect(source).toContain("RiskChip");
    expect(source).toContain("상품 노출 전 검수");
    expect(source).toContain("입점/KYC 검토");
    expect(source).toContain("열린 환불 요청");
    expect(source).toContain("열린 고객 문의");
  });

  it("my page keeps buyer stats separate from role switching", () => {
    const pageSource = readSource("src/app/my/page.js");
    const screenSource = readSource("src/components/screens/other.js");

    expect(pageSource).toContain("getMyAccountSummary");
    expect(screenSource).toContain("ROLE HUB");
    expect(screenSource).toContain("역할별 화면");
    expect(screenSource).toContain("구매자");
    expect(screenSource).toContain("판매자 입점");
    expect(screenSource).toContain("관리자 콘솔");
    expect(screenSource).toContain("배송지");
  });

  it("order detail keeps role-specific buyer seller admin framing", () => {
    const source = readSource("src/components/screens/order-detail.js");

    expect(source).toContain("getOrderRoleCopy");
    expect(source).toContain("getOrderRoleTasks");
    expect(source).toContain("BUYER ORDER");
    expect(source).toContain("SELLER ORDER");
    expect(source).toContain("ADMIN ORDER");
    expect(source).toContain("판매 주문 처리");
    expect(source).toContain("운영 주문 검토");
    expect(source).toContain("환불 리스크");
  });

  it("product detail keeps buyer-facing detail content aligned with seller composer", () => {
    const buyerSource = readSource("src/components/screens/other.js");
    const sellerSource = readSource("src/components/screens/seller-dashboard.js");
    const detailSource = readSource("src/utils/product-detail.js");

    expect(buyerSource).toContain("상품 상세 내용");
    expect(buyerSource).toContain("detailNarrativeSections");
    expect(buyerSource).toContain("pd-detail-content");
    expect(sellerSource).toContain("상세내용 완성도");
    expect(sellerSource).toContain("PRODUCT_DETAIL_FIELDS");
    expect(detailSource).toContain("배송 안내");
    expect(detailSource).toContain("교환/반품 안내");
    expect(detailSource).toContain("구매 전 확인사항");
  });

  it("category page keeps category and brand directory tabs", () => {
    const pageSource = readSource("src/app/category/page.js");
    const screenSource = readSource("src/components/screens/other.js");
    const cssSource = readSource("src/app/globals.css");

    expect(pageSource).toContain("getSellersMap");
    expect(pageSource).toContain("tab === \"brand\"");
    expect(screenSource).toContain("CATEGORY_DIRECTORY");
    expect(screenSource).toContain("category-directory");
    expect(screenSource).toContain("directory-tabs");
    expect(screenSource).toContain("directory-filterbar");
    expect(screenSource).toContain("카테고리");
    expect(screenSource).toContain("브랜드");
    expect(screenSource).toContain("염색·펌");
    expect(screenSource).toContain("샴푸·케어");
    expect(screenSource).toContain("brand-directory-grid");
    expect(cssSource).toContain(".directory-layout");
    expect(cssSource).toContain(".directory-rail");
    expect(cssSource).toContain(".category-directory");
  });
});
