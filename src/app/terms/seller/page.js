import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: "판매자(입점) 약관 — BEFORE YOU CUT",
};

export default function SellerTermsPage() {
  const { version, effectiveAt } = siteConfig.terms.sellerTerms;
  const { business } = siteConfig;

  return (
    <>
      <TabHeader title="판매자 약관" bordered />
      <TermsLayout title="판매자(입점) 약관" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래는 법무 검토 전 초안입니다. 시행 전 반드시 법률 전문가 검토를 받으십시오. */}

        <Section title="제1조 (목적)">
          이 약관은 {business.name}(이하 "회사")과 BEFORE YOU CUT 서비스에 입점하는 판매자(이하 "판매자") 간의
          서비스 이용 및 거래 처리에 관한 권리·의무를 규정합니다.
        </Section>

        <Section title="제2조 (판매자 유형 및 입점 자격)">
          {/* TODO(운영자 확정): seller.allowedType 정책 확정 후 아래 내용 업데이트 */}
          <ol>
            <li>서비스에 입점 가능한 판매자는 사업자 등록 여부에 따라 구분됩니다. 현재 입점 정책은 서비스 내 공지를 따릅니다.</li>
            <li>판매자는 자신이 판매하는 상품에 대한 적법한 판매 권한을 보유해야 합니다.</li>
            <li>미성년자의 경우 법정대리인의 동의가 필요합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (통신판매중개 구조 이해 및 동의)">
          <ol>
            <li>판매자는 회사가 통신판매중개자로서 판매자와 구매자 사이의 거래를 중개함을 이해하고 동의합니다.</li>
            <li>판매자는 구매자에게 상품 정보, 배송, 반품, 환불 등 거래 전반에 대한 책임을 부담합니다.</li>
            <li>판매자는 전자상거래법, 표시광고법, 소비자보호법 등 관련 법령을 준수해야 합니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (상품 등록 의무)">
          <ol>
            <li>판매자는 사실에 근거한 상품 정보를 등록해야 하며, 허위 정보 등록 시 즉시 삭제될 수 있습니다.</li>
            <li>다음 상품은 등록이 금지됩니다: 위조품, 법령에 의해 판매 금지된 상품, 타인의 지식재산권을 침해하는 상품.</li>
          </ol>
        </Section>

        <Section title="제5조 (수수료 및 정산)">
          {/* TODO(운영자 입력): commission.rate 등 확정 후 업데이트 */}
          <ol>
            <li>판매자는 판매 금액의 일정 비율을 수수료로 납부합니다. 수수료율은 서비스 정책 페이지에서 확인할 수 있습니다.</li>
            <li>정산은 구매자의 구매확정 또는 자동 구매확정 처리 후 서비스 정책에 따른 주기로 이루어집니다.</li>
            <li>정산은 판매자가 등록한 계좌로 지급됩니다. 판매자는 정확한 계좌 정보를 유지할 의무가 있습니다.</li>
            <li>PG 정산대행 구조를 채택하는 경우, 판매대금은 PG사를 통해 판매자에게 직접 지급될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (반품·환불 처리 의무)">
          <ol>
            <li>판매자는 전자상거래법 제17조에 따라 구매자의 적법한 청약철회 요청에 응해야 합니다.</li>
            <li>구매자가 상품 수령 후 7일 이내에 청약철회를 요청한 경우 판매자는 이에 응해야 합니다.</li>
            <li>상품 하자 또는 오배송의 경우 판매자는 교환 또는 환불 비용을 부담합니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (금지 행위)">
          <ol>
            <li>허위 리뷰 요청 또는 구매 유도 행위</li>
            <li>플랫폼 외부로의 직거래 유도</li>
            <li>타 판매자 또는 구매자에 대한 부당 행위</li>
            <li>세금 탈루 목적의 이용</li>
          </ol>
        </Section>

        <Section title="제8조 (판매자 계정 정지 및 퇴점)">
          <ol>
            <li>회사는 판매자가 이 약관을 위반한 경우 사전 통보 후 또는 긴급 시 즉시 계정을 정지할 수 있습니다.</li>
            <li>계정 정지 중 발생한 미정산 금액은 분쟁 해결 후 처리됩니다.</li>
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
