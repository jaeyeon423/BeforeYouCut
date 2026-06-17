import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: "개인정보처리방침 — BEFORE YOU CUT",
};

export default function PrivacyPolicyPage() {
  const { version, effectiveAt } = siteConfig.terms.privacyPolicy;
  const { business } = siteConfig;

  return (
    <>
      <TabHeader title="개인정보처리방침" bordered />
      <TermsLayout title="개인정보처리방침" version={version} effectiveAt={effectiveAt}>
        {/* TODO(법무 검토): 아래는 법무 검토 전 초안입니다. 개인정보보호법 및 정보통신망법 검토 필수. */}

        <P>
          {business.name}(이하 &quot;회사&quot;)은 개인정보보호법 및 관련 법령에 따라
          이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위해 다음과 같이
          개인정보처리방침을 수립·공개합니다.
        </P>

        <Section title="제1조 (수집하는 개인정보 항목 및 수집 방법)">
          <b>① 필수 수집 항목</b>
          <ul>
            <li>이메일 주소, 비밀번호 (Supabase Auth를 통해 수집)</li>
            <li>주문 시: 수령인 성명, 배송지 주소, 연락처</li>
          </ul>
          <b>② 선택 수집 항목</b>
          <ul>
            <li>판매자 입점 시: 브랜드명, 카테고리, 상품 정보</li>
            <li>사업자 판매자: 사업자등록번호, 대표자명, 계좌정보 (정산 목적)</li>
          </ul>
          <b>③ 자동 수집 항목</b>
          <ul>
            <li>서비스 이용 기록, IP 주소, 쿠키, 접속 환경 정보</li>
          </ul>
        </Section>

        <Section title="제2조 (개인정보의 수집 및 이용 목적)">
          <ul>
            <li>회원 가입 및 본인 확인</li>
            <li>상품 주문·결제·배송 처리</li>
            <li>판매자 정산 처리</li>
            <li>고객 문의 및 불만 처리</li>
            <li>법령에 따른 의무 이행 (전자상거래법 거래 기록 보존 등)</li>
            <li>서비스 개선 및 통계 분석</li>
          </ul>
        </Section>

        <Section title="제3조 (개인정보의 보유 및 이용 기간)">
          회원 탈퇴 또는 동의 철회 시 지체 없이 파기합니다. 단, 아래 법령에 따라 일정 기간 보관합니다.
          <ul>
            <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
            <li>접속 로그: 3개월 (통신비밀보호법)</li>
          </ul>
        </Section>

        <Section title="제4조 (개인정보의 제3자 제공)">
          회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
          다음의 경우에만 예외적으로 제공합니다.
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의하여 요구되는 경우</li>
            <li>주문한 상품 배송을 위해 판매자에게 수령인 정보를 제공하는 경우</li>
          </ul>
        </Section>

        <Section title="제5조 (개인정보 처리 위탁)">
          회사는 원활한 서비스 제공을 위해 다음과 같이 처리 업무를 위탁합니다.
          {/* TODO(운영자 입력): 아래 수탁사 목록을 실제 계약 체결된 업체로 업데이트 */}
          <table style={tableStyle}>
            <thead>
              <tr><th style={thStyle}>수탁사</th><th style={thStyle}>위탁 업무</th></tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>Amazon Web Services (Supabase)</td><td style={tdStyle}>클라우드 서버 운영, 데이터베이스 호스팅</td></tr>
              <tr><td style={tdStyle}>PG사 (미확정)</td><td style={tdStyle}>결제 처리 및 정산 대행</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="제6조 (이용자의 권리·의무)">
          이용자는 언제든지 다음의 권리를 행사할 수 있습니다.
          <ul>
            <li>개인정보 열람 요구</li>
            <li>오류 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          요청은 개인정보보호책임자({business.privacyOfficer.email})로 문의하시기 바랍니다.
        </Section>

        <Section title="제7조 (개인정보의 안전성 확보 조치)">
          회사는 개인정보보호법 제29조에 따라 다음과 같은 조치를 취합니다.
          <ul>
            <li>관리적 조치: 내부 관리계획 수립 및 시행, 정기적 임직원 교육</li>
            <li>기술적 조치: 개인정보 접근 권한 관리, 암호화 저장(계좌정보 등), RLS 정책 적용</li>
            <li>물리적 조치: 전산실 및 자료 보관실 접근 통제</li>
          </ul>
        </Section>

        <Section title="제8조 (개인정보보호책임자)">
          <dl style={{ margin: 0 }}>
            <div style={dlRow}><dt style={dt}>성명</dt><dd style={dd}>{business.privacyOfficer.name}</dd></div>
            <div style={dlRow}><dt style={dt}>이메일</dt><dd style={dd}>{business.privacyOfficer.email}</dd></div>
            <div style={dlRow}><dt style={dt}>소속</dt><dd style={dd}>{business.name}</dd></div>
          </dl>
          개인정보 관련 문의는 위 담당자에게 연락주시면 지체 없이 답변 드리겠습니다.
        </Section>

        <Section title="제9조 (권익 침해 구제 방법)">
          아래 기관에 도움을 요청할 수 있습니다.
          <ul>
            <li>개인정보보호위원회: privacy.go.kr / 182</li>
            <li>대검찰청 사이버수사과: spo.go.kr / 1301</li>
            <li>경찰청 사이버안전국: cyberbureau.police.go.kr / 182</li>
          </ul>
        </Section>

        <Section title="부칙">
          이 방침은 {effectiveAt}부터 시행합니다.
        </Section>
      </TermsLayout>
    </>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.75, marginBottom: 16 }}>{children}</p>;
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>{title}</h3>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12 };
const thStyle = { textAlign: "left", padding: "6px 10px", background: "var(--surface)", border: "1px solid var(--line)", fontWeight: 700 };
const tdStyle = { padding: "6px 10px", border: "1px solid var(--line)", color: "var(--ink-soft)" };
const dlRow = { display: "flex", gap: 8, marginBottom: 4 };
const dt = { fontSize: 12, color: "var(--muted)", width: 80, flexShrink: 0 };
const dd = { fontSize: 12, color: "var(--ink-soft)", margin: 0 };
