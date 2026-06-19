import Link from "next/link";
import siteConfig from "@/site.config";

/**
 * 전자상거래법 제10조, 통신판매업 의무 표시 사항 푸터.
 * site.config.ts의 business 값을 직접 참조하므로 하드코딩 금지.
 */
export default function BusinessFooter() {
  const { business, service } = siteConfig;
  const customerCenter = [business.phone, business.email].filter(Boolean).join(" · ");
  const privacyOfficer = [
    business.privacyOfficer.name,
    business.privacyOfficer.email ? `(${business.privacyOfficer.email})` : "",
  ].filter(Boolean).join(" ");
  const copyrightName = business.name || service.name;

  return (
    <footer style={styles.wrap}>
      <div style={styles.brand}>{service.name}</div>

      <div style={styles.notice}>{service.intermediaryNotice}</div>

      <div style={styles.divider} />

      <dl style={styles.dl}>
        <Row label="상호" value={business.name} />
        <Row label="대표자" value={business.ceo} />
        <Row label="사업장 주소" value={business.address} />
        <Row label="고객센터" value={customerCenter} />
        <Row label="사업자등록번호" value={business.businessRegNo} />
        <Row label="통신판매업 신고번호" value={business.mailOrderRegNo} />
        <Row label="호스팅 서버 소재지" value={business.hostingLocation} />
        <Row label="개인정보보호책임자" value={privacyOfficer} />
      </dl>

      <div style={styles.divider} />

      <div style={styles.links}>
        <Link href="/terms" style={styles.link}>이용약관</Link>
        <span style={styles.sep}>·</span>
        <Link href="/terms/privacy" style={{ ...styles.link, fontWeight: 700 }}>개인정보처리방침</Link>
        <span style={styles.sep}>·</span>
        <Link href="/terms/refund" style={styles.link}>청약철회·환불정책</Link>
        <span style={styles.sep}>·</span>
        <Link href="/terms/seller" style={styles.link}>판매자약관</Link>
      </div>

      <div style={styles.copy}>
        © {new Date().getFullYear()} {copyrightName}. All rights reserved.
      </div>
    </footer>
  );
}

function Row({ label, value }) {
  if (!value) return null;

  return (
    <div style={styles.row}>
      <dt style={styles.dt}>{label}</dt>
      <dd style={styles.dd}>{value}</dd>
    </div>
  );
}

const styles = {
  wrap: {
    padding: "28px 18px 40px",
    borderTop: "1px solid var(--line)",
    marginTop: 16,
  },
  brand: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "var(--ink)",
    marginBottom: 10,
  },
  notice: {
    fontSize: 11,
    color: "var(--muted)",
    lineHeight: 1.7,
    marginBottom: 14,
    padding: "10px 12px",
    background: "var(--surface)",
    borderRadius: 6,
    border: "1px solid var(--line)",
  },
  divider: {
    height: 1,
    background: "var(--line)",
    margin: "14px 0",
  },
  dl: { margin: 0 },
  row: {
    display: "flex",
    gap: 8,
    marginBottom: 5,
  },
  dt: {
    fontSize: 11,
    color: "var(--muted)",
    flexShrink: 0,
    width: 120,
  },
  dd: {
    fontSize: 11,
    color: "var(--ink-soft)",
    margin: 0,
    wordBreak: "keep-all",
  },
  links: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    marginBottom: 10,
  },
  link: {
    fontSize: 11,
    color: "var(--ink-soft)",
    textDecoration: "none",
  },
  sep: {
    fontSize: 11,
    color: "var(--muted-2)",
  },
  copy: {
    fontSize: 10,
    color: "var(--muted-2)",
  },
};
