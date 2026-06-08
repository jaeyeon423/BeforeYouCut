"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { Wordmark } from "@/components/ui";
import { useCart } from "@/contexts/cart-context";

// ---------- top bar for tab pages (home + tab titles) ----------
export function TabHeader({ title, bordered }) {
  const { cart } = useCart();
  return (
    <div className={"topbar" + (bordered ? " bordered" : "")}>
      {title ? <div className="wordmark" style={{ fontSize: 17 }}>{title}</div> : <Wordmark />}
      <div className="topbar-actions">
        <Link href="/search" className="icon-btn" aria-label="검색"><Icon name="search" size={22} /></Link>
        <button className="icon-btn" aria-label="알림"><Icon name="bell" size={22} /><span className="dot" /></button>
        <Link href="/cart" className="icon-btn" aria-label="장바구니">
          <Icon name="bag" size={22} />
          {cart.length > 0 && <span className="dot" style={{ width: 7, height: 7 }} />}
        </Link>
      </div>
    </div>
  );
}

// ---------- back header for overlay pages (detail / seller / cart) ----------
export function OverlayHeader({ title, showBag = true }) {
  const router = useRouter();
  const { cart } = useCart();
  return (
    <div className="topbar bordered" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button className="icon-btn" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        {title && (
          <div className="wordmark" style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="공유"><Icon name="share" size={21} /></button>
        {showBag && (
          <Link href="/cart" className="icon-btn" aria-label="장바구니">
            <Icon name="bag" size={22} />
            {cart.length > 0 && <span className="dot" style={{ width: 7, height: 7 }} />}
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------- bottom tab nav ----------
const NAV_TABS = [
  { key: "home", href: "/", label: "홈", icon: "home" },
  { key: "category", href: "/category", label: "카테고리", icon: "grid" },
  { key: "search", href: "/search", label: "검색", icon: "search" },
  { key: "saved", href: "/saved", label: "저장", icon: "heart" },
  { key: "my", href: "/my", label: "마이", icon: "user" },
];

export function BottomNav({ active }) {
  return (
    <div className="bottomnav">
      {NAV_TABS.map((t) => {
        const on = active === t.key;
        return (
          <Link key={t.key} href={t.href} className={"navitem" + (on ? " active" : "")}>
            <Icon name={t.icon} size={23} fill={t.key === "saved" && on} stroke={on ? 1.9 : 1.7} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
