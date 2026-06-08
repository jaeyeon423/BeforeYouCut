"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="byc-scroll fadein" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "40px 30px", color: "var(--muted)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em" }}>문제가 발생했어요</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0 24px" }}>
          일시적인 오류로 화면을 표시하지 못했습니다.<br/>잠시 후 다시 시도해 주세요.
        </p>
        <button className="buy" style={{ display: "inline-block", padding: "12px 28px", height: "auto" }} onClick={() => reset()}>다시 시도</button>
      </div>
    </div>
  );
}
