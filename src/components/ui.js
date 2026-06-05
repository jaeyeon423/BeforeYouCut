"use client";

import React from 'react';
import Icon from './icons';
import { SELLERS, CAT_ICON, won } from '../data/data';

// ---------- product image placeholder ----------
export function Placeholder({ icon = "scissors", tone = "tone-a", tag, size = 44 }) {
  return (
    <div className={"ph " + tone}>
      {tag && <span className="ph-tag">{tag}</span>}
      <span className="ph-icon"><Icon name={icon} size={size} stroke={1.3} /></span>
    </div>
  );
}

// ---------- brand wordmark ----------
export function Wordmark() {
  return (
    <div className="wordmark">
      <span>BEFORE YOU </span><span className="cut">CUT</span>
    </div>
  );
}

// ---------- top bar ----------
export function TopBar({ onNav, cart = 0, bordered, title }) {
  return (
    <div className={"topbar" + (bordered ? " bordered" : "")}>
      {title ? <div className="wordmark" style={{ fontSize: 17 }}>{title}</div> : <Wordmark />}
      <div className="topbar-actions">
        <button className="icon-btn" onClick={() => onNav("search")} aria-label="검색"><Icon name="search" size={22} /></button>
        <button className="icon-btn" aria-label="알림"><Icon name="bell" size={22} /><span className="dot" /></button>
        <button className="icon-btn" onClick={() => onNav("bag")} aria-label="장바구니">
          <Icon name="bag" size={22} />
          {cart > 0 && <span className="dot" style={{ width: 7, height: 7 }} />}
        </button>
      </div>
    </div>
  );
}

// ---------- bottom tab nav ----------
export const NAV_TABS = [
  { key: "home", label: "홈", icon: "home" },
  { key: "category", label: "카테고리", icon: "grid" },
  { key: "search", label: "검색", icon: "search" },
  { key: "saved", label: "저장", icon: "heart" },
  { key: "my", label: "마이", icon: "user" },
];

export function BottomNav({ active, onNav }) {
  return (
    <div className="bottomnav">
      {NAV_TABS.map((t) => {
        const on = active === t.key || (t.key === "home" && active === "home");
        return (
          <button key={t.key} className={"navitem" + (on ? " active" : "")} onClick={() => onNav(t.key)}>
            <Icon name={t.icon} size={23} fill={t.key === "saved" && on} stroke={on ? 1.9 : 1.7} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- section header ----------
export function SectionHeader({ title, sub, more, onMore }) {
  return (
    <div className="section-head">
      <div>
        <h3 className="section-title">{title}</h3>
        {sub && <div className="section-sub">{sub}</div>}
      </div>
      {more && <button className="section-more" onClick={onMore}>{more}<Icon name="chev-r-sm" size={14} /></button>}
    </div>
  );
}

// ---------- verified mark ----------
export function Verified({ size = 13 }) {
  return <span className="verified"><Icon name="verified" size={size} /></span>;
}

// ---------- product card (variants: minimal | meta | overlay) ----------
export function ProductCard({ p, variant = "meta", onOpen, liked, onLike }) {
  const seller = SELLERS[p.seller];
  if (variant === "overlay") {
    return (
      <div className="pcard overlay" onClick={() => onOpen(p)}>
        <div className="pcard-media">
          <Placeholder icon={p.icon} tone={p.tone} />
          {p.badge && <span className={"badge " + p.badge}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
          <div className="ov">
            <div className="ov-brand">{seller.name}</div>
            <div className="ov-name">{p.name}</div>
            <div className="ov-price">{p.disc ? <span style={{ color: "var(--accent)" }}>{p.disc}% </span> : null}{won(p.price)}원</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="pcard" onClick={() => onOpen(p)}>
      <div className="pcard-media">
        <Placeholder icon={p.icon} tone={p.tone} />
        {p.badge && <span className={"badge " + p.badge}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
        <button className="pcard-like" onClick={(e) => { e.stopPropagation(); onLike && onLike(p.id); }} aria-label="찜">
          <Icon name="heart" size={20} fill={liked} stroke={1.8} />
        </button>
      </div>
      <div className="pcard-body">
        <div className="pcard-brand">{seller.name}{seller.verified && <Verified size={12} />}</div>
        <div className="pcard-name">{p.name}</div>
        <div className="pcard-price">
          {p.disc ? <span className="pcard-disc">{p.disc}%</span> : null}
          <span className="pcard-won">{won(p.price)}원</span>
        </div>
        {variant === "meta" && (
          <div className="pcard-meta">
            <span className="star"><Icon name="star" size={11} />{p.rating}</span>
            <span>리뷰 {p.reviews}</span>
            <span>♡ {p.likes.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- horizontal product rail ----------
export function ProductRail({ items, variant, onOpen, likes, onLike }) {
  return (
    <div className="prow">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} variant={variant} onOpen={onOpen} liked={likes?.has(p.id)} onLike={onLike} />
      ))}
    </div>
  );
}

// ---------- product grid ----------
export function ProductGrid({ items, variant, onOpen, likes, onLike }) {
  return (
    <div className="pgrid">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} variant={variant} onOpen={onOpen} liked={likes?.has(p.id)} onLike={onLike} />
      ))}
    </div>
  );
}

// ---------- brand rail (stories-style) ----------
export function BrandRail({ onOpenSeller }) {
  const ids = Object.keys(SELLERS);
  return (
    <div className="brandrail">
      {ids.map((id) => {
        const s = SELLERS[id];
        return (
          <div key={id} className="brandcell" onClick={() => onOpenSeller(id)}>
            <div className={"ring" + (s.products < 12 ? " new" : "")}>
              <div className="ring-inner"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={26} /></div>
            </div>
            <div className="bc-name">{s.name}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- brand spotlight card ----------
export function BrandCard({ id, onOpenSeller, following, onFollow }) {
  const s = SELLERS[id];
  const isF = following?.has(id);
  return (
    <div className="brandcard" onClick={() => onOpenSeller(id)}>
      <div className="brandcard-cover"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={40} /></div>
      <div className="brandcard-foot">
        <div className="brandcard-logo"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={22} /></div>
        <div className="brandcard-info">
          <div className="brandcard-name">{s.name}{s.verified && <Verified size={13} />}</div>
          <div className="brandcard-desc">{s.desc} · 팔로워 {s.followers}</div>
        </div>
        <button className={"btn-follow" + (isF ? " on" : "")} onClick={(e) => { e.stopPropagation(); onFollow(id); }}>
          {isF ? "팔로잉" : "+ 팔로우"}
        </button>
      </div>
    </div>
  );
}
