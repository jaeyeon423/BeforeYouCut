import Link from "next/link";

export default function NotFound() {
  return (
    <div className="byc-scroll fadein" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "40px 30px", color: "var(--muted)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.04em" }}>404</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0 24px" }}>
          요청하신 페이지를 찾을 수 없습니다.<br/>주소가 변경되었거나 삭제되었을 수 있어요.
        </p>
        <Link href="/" className="buy" style={{ display: "inline-block", padding: "12px 28px", height: "auto", textDecoration: "none" }}>홈으로 돌아가기</Link>
      </div>
    </div>
  );
}
