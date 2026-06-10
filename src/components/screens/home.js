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

export function HomePromo({ seller }) {
  if (!seller) {
    return (
      <Link href="/my" className="banner-promo" style={{ display: "block", color: "#fff", textDecoration: "none" }}>
        <div className="bp-kicker">BECOME A SELLER</div>
        <div className="bp-title">당신의 도구에도<br/>스토리가 있습니다</div>
        <div className="bp-sub">지금 입점 신청을 하고 첫 번째 상품을 등록해 보세요.</div>
        <div className="bp-arrow"><Icon name="store" size={20} /></div>
      </Link>
    );
  }

  return (
    <Link href={`/sellers/${seller.id}`} className="banner-promo" style={{ display: "block", color: "#fff", textDecoration: "none" }}>
      <div className="bp-kicker">SELLER STORY</div>
      <div className="bp-title">{seller.name}<br/>스토리 보기</div>
      <div className="bp-sub">{seller.desc}</div>
      <div className="bp-arrow"><Icon name="chevron" size={20} /></div>
    </Link>
  );
}

export function HomeHero({ seller }) {
  if (!seller) {
    return (
      <div className="hero" style={{ background: "var(--ink)", color: "#fff" }}>
        <Placeholder icon="store" tone="tone-a" size={88} />
        <div className="hero-overlay">
          <div className="hero-kicker">BEFORE YOU CUT</div>
          <h2 className="hero-title">내 미용 브랜드를<br/>입점시켜보세요</h2>
          <div className="hero-sub">가위, 앞치마, 클리퍼 등 직접 제작한 도구를 판매할 셀러를 모십니다.</div>
          <Link href="/my" className="hero-cta" style={{ background: "#fff", color: "var(--ink)" }}>입점 신청하기</Link>
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
  return (
    <div className="foot-note">
      <b>BEFORE YOU CUT</b><br/>
      미용인을 위한 브랜드 마켓플레이스 · 입점 셀러가 직접 판매합니다.<br/>
      이 화면은 디자인 시안이며 실제 결제는 이루어지지 않습니다.
    </div>
  );
}

export default function HomeScreen({ ranking = [], newItems = [], spotlightSellers = [], cardVariant = "meta" }) {
  const heroSeller = spotlightSellers[0] || null;
  const promoSeller = spotlightSellers[1] || heroSeller || null;
  const spotlightSeller = spotlightSellers[0] || null;

  return (
    <div className="byc-scroll fadein">
      <HomeHero seller={heroSeller} />

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

      {spotlightSeller && (
        <div className="section">
          <SectionHeader title="이번 주 브랜드" more="전체" href={`/sellers/${spotlightSeller.id}`} />
          <BrandCard id={spotlightSeller.id} />
        </div>
      )}

      <HomePromo seller={promoSeller} />
      <Foot />
    </div>
  );
}
