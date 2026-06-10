"use client";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";

/**
 * 약관 페이지 공통 레이아웃.
 * 상단에 "법무 검토 전 초안" 배너를 표시함.
 */
export default function TermsLayout({ title, version, effectiveAt, children }) {
  const router = useRouter();

  return (
    <div className="byc-scroll fadein">
      {/* TODO(법무): 법무 검토 완료 후 아래 배너 제거 */}
      <div style={styles.draftBanner}>
        ⚠️ 법무 검토 전 초안 — 시행 전 반드시 법률 전문가 검토를 받으십시오.
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        <div style={styles.meta}>버전 {version} · 시행일 {effectiveAt}</div>
      </div>

      <div style={styles.body}>{children}</div>

      <div style={styles.foot}>
        <button className="btn-ghost" style={styles.backBtn} onClick={() => router.back()}>
          <Icon name="arrow-left" size={16} /> 돌아가기
        </button>
      </div>
    </div>
  );
}

const styles = {
  draftBanner: {
    background: "#FAEEDA",
    color: "#633806",
    fontSize: 11,
    fontWeight: 600,
    padding: "10px 18px",
    borderBottom: "1px solid #FAC775",
    lineHeight: 1.5,
  },
  header: {
    padding: "20px 18px 0",
    borderBottom: "1px solid var(--line)",
    paddingBottom: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: "var(--muted)",
  },
  body: {
    padding: "0 18px",
  },
  foot: {
    padding: "24px 18px 48px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    padding: "8px 14px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "none",
    cursor: "pointer",
  },
};
