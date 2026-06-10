import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: "청약철회·환불정책 — BEFORE YOU CUT",
};

export default function RefundPolicyPage() {
  const { version, effectiveAt } = siteConfig.terms.refundPolicy;

  return (
    <>
      <TabHeader title="청약철회·환불정책" bordered />
      <TermsLayout title="청약철회·환불정책" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래는 법무 검토 전 초안입니다. 전자상거래법 제17조 검토 필수. */}

        <Section title="제1조 (청약철회 기간)">
          구매자는 상품을 수령한 날부터 <b>7일 이내</b>에 청약철회(반품·환불)를 요청할 수 있습니다.
          단, 아래 경우에는 청약철회가 제한될 수 있습니다.
          <ul>
            <li>구매자의 귀책 사유로 상품이 훼손·파손된 경우</li>
            <li>구매자의 사용으로 상품 가치가 현저히 감소한 경우</li>
            <li>시간 경과로 재판매가 어려운 상품 (식품, 위생용품 등 — 해당 판매자 상품 페이지에서 별도 안내)</li>
            <li>복제가 가능한 디지털 콘텐츠로 포장이 훼손된 경우</li>
          </ul>
        </Section>

        <Section title="제2조 (청약철회 방법)">
          <ol>
            <li>서비스 내 주문 내역 → 청약철회 신청</li>
            <li>고객센터 이메일({siteConfig.business.email})로 주문번호 및 사유 기재 후 요청</li>
          </ol>
          청약철회 요청 후 판매자는 3영업일 이내에 처리 여부를 안내해야 합니다.
        </Section>

        <Section title="제3조 (반품 비용 부담)">
          <ul>
            <li>단순 변심: 구매자 부담</li>
            <li>상품 하자·오배송: 판매자 부담</li>
          </ul>
        </Section>

        <Section title="제4조 (환불 처리 기간)">
          청약철회가 승인되면 다음 기간 내에 환불이 처리됩니다.
          <ul>
            <li>신용카드: 승인 취소 또는 카드사 환불 처리 (영업일 기준 3~5일)</li>
            <li>기타 결제 수단: 영업일 기준 5~7일 이내 계좌 환불</li>
          </ul>
          {/* TODO(운영자 입력): PG사 확정 후 실제 환불 처리 기간 업데이트 */}
        </Section>

        <Section title="제5조 (통신판매중개자 책임 한계)">
          BEFORE YOU CUT는 통신판매중개자로서 판매자와 구매자 사이의 거래를 중개합니다.
          청약철회·환불에 관한 최종 책임은 해당 판매자에게 있으며, 플랫폼은 관련 분쟁 해결을 지원합니다.
        </Section>

        <Section title="부칙">
          이 정책은 {effectiveAt}부터 시행합니다.
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
