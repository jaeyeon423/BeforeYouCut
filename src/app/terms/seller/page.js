import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: `판매자(입점) 약관 — ${siteConfig.service.name}`,
};

function getAllowedSellerTypeText(type) {
  if (type === "BUSINESS") return "사업자 등록 판매자";
  if (type === "INDIVIDUAL") return "비사업자 개인 판매자";
  return "사업자 등록 판매자 및 비사업자 개인 판매자";
}

export default function SellerTermsPage() {
  const { version, effectiveAt } = siteConfig.terms.sellerTerms;
  const { business, service, seller, commission } = siteConfig;
  const commissionRate = `${Math.round(commission.rate * 1000) / 10}%`;
  const allowedSellerType = getAllowedSellerTypeText(seller.allowedType);

  return (
    <>
      <TabHeader title="판매자 약관" bordered />
      <TermsLayout title="판매자(입점) 약관" version={version} effectiveAt={effectiveAt}>
        <Section title="제1조 (목적)">
          이 약관은 {business.name}(이하 &quot;회사&quot;)과 {service.name} 서비스에 입점하는 판매자 사이의
          상품 등록, 판매, 배송, CS, 환불, 정산에 관한 권리·의무를 정합니다.
        </Section>

        <Section title="제2조 (입점 자격 및 판매자 유형)">
          <ol>
            <li>현재 서비스의 입점 허용 유형은 {allowedSellerType}입니다.</li>
            <li>사업자등록 필수 여부는 현재 {seller.requireBusinessReg ? "필수" : "필수 아님"}으로 설정되어 있습니다.</li>
            <li>회사는 입점 심사를 위해 사업자등록증, 통신판매업 신고증, 대표자·사업장 정보, 정산 계좌 정보를 요청할 수 있습니다.</li>
            <li>판매자는 자신이 판매하는 상품에 대한 적법한 판매 권한과 필요한 인증·표시 정보를 보유해야 합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (통신판매중개 구조)">
          <ol>
            <li>회사는 판매자와 구매자 사이의 거래를 중개하는 통신판매중개자입니다.</li>
            <li>판매자는 상품 정보, 표시·광고, 배송, 교환, 반품, 환불, 소비자 분쟁에 대한 1차 책임을 부담합니다.</li>
            <li>판매자는 전자상거래법, 표시광고법, 소비자기본법, 개인정보보호법, 지식재산권 관련 법령을 준수해야 합니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (상품 등록 및 상세정보)">
          <ol>
            <li>판매자는 상품명, 가격, 카테고리, 상품 설명, 소재, 제조국, 치수, 취급 주의, KC 인증 여부를 사실대로 등록해야 합니다.</li>
            <li>상품 이미지는 `product-images` 버킷 또는 회사가 허용하는 URL 방식으로 등록합니다.</li>
            <li>허위·과장 정보, 위조품, 법령상 판매 금지 상품, 타인의 권리를 침해하는 상품은 등록할 수 없습니다.</li>
            <li>관리자 검수에서 반려된 상품은 구매자에게 노출되지 않을 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (판매자 문서 및 정산 정보)">
          <ol>
            <li>판매자 서류는 비공개 `seller-documents` 버킷에 저장되며, 관리자와 해당 판매자만 필요한 범위에서 열람합니다.</li>
            <li>정산 계좌정보는 암호화 저장을 전제로 하며, 회사는 정산 및 세무·회계 처리 목적 범위에서만 사용합니다.</li>
            <li>판매자는 정산 계좌의 예금주, 은행, 계좌번호를 정확히 유지해야 하며, 오류로 인한 지연은 판매자 책임으로 처리될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (수수료 및 정산)">
          <ol>
            <li>현재 기본 판매 수수료율은 판매 금액의 {commissionRate}입니다. 입점 계약 또는 프로모션에 따라 별도 수수료가 적용될 수 있습니다.</li>
            <li>구매확정은 배송 완료 후 {commission.purchaseConfirmDays}일을 기준으로 자동 처리될 수 있습니다.</li>
            <li>정산은 구매확정 후 {commission.settlementDelayDays}일의 보류 기간을 거친 뒤, {commission.settlementCycleDays}일 주기로 처리하는 것을 기본 정책으로 합니다.</li>
            <li>최소 정산 가능 금액은 {commission.minWithdrawAmount.toLocaleString("ko-KR")}원입니다.</li>
            <li>환불, 취소, 분쟁, 법령상 보류 사유가 있는 거래는 정산에서 제외되거나 지급이 보류될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (배송·교환·반품·환불)">
          <ol>
            <li>판매자는 주문 확인 후 상품 상세페이지 또는 서비스 정책에 표시된 기간 내에 출고해야 합니다.</li>
            <li>단순 변심 반품의 왕복 배송비는 관련 법령과 상품 고지에 따라 구매자가 부담할 수 있습니다.</li>
            <li>상품 하자, 오배송, 표시 정보와 다른 상품 배송의 경우 판매자가 교환·반품·환불 비용을 부담합니다.</li>
            <li>관리자가 환불 완료로 승인한 주문은 토스페이먼츠 결제 취소 API를 통해 결제 취소가 처리될 수 있으며, 해당 주문의 미지급 정산은 취소됩니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (금지 행위)">
          <ol>
            <li>외부 결제 또는 직거래 유도</li>
            <li>허위 리뷰, 허위 주문, 검색 노출 조작</li>
            <li>상품 정보 허위 표시, 위조품 판매, 인증 정보 누락</li>
            <li>구매자 개인정보의 배송·CS 목적 외 이용</li>
            <li>세금 탈루 또는 법령 회피 목적의 서비스 이용</li>
          </ol>
        </Section>

        <Section title="제9조 (계정 제한 및 퇴점)">
          <ol>
            <li>회사는 판매자가 법령 또는 약관을 위반한 경우 상품 노출 제한, 판매 정지, 정산 보류, 계정 제한, 퇴점 조치를 할 수 있습니다.</li>
            <li>계정 제한 중 발생한 미정산 금액은 환불·분쟁·법령상 보류 사유가 해소된 뒤 처리합니다.</li>
          </ol>
        </Section>

        <Section title="부칙">
          이 약관은 {effectiveAt}부터 시행합니다.
        </Section>
      </TermsLayout>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>{title}</h3>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}
