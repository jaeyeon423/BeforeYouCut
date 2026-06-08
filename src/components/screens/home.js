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

export function HomePromo() {
  return (
    <Link href="/sellers/steelgrain" className="banner-promo" style={{ display: "block", color: "#fff", textDecoration: "none" }}>
      <div className="bp-kicker">SELLER STORY</div>
      <div className="bp-title">당신의 도구에도<br/>브랜드가 있습니다</div>
      <div className="bp-sub">미용인이 만든 도구를, 미용인에게. 입점 셀러 직접 판매.</div>
      <div className="bp-arrow"><Icon name="chevron" size={20} /></div>
    </Link>
  );
}

export function HomeHero() {
  return (
    <div className="hero">
      <Placeholder icon="scissors" tone="tone-b" size={88} />
      <div className="hero-overlay">
        <div className="hero-kicker">This week · 입점 브랜드</div>
        <h2 className="hero-title">한 자루씩 단조하는<br/>STEEL &amp; GRAIN</h2>
        <div className="hero-sub">세키 공방 장인의 수제 커팅 시저. 손의 균형을 다시 설계하다.</div>
        <Link href="/sellers/steelgrain" className="hero-cta">브랜드 보기</Link>
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

export default function HomeScreen({ ranking = [], newItems = [], handmade = [], cardVariant = "meta" }) {
  return (
    <div className="byc-scroll fadein">
      <HomeHero />

      <div className="section" style={{ marginTop: 18 }}>
        <SectionHeader title="입점 브랜드" sub="미용인이 만든 브랜드를 팔로우하세요" more="전체" href="/category" />
        <BrandRail />
      </div>

      <div className="section">
        <SectionHeader title="신상품" sub="방금 입점한 도구들" more="전체" href="/category" />
        <ProductRail items={newItems} variant={cardVariant} />
      </div>

      <div className="section">
        <SectionHeader title="실시간 랭킹" sub="지금 미용인들이 담는 도구" more="더보기" href="/category" />
        <RankingList items={ranking} />
      </div>

      <div className="section">
        <SectionHeader title="이번 주 브랜드" more="전체" href="/sellers/bladebros" />
        <BrandCard id="bladebros" />
      </div>

      <div className="section">
        <SectionHeader title="핸드메이드 · 워크웨어" sub="한 점씩 만드는 셀러" more="전체" href="/sellers/foldstudio" />
        <ProductGrid items={handmade} variant={cardVariant} />
      </div>

      <HomePromo />
      <Foot />
    </div>
  );
}
