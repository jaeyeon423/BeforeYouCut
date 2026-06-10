import siteConfig from "@/site.config";

/**
 * 전자상거래법 제20조 — 통신판매중개자 고지 컴포넌트.
 * 상품 상세 / 결제 페이지에서 사용.
 * seller 정보가 없으면 일반 고지만 표시.
 */
export default function IntermediaryNotice({ seller }) {
  const { service } = siteConfig;

  return (
    <div style={styles.wrap}>
      <div style={styles.badge}>통신판매중개자 고지</div>

      {seller && (
        <div style={styles.sellerRow}>
          <span style={styles.sellerLabel}>판매자</span>
          <span style={styles.sellerValue}>
            {seller.businessName || seller.name}
            {seller.sellerType === "BUSINESS" && seller.businessRegNo
              ? ` · 사업자 ${seller.businessRegNo}`
              : ""}
          </span>
        </div>
      )}

      <p style={styles.text}>{service.intermediaryNotice}</p>
    </div>
  );
}

const styles = {
  wrap: {
    margin: "0 0 0",
    padding: "12px 14px",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 11,
  },
  badge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--muted)",
    border: "1px solid var(--line-strong)",
    borderRadius: 4,
    padding: "2px 6px",
    marginBottom: 8,
    letterSpacing: "0.04em",
  },
  sellerRow: {
    display: "flex",
    gap: 8,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  sellerLabel: {
    fontSize: 11,
    color: "var(--muted)",
    flexShrink: 0,
    width: 42,
  },
  sellerValue: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--ink-soft)",
    wordBreak: "keep-all",
  },
  text: {
    margin: 0,
    fontSize: 11,
    color: "var(--muted)",
    lineHeight: 1.65,
  },
};
