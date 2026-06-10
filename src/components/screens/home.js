import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import {
  Placeholder,
  SectionHeader,
  ProductRail,
  ProductGrid,
  BrandRail,
  BrandCard,
} from '../ui';
import { won } from '../../data/data';
import { CAT_ICON } from '../../data/data';
import BusinessFooter from '../BusinessFooter';



export function HomeHero({ seller, banner }) {
  if (!seller) {
    const kicker = banner?.kicker || "BEFORE YOU CUT";
    const title = banner?.title || "내 미용 브랜드를\n입점시켜보세요";
    const desc = banner?.desc || "가위, 앞치마, 클리퍼 등 직접 제작한 도구를 판매할 셀러를 모십니다.";
    const ctaText = banner?.ctaText || "입점 신청하기";
    const ctaLink = banner?.ctaLink || "/my";
    const icon = banner?.icon || "store";
    const tone = banner?.tone || "tone-a";

    return (
      <div className="hero" style={{ background: "var(--ink)", color: "#fff" }}>
        <Placeholder icon={icon} tone={tone} size={88} />
        <div className="hero-overlay">
          <div className="hero-kicker">{kicker}</div>
          <h2 className="hero-title" style={{ whiteSpace: "pre-line" }}>{title}</h2>
          <div className="hero-sub">{desc}</div>
          <Link href={ctaLink} className="hero-cta" style={{ background: "#fff", color: "var(--ink)" }}>{ctaText}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="hero">
      <Placeholder icon={CAT_ICON[seller.category] || "scissors"} tone={seller.tone || "tone-b"} size={88} />
      <div className="hero-overlay">
        <div className="hero-kicker">This week · 추천 브랜드</div>
        <h2 className="hero-title">{seller.name}</h2>
        <div className="hero-sub">{seller.desc} · since {seller.since}</div>
        <Link href={`/sellers/${seller.id}`} className="hero-cta">브랜드 보기</Link>
      </div>
    </div>
  );
}

export function RankingList({ items }) {
  return (
    <div>
      {items.map((p, i) => (
        <Link key={p.id} href={`/products/${p.id}`} className="rankrow" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={"rank-num" + (i < 3 ? " top" : "")}>{i + 1}</div>
          <div className="rank-media"><Placeholder icon={p.icon} tone={p.tone} size={28} /></div>
          <div className="rank-body">
            <div className="rank-brand">{p.sellerName || p.seller}</div>
            <div className="rank-name">{p.name}</div>
            <div className="rank-price">{won(p.price)}원</div>
          </div>
          <span className="pcard-like" style={{ position: "static", color: "var(--muted-2)" }}>
            <Icon name="heart" size={20} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function Foot() {
  return <BusinessFooter />;
}

export default function HomeScreen({ ranking = [], newItems = [], spotlightSellers = [], mainBanner = null, cardVariant = "meta" }) {
  const heroSeller = spotlightSellers[0] || null;

  return (
    <div className="byc-scroll fadein">
      <HomeHero seller={heroSeller} banner={mainBanner} />

      <div className="section" style={{ marginTop: 18 }}>
        <SectionHeader title="입점 브랜드" sub="미용인이 만든 브랜드를 팔로우하세요" more="전체" href="/sellers" />
        <BrandRail />
      </div>

      <div className="section">
        <SectionHeader title="신상품" sub="방금 입점한 도구들" more="전체" href="/category?filter=new" />
        <ProductRail items={newItems} variant={cardVariant} />
      </div>

      <div className="section">
        <SectionHeader title="실시간 랭킹" sub="지금 미용인들이 담는 도구" more="더보기" href="/category?filter=best" />
        <RankingList items={ranking} />
      </div>

      <Foot />
    </div>
  );
}
