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
});
