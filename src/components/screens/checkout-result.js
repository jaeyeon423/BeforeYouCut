"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { useCart } from "@/contexts/cart-context";

export default function CheckoutResultScreen({ status, title, desc, orderId, clearCart = false }) {
  const { clearCart: clearCartItems } = useCart();

  useEffect(() => {
    if (clearCart) clearCartItems();
  }, [clearCart, clearCartItems]);

  const success = status === "success";

  return (
    <div className="byc-scroll fadein">
      <section style={styles.panel}>
        <div style={styles.icon}><Icon name={success ? "check" : "bell"} size={34} /></div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.desc}>{desc}</p>
        <div style={styles.actions}>
          {orderId && <Link className="buy" href={`/orders/${orderId}`} style={styles.primary}>주문 상세 보기</Link>}
          <Link href={success ? "/my" : "/cart"} style={styles.link}>{success ? "마이페이지" : "장바구니로 돌아가기"}</Link>
        </div>
      </section>
    </div>
  );
}

const styles = {
  panel: { margin: "90px 24px 0", padding: 24, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", textAlign: "center" },
  icon: { width: 58, height: 58, margin: "0 auto", borderRadius: 999, display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)" },
  title: { margin: "15px 0 7px", fontSize: 21, letterSpacing: 0, color: "var(--ink)" },
  desc: { margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)" },
  actions: { display: "flex", flexDirection: "column", gap: 10, marginTop: 20 },
  primary: { height: "auto", padding: "12px 18px", textDecoration: "none" },
  link: { fontSize: 12.5, fontWeight: 800, color: "var(--ink)", textDecoration: "none" },
};
