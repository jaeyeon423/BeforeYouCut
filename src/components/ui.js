"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from './icons';
import { CAT_ICON, won } from '../data/data';
import { useApp } from '@/contexts/app-context';

// ---------- product image placeholder ----------
export function Placeholder({ icon = "scissors", tone = "tone-a", tag, size = 44 }) {
  return (
    <div className={"ph " + tone}>
      {tag && <span className="ph-tag">{tag}</span>}
      <span className="ph-icon"><Icon name={icon} size={size} stroke={1.3} /></span>
    </div>
  );
}

export function ProductMedia({ p, image, size = 44, loading = "lazy" }) {
  const src = image || (Array.isArray(p?.images) ? p.images.find(Boolean) : null);
  if (src) {
    return (
      <Image
        className="product-img"
        src={src}
        alt={p?.name || "상품 이미지"}
        width={900}
        height={900}
        loading={loading}
        unoptimized
      />
    );
  }

  return <Placeholder icon={p?.icon || "scissors"} tone={p?.tone || "tone-a"} size={size} />;
}

// ---------- brand wordmark ----------
export function Wordmark() {
  return (
    <div className="wordmark">
      <span>MIYONG</span><span className="cut">SA</span>
    </div>
  );
}

// ---------- section header (more → Link when href given, else button) ----------
export function SectionHeader({ title, sub, more, href, onMore }) {
  return (
    <div className="section-head">
      <div>
        <h3 className="section-title">{title}</h3>
        {sub && <div className="section-sub">{sub}</div>}
      </div>
      {more && href && (
        <Link href={href} className="section-more">{more}<Icon name="chev-r-sm" size={14} /></Link>
      )}
      {more && !href && onMore && (
        <button className="section-more" onClick={onMore}>{more}<Icon name="chev-r-sm" size={14} /></button>
      )}
    </div>
  );
}

// ---------- verified mark ----------
export function Verified({ size = 13 }) {
  return <span className="verified"><Icon name="verified" size={size} /></span>;
}

// ---------- product card (variants: minimal | meta | overlay) ----------
// Navigation is a real <Link>; the like control is a span (role=button) so we
// don't nest interactive <button> inside an <a>.
export function ProductCard({ p, variant = "meta" }) {
  const { sellers, likes, toggleLike } = useApp();
  const seller = sellers[p.seller] || { name: "알 수 없는 브랜드" };
  const liked = likes.has(p.id);

  const onLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(p.id);
  };

  if (variant === "overlay") {
    return (
      <Link href={`/products/${p.id}`} className="pcard overlay">
        <div className="pcard-media">
          <ProductMedia p={p} />
          {p.badge && <span className={"badge " + p.badge}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
          <div className="ov">
            <div className="ov-brand">{seller.name}</div>
            <div className="ov-name">{p.name}</div>
            <div className="ov-price">{p.disc ? <span style={{ color: "var(--accent)" }}>{p.disc}% </span> : null}{won(p.price)}원</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/products/${p.id}`} className="pcard">
      <div className="pcard-media">
        <ProductMedia p={p} />
        {p.badge && <span className={"badge " + p.badge}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
        <span className="pcard-like" role="button" tabIndex={0} onClick={onLike} aria-label="찜">
          <Icon name="heart" size={20} fill={liked} stroke={1.8} />
        </span>
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
            <span>♡ {(p.likes ?? 0).toLocaleString()}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------- horizontal product rail ----------
export function ProductRail({ items, variant }) {
  return (
    <div className="prow">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} variant={variant} />
      ))}
    </div>
  );
}

// ---------- product grid ----------
export function ProductGrid({ items, variant }) {
  return (
    <div className="pgrid">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} variant={variant} />
      ))}
    </div>
  );
}

// ---------- brand rail (stories-style) ----------
export function BrandRail() {
  const { sellers } = useApp();
  const ids = Object.keys(sellers);
  return (
    <div className="brandrail">
      {ids.map((id) => {
        const s = sellers[id];
        return (
          <Link key={id} href={`/sellers/${id}`} className="brandcell">
            <div className={"ring" + (s.products < 12 ? " new" : "")}>
              <div className="ring-inner"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={26} /></div>
            </div>
            <div className="bc-name">{s.name}</div>
          </Link>
        );
      })}
    </div>
  );
}

// ---------- brand spotlight card ----------
export function BrandCard({ id }) {
  const { sellers, following, toggleFollow } = useApp();
  const s = sellers[id] || { name: id, category: "도구", desc: "", followers: "0", tone: "tone-a" };
  const isF = following.has(id);

  const onFollow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFollow(id);
  };

  return (
    <Link href={`/sellers/${id}`} className="brandcard">
      <div className="brandcard-cover"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={40} /></div>
      <div className="brandcard-foot">
        <div className="brandcard-logo"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={22} /></div>
        <div className="brandcard-info">
          <div className="brandcard-name">{s.name}{s.verified && <Verified size={13} />}</div>
          <div className="brandcard-desc">{s.desc} · 팔로워 {s.followers}</div>
        </div>
        <span className={"btn-follow" + (isF ? " on" : "")} role="button" tabIndex={0} onClick={onFollow}>
          {isF ? "팔로잉" : "+ 팔로우"}
        </span>
      </div>
    </Link>
  );
}
