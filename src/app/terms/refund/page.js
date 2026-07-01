import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: `청약철회·환불정책 — ${siteConfig.service.name}`,
};

export default function RefundPolicyPage() {
  const { version, effectiveAt } = siteConfig.terms.refundPolicy;

  return (
    <>
      <TabHeader title="청약철회·환불정책" bordered />
      <TermsLayout title="청약철회·환불정책" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래는 구현 정책 기준 초안입니다. 시행 전 전자상거래법 검토가 필요합니다. */}

        <Section title="제1조 (청약철회 기간)">
          구매자는 상품을 수령한 날부터 7일 이내에 청약철회(반품·환불)를 요청할 수 있습니다.
          단, 다음 경우에는 청약철회가 제한될 수 있습니다.
          <ul>
            <li>구매자의 책임 있는 사유로 상품이 훼손·파손된 경우</li>
            <li>구매자의 사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우</li>
            <li>위생, 안전, 맞춤 제작 등 상품 특성상 재판매가 곤란하고 상품 상세페이지에 사전 고지된 경우</li>
            <li>시간 경과로 재판매가 곤란한 상품으로서 관련 법령상 청약철회 제한 사유에 해당하는 경우</li>
          </ul>
        </Section>

        <Section title="제2조 (신청 방법)">
          <ol>
            <li>서비스 내 주문 상세 화면에서 청약철회 또는 환불을 신청합니다.</li>
            <li>서비스 화면에서 신청이 어려운 경우 고객센터 이메일({siteConfig.business.email})로 주문번호와 사유를 기재해 요청할 수 있습니다.</li>
            <li>회사는 환불 요청을 접수하면 판매자 확인, 반품 필요 여부, 비용 부담 주체를 확인한 뒤 처리 상태를 안내합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (반품 비용 부담)">
          <ul>
            <li>단순 변심: 구매자가 반품 배송비를 부담합니다.</li>
            <li>상품 하자, 오배송, 표시 정보와 다른 상품 배송: 판매자가 반품 배송비를 부담합니다.</li>
            <li>구체적인 배송비 금액과 반품 주소는 판매자 또는 고객센터 안내에 따릅니다.</li>
          </ul>
        </Section>

        <Section title="제4조 (환불 처리)">
          <ol>
            <li>환불 승인이 완료되면 회사는 관리자 환불 처리 화면에서 토스페이먼츠 결제 취소 API를 호출해 결제를 취소합니다.</li>
            <li>현재 서비스의 관리자 환불 완료 처리는 주문 전체 환불을 기준으로 운영합니다. 부분 환불은 별도 정책과 시스템 준비 후 제공합니다.</li>
            <li>결제 취소가 완료된 주문은 주문 상태가 환불완료로 변경되고, 해당 주문의 미지급 정산은 취소됩니다.</li>
            <li>결제 취소 결과는 PG사와 카드사 정책에 따라 실제 한도 복구 또는 환급 반영까지 시간이 걸릴 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (환불 반영 기간)">
          <ul>
            <li>카드 승인 매입 전 취소: 일반적으로 즉시 승인 취소됩니다.</li>
            <li>카드 승인 매입 후 취소 또는 부분 취소: 카드사 기준으로 보통 3~4영업일이 소요될 수 있습니다.</li>
            <li>간편결제, 계좌이체, 기타 결제수단: 토스페이먼츠와 해당 결제수단 제공사의 정책에 따라 처리 기간이 달라질 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="제6조 (통신판매중개자 책임 한계)">
          {siteConfig.service.name}는 통신판매중개자로서 판매자와 구매자 사이의 거래를 중개합니다.
          상품의 배송, 교환, 반품, 환불에 대한 1차 책임은 해당 판매자에게 있으며, 회사는 관련 분쟁 해결과 결제 취소 처리를 지원합니다.
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
