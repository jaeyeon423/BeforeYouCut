import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "./_TermsLayout";

export const metadata = {
  title: "이용약관 — BEFORE YOU CUT",
};

export default function UserTermsPage() {
  const { version, effectiveAt } = siteConfig.terms.userTerms;
  const { business } = siteConfig;

  return (
    <>
      <TabHeader title="이용약관" bordered />
      <TermsLayout title="이용약관" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래 약관 초안은 법무 검토 전 초안입니다. 시행 전 반드시 법률 전문가 검토를 받으십시오. */}

        <Section title="제1조 (목적)">
          이 약관은 {business.name}(이하 "회사")이 운영하는 BEFORE YOU CUT 서비스(이하 "서비스")의
          이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)">
          <ol>
            <li>"서비스"란 회사가 제공하는 미용인 브랜드 마켓플레이스 플랫폼 및 관련 서비스 일체를 말합니다.</li>
            <li>"이용자"란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>"회원"이란 서비스에 개인정보를 제공하고 회원가입을 한 자로서, 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
            <li>"판매자(셀러)"란 서비스를 통해 상품 또는 용역을 판매하는 입점 판매자를 말합니다. 판매자에 대한 자세한 사항은 판매자(입점) 약관에 따릅니다.</li>
            <li>"통신판매중개"란 회사가 판매자와 구매자 사이의 거래를 중개하는 행위를 말합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 게시 및 개정)">
          <ol>
            <li>회사는 이 약관의 내용을 서비스 화면에 게시합니다.</li>
            <li>회사는 필요한 경우 약관을 개정할 수 있으며, 개정 시 시행 7일 전에 공지합니다. 단, 이용자에게 불리한 변경의 경우 30일 이전에 공지합니다.</li>
            <li>이용자가 개정 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (서비스의 성격 — 통신판매중개자)">
          <ol>
            <li>
              회사는 통신판매중개자로서, 판매자와 구매자 간 거래의 장을 제공할 뿐 거래의 당사자가 아닙니다.
              상품의 품질, 완전성, 안전성, 진실성 등에 대한 책임은 해당 판매자에게 있습니다.
            </li>
            <li>회사는 전자상거래법 제20조에 따른 통신판매중개자 고지를 서비스 내에 표시합니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (회원가입)">
          <ol>
            <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관 및 개인정보처리방침에 동의함으로써 회원가입을 신청합니다.</li>
            <li>회사는 다음 각 호에 해당하는 경우 가입 신청을 승낙하지 않을 수 있습니다.
              <ul>
                <li>타인의 명의를 도용하거나 허위 정보를 입력한 경우</li>
                <li>법령 또는 이 약관에 위반하여 회원 자격을 상실한 전력이 있는 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제6조 (회원 탈퇴 및 자격 상실)">
          <ol>
            <li>회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 지체 없이 처리합니다.</li>
            <li>탈퇴 시 법령에서 정한 보존 기간 동안 거래 관련 정보는 보관되며 이후 파기됩니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (구매자의 의무)">
          <ol>
            <li>구매자는 주문 시 정확한 배송 정보를 입력해야 합니다.</li>
            <li>구매자는 허위 청약철회·반품 등 부정 이용을 해서는 안 됩니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (청약철회 및 환불)">
          전자상거래법 제17조에 따라 구매자는 상품 수령 후 7일 이내에 청약철회를 할 수 있습니다.
          자세한 사항은 <a href="/terms/refund">청약철회·환불정책</a>을 따릅니다.
        </Section>

        <Section title="제9조 (개인정보 보호)">
          회사는 개인정보보호법 및 정보통신망법에 따라 이용자의 개인정보를 보호합니다.
          자세한 사항은 <a href="/terms/privacy">개인정보처리방침</a>을 따릅니다.
        </Section>

        <Section title="제10조 (면책 조항)">
          <ol>
            <li>회사는 통신판매중개자로서 판매자가 제공한 상품 정보, 이행, 품질 등에 대한 책임을 지지 않습니다.</li>
            <li>회사는 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제11조 (준거법 및 재판관할)">
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
