import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "./_TermsLayout";

export const metadata = {
  title: `이용약관 — ${siteConfig.service.name}`,
};

export default function UserTermsPage() {
  const { version, effectiveAt } = siteConfig.terms.userTerms;
  const { business, service } = siteConfig;

  return (
    <>
      <TabHeader title="이용약관" bordered />
      <TermsLayout title="이용약관" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래 약관 초안은 구현 정책 기준 초안입니다. 시행 전 법률 검토가 필요합니다. */}

        <Section title="제1조 (목적)">
          이 약관은 {business.name}(이하 &quot;회사&quot;)이 운영하는 {service.name} 서비스(이하 &quot;서비스&quot;)의
          이용과 관련하여 회사와 이용자 사이의 권리·의무 및 책임 사항을 정합니다.
        </Section>

        <Section title="제2조 (정의)">
          <ol>
            <li>&quot;서비스&quot;란 미용인을 위한 전문 도구·용품 마켓플레이스와 관련 기능 일체를 말합니다.</li>
            <li>&quot;회원&quot;이란 이메일, 이름, 휴대폰 번호 등 회사가 요구하는 정보를 제공하고 가입한 이용자를 말합니다.</li>
            <li>&quot;구매자&quot;란 서비스에서 상품을 주문·결제하는 회원을 말합니다.</li>
            <li>&quot;판매자&quot;란 판매자 약관에 동의하고 상품을 등록·판매하는 입점 회원을 말합니다.</li>
            <li>&quot;통신판매중개&quot;란 회사가 판매자와 구매자 사이의 거래를 중개하는 행위를 말합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 게시 및 개정)">
          <ol>
            <li>회사는 이 약관의 내용을 서비스 화면에 게시합니다.</li>
            <li>회사는 필요한 경우 약관을 개정할 수 있으며, 개정 시 시행 7일 전에 공지합니다. 이용자에게 불리한 변경은 30일 전에 공지합니다.</li>
            <li>개정 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (서비스의 성격)">
          <ol>
            <li>회사는 통신판매중개자로서 판매자와 구매자 사이의 거래 장소와 시스템을 제공합니다.</li>
            <li>상품의 표시, 품질, 적법성, 배송, 교환, 반품, 환불의 1차 책임은 해당 판매자에게 있습니다.</li>
            <li>회사는 전자상거래법상 통신판매중개자 고지와 분쟁 해결 지원 의무를 이행합니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (회원가입 및 계정)">
          <ol>
            <li>이용자는 회사가 정한 가입 양식에 따라 이메일, 비밀번호, 이름, 휴대폰 번호를 입력하고 약관에 동의해야 합니다.</li>
            <li>휴대폰 인증을 사용하는 경우 회원은 본인 또는 적법하게 사용할 권한이 있는 번호로 인증해야 합니다.</li>
            <li>회사는 허위 정보, 타인 명의 사용, 부정 가입, 서비스 운영 방해가 확인되면 가입을 거절하거나 계정을 제한할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (주문 및 결제)">
          <ol>
            <li>주문은 상품, 수량, 배송지, 주문자 정보를 확인한 뒤 토스페이먼츠 결제창을 통해 결제합니다.</li>
            <li>회사는 결제 요청 전 서버 기준 상품 가격과 수량으로 결제 세션을 생성합니다.</li>
            <li>주문은 토스페이먼츠 결제 승인 API 또는 결제 승인 웹훅을 통해 결제 완료가 확인된 뒤 생성됩니다.</li>
            <li>구매자가 결제를 취소하거나 결제 승인이 실패한 경우 주문은 생성되지 않거나 실패 상태로 처리됩니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (구매자의 의무)">
          <ol>
            <li>구매자는 정확한 이름, 연락처, 배송지 주소와 상세주소를 입력해야 합니다.</li>
            <li>구매자는 허위 주문, 허위 환불 요청, 타인의 결제수단 부정 사용, 반복적 악성 문의를 해서는 안 됩니다.</li>
            <li>구매자는 상품 상세페이지의 소재, 치수, KC 인증 여부, 취급 주의사항을 확인한 뒤 구매해야 합니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (금지 행위)">
          <ol>
            <li>플랫폼 밖 직거래 유도 또는 외부 결제 유도</li>
            <li>타인의 계정, 개인정보, 결제수단 도용</li>
            <li>허위 리뷰, 허위 신고, 서비스 장애 유발 행위</li>
            <li>법령상 판매·구매가 금지된 상품의 거래 시도</li>
          </ol>
        </Section>

        <Section title="제9조 (청약철회 및 환불)">
          청약철회와 환불은 전자상거래법 및 서비스의 <a href="/terms/refund">청약철회·환불정책</a>을 따릅니다.
          회사는 판매자와 구매자 사이의 분쟁 해결을 지원하며, 토스페이먼츠 결제 취소 API를 통해 결제 취소 처리를 수행할 수 있습니다.
        </Section>

        <Section title="제10조 (개인정보 보호)">
          회사는 개인정보보호법에 따라 이용자의 개인정보를 보호합니다. 자세한 사항은 <a href="/terms/privacy">개인정보처리방침</a>을 따릅니다.
        </Section>

        <Section title="제11조 (서비스 제한 및 면책)">
          <ol>
            <li>회사는 법령 위반, 약관 위반, 부정 이용이 확인된 계정의 서비스 이용을 제한할 수 있습니다.</li>
            <li>회사는 판매자가 등록한 상품 정보와 거래 이행에 대한 통신판매중개자의 책임 범위 내에서 책임을 부담합니다.</li>
            <li>천재지변, 클라우드·PG·통신망 장애 등 회사의 합리적 통제 범위를 벗어난 사유로 인한 손해는 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제12조 (준거법 및 재판관할)">
          이 약관은 대한민국 법률에 따르며, 서비스 이용 관련 분쟁은 민사소송법상 관할 법원에 제소합니다.
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
