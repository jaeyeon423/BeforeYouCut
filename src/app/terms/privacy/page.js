import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: `개인정보처리방침 — ${siteConfig.service.name}`,
};

export default function PrivacyPolicyPage() {
  const { version, effectiveAt } = siteConfig.terms.privacyPolicy;
  const { business, service } = siteConfig;

  return (
    <>
      <TabHeader title="개인정보처리방침" bordered />
      <TermsLayout title="개인정보처리방침" version={version} effectiveAt={effectiveAt}>
        <P>
          {business.name}(이하 &quot;회사&quot;)은 {service.name} 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해
          다음과 같이 개인정보처리방침을 수립·공개합니다.
        </P>

        <Section title="제1조 (수집하는 개인정보 항목)">
          <b>① 회원가입 및 계정 관리</b>
          <ul>
            <li>필수: 이메일 주소, 비밀번호, 이름, 휴대폰 번호</li>
            <li>휴대폰 인증 사용 시: 인증번호, 인증 요청 시각, 인증 시도 횟수, 인증 상태</li>
          </ul>

          <b>② 주문·배송·결제</b>
          <ul>
            <li>주문자 및 수령인 이름, 휴대폰 번호, 배송지 주소, 상세주소</li>
            <li>주문 상품, 주문 금액, 결제 요청번호, 토스페이먼츠 paymentKey, 결제 승인·취소 결과</li>
            <li>카드번호 전체 등 민감한 결제수단 원문 정보는 회사 서버에 저장하지 않습니다.</li>
          </ul>

          <b>③ 판매자 입점·정산</b>
          <ul>
            <li>브랜드명, 소개, 카테고리, 판매 상품 정보</li>
            <li>사업자등록번호, 통신판매업 신고번호, 대표자·사업장 정보, 사업자등록증 및 통신판매업 신고증 파일 경로</li>
            <li>정산 은행, 예금주, 계좌번호 등 정산 정보. 계좌번호 등 민감 정보는 암호화 저장을 전제로 합니다.</li>
          </ul>

          <b>④ 고객지원 및 서비스 이용</b>
          <ul>
            <li>문의 제목·내용, 환불 사유, 처리 상태, 관리자 답변</li>
            <li>서비스 이용 기록, 접속 로그, IP 주소, 브라우저·기기 정보, 쿠키 또는 유사 기술 정보</li>
            <li>Sentry 적용 시 오류 로그, 성능 로그, 세션 리플레이에 필요한 기술 정보</li>
          </ul>
        </Section>

        <Section title="제2조 (수집 방법 및 이용 목적)">
          <ul>
            <li>회원가입, 로그인, 휴대폰 인증, 기본 배송지 저장, 주문서, 판매자 센터, 고객센터 입력 화면을 통해 수집합니다.</li>
            <li>토스페이먼츠 결제 승인·취소 API 및 웹훅을 통해 결제 처리 결과를 수집합니다.</li>
            <li>카카오 우편번호 서비스 사용 시 주소 검색 결과를 주문·배송 목적의 주소 입력에 활용합니다.</li>
            <li>수집 정보는 회원 식별, 본인 확인, 주문·결제·배송, 환불, 판매자 심사, 정산, 고객지원, 보안, 장애 분석, 법령상 의무 이행에 이용합니다.</li>
          </ul>
        </Section>

        <Section title="제3조 (보유 및 이용 기간)">
          회원 탈퇴 또는 동의 철회 시 개인정보는 지체 없이 파기합니다. 단, 아래 법령상 보존 의무가 있는 정보는 해당 기간 동안 보관합니다.
          <ul>
            <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
            <li>접속 로그: 3개월 (통신비밀보호법)</li>
          </ul>
        </Section>

        <Section title="제4조 (제3자 제공)">
          회사는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 다만 다음 경우에는 필요한 범위에서 제공합니다.
          <ul>
            <li>법령상 의무 이행 또는 수사기관의 적법한 요청이 있는 경우</li>
            <li>상품 배송과 CS 처리를 위해 해당 판매자에게 수령인 이름, 연락처, 주소, 상세주소, 주문 상품 정보를 제공하는 경우</li>
            <li>이용자가 별도로 동의한 경우</li>
          </ul>
        </Section>

        <Section title="제5조 (개인정보 처리 위탁)">
          회사는 서비스 제공을 위해 다음 업무를 외부 업체에 위탁합니다. 실제 계약·사용 범위가 달라지면 이 표를 즉시 갱신합니다.
          <table style={tableStyle}>
            <thead>
              <tr><th style={thStyle}>수탁사</th><th style={thStyle}>위탁 업무</th></tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>Supabase / Amazon Web Services</td><td style={tdStyle}>회원 인증, 데이터베이스, 파일 스토리지, 서버 인프라 운영</td></tr>
              <tr><td style={tdStyle}>Vercel</td><td style={tdStyle}>웹 애플리케이션 배포, CDN, 서버리스 실행 환경 제공</td></tr>
              <tr><td style={tdStyle}>토스페이먼츠</td><td style={tdStyle}>카드·간편결제 승인, 결제 취소, 결제 웹훅 처리</td></tr>
              <tr><td style={tdStyle}>NAVER Cloud SENS</td><td style={tdStyle}>휴대폰 인증번호 SMS 발송</td></tr>
              <tr><td style={tdStyle}>Sentry</td><td style={tdStyle}>오류 모니터링, 성능 분석, 장애 재현 보조</td></tr>
              <tr><td style={tdStyle}>Kakao 우편번호 서비스</td><td style={tdStyle}>주소 검색 및 우편번호 조회</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="제6조 (국외 이전 및 보관 위치)">
          기본 호스팅 위치는 {business.hostingLocation} 기준입니다. 단, Vercel, Sentry 등 글로벌 클라우드 서비스 사용 과정에서
          로그 또는 기술 정보가 국외 리전에 보관·처리될 수 있습니다. 출시 전 각 수탁사의 실제 데이터 처리 위치와 국외 이전 고지를 최종 확인합니다.
        </Section>

        <Section title="제7조 (이용자의 권리·의무)">
          이용자는 개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회를 요청할 수 있습니다.
          요청은 개인정보보호책임자({business.privacyOfficer.email})에게 접수할 수 있으며 회사는 관련 법령에 따라 처리합니다.
        </Section>

        <Section title="제8조 (안전성 확보 조치)">
          회사는 개인정보보호법 제29조에 따라 다음 조치를 시행합니다.
          <ul>
            <li>관리적 조치: 접근 권한 관리, 운영자 계정 분리, 처리 이력 기록</li>
            <li>기술적 조치: HTTPS, Supabase RLS, 서버 전용 secret 관리, 정산 계좌정보 암호화, 비공개 Storage 정책</li>
            <li>물리적 조치: 클라우드 인프라 사업자의 물리적 접근 통제 정책 활용</li>
          </ul>
        </Section>

        <Section title="제9조 (개인정보보호책임자)">
          <dl style={{ margin: 0 }}>
            <div style={dlRow}><dt style={dt}>성명</dt><dd style={dd}>{business.privacyOfficer.name}</dd></div>
            <div style={dlRow}><dt style={dt}>이메일</dt><dd style={dd}>{business.privacyOfficer.email}</dd></div>
            <div style={dlRow}><dt style={dt}>소속</dt><dd style={dd}>{business.name}</dd></div>
          </dl>
        </Section>

        <Section title="제10조 (권익 침해 구제 방법)">
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
