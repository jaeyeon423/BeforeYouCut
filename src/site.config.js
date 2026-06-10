/**
 * site.config.js — 공개 표시 정보 및 운영 설정 중앙 관리
 *
 * 규칙:
 *  - 운영자가 채워야 할 값: TODO(운영자 입력) 주석 표시
 *  - 비밀 키·API 키는 절대 이 파일에 두지 말 것 → .env 사용
 *  - 미확정 정책은 TODO(운영자 확정) 주석으로 표시
 */

const siteConfig = {
  // ── 사업자 정보 (전자상거래법·통신판매업 공시 의무) ──────────────────
  business: {
    name:           "주식회사 OOO",                          // TODO(운영자 입력): 상호
    ceo:            "홍길동",                                 // TODO(운영자 입력): 대표자명
    address:        "서울특별시 OO구 OO로 00",               // TODO(운영자 입력): 사업장 주소
    phone:          "02-0000-0000",                          // TODO(운영자 입력): 고객센터 전화번호
    email:          "help@beforeyoucut.com",                 // TODO(운영자 입력): 고객센터 이메일
    businessRegNo:  "000-00-00000",                          // TODO(운영자 입력): 사업자등록번호 (세무서 발급)
    mailOrderRegNo: "제0000-서울OO-0000호",                  // TODO(운영자 입력): 통신판매업 신고번호 (관할 지자체 신고)
    hostingLocation:"Amazon Web Services, 서울 리전 (ap-northeast-2)", // Supabase 인프라 기준 — 변경 시 업데이트
    privacyOfficer: {
      name:  "홍길동",                                        // TODO(운영자 입력): 개인정보보호책임자 성명
      email: "privacy@beforeyoucut.com",                    // TODO(운영자 입력): 개인정보보호책임자 이메일
    },
  },

  // ── 서비스 메타 ────────────────────────────────────────────────────
  service: {
    name:        "BEFORE YOU CUT",
    url:         "https://beforeyoucut.com",                 // TODO(운영자 입력): 실서비스 도메인
    description: "미용인을 위한 브랜드 마켓플레이스",
    // 전자상거래법 제20조 — 통신판매중개자 고지 의무
    intermediaryNotice:
      "BEFORE YOU CUT는 통신판매중개자로서 통신판매의 당사자가 아닙니다. " +
      "상품 주문·배송·환불 등 거래의 당사자는 각 판매자(입점 셀러)이며, " +
      "플랫폼은 해당 거래에 관한 의무와 책임을 부담하지 않습니다.",
  },

  // ── 수수료·정산 정책 ──────────────────────────────────────────────
  commission: {
    rate:                 0.05,  // TODO(운영자 입력): 수수료율 (예: 0.05 = 5%). 입점계약서 기준과 일치시킬 것
    settlementCycleDays:  7,     // TODO(운영자 입력): 정산 주기 (일 단위, 예: 7 = 주 1회)
    purchaseConfirmDays:  7,     // TODO(운영자 입력): 자동 구매확정 기간 (배송 완료 후 N일)
    settlementDelayDays:  2,     // TODO(운영자 입력): 구매확정 후 정산 보류일 (분쟁 대응 여유 기간)
    minWithdrawAmount:    10000, // TODO(운영자 입력): 최소 정산 금액 (원)
  },

  // ── 판매자 정책 ───────────────────────────────────────────────────
  seller: {
    // TODO(운영자 확정): 입점 허용 판매자 유형
    //   "BUSINESS"   — 사업자 등록 판매자만 입점
    //   "INDIVIDUAL" — 비사업자 개인만 입점
    //   "BOTH"       — 사업자·개인 모두 허용 (분기 처리 필요)
    allowedType:        "BOTH",
    requireBusinessReg: false,  // TODO(운영자 확정): 사업자등록 필수 여부
  },

  // ── 약관 버전 관리 ────────────────────────────────────────────────
  // 약관 내용 변경 시 반드시 version을 올리고 effectiveAt을 갱신할 것.
  // DB ConsentRecord는 version 기준으로 동의 이력을 추적함.
  terms: {
    userTerms:     { version: "1.0.0", effectiveAt: "2026-01-01" }, // TODO(운영자 입력): 시행일
    sellerTerms:   { version: "1.0.0", effectiveAt: "2026-01-01" }, // TODO(운영자 입력): 시행일
    privacyPolicy: { version: "1.0.0", effectiveAt: "2026-01-01" }, // TODO(운영자 입력): 시행일
    refundPolicy:  { version: "1.0.0", effectiveAt: "2026-01-01" }, // TODO(운영자 입력): 시행일
  },

  // ── 법정 기록 보존 기간 (전자상거래법 제6조) ──────────────────────
  retention: {
    orderRecordYears:    5, // 계약·청약철회 기록: 5년
    paymentRecordYears:  5, // 대금결제 및 공급 기록: 5년
    deliveryRecordYears: 3, // 재화 공급에 관한 기록: 3년
    complaintRecordYears:3, // 소비자 불만 처리 기록: 3년
  },
};

export default siteConfig;
