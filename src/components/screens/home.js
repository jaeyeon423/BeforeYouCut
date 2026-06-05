"use client";

import React from 'react';
import Icon from '../icons';
import { 
  Placeholder, 
  SectionHeader, 
  ProductRail, 
  ProductGrid, 
  BrandRail, 
  BrandCard 
} from '../ui';
import { won } from '../../data/data';

export function HomePromo({ onMore }) {
  return (
    <div className="banner-promo" onClick={onMore}>
      <div className="bp-kicker">SELLER STORY</div>
      <div className="bp-title">당신의 도구에도<br/>브랜드가 있습니다</div>
      <div className="bp-sub">미용인이 만든 도구를, 미용인에게. 입점 셀러 직접 판매.</div>
      <div className="bp-arrow"><Icon name="chevron" size={20} /></div>
    </div>
  );
}

export function HomeHero({ flush, onOpenSeller }) {
  return (
    <div className={"hero" + (flush ? " flush" : "")}>
      <Placeholder icon="scissors" tone="tone-b" size={88} />
      <div className="hero-overlay">
        <div className="hero-kicker">This week · 입점 브랜드</div>
        <h2 className="hero-title">한 자루씩 단조하는<br/>STEEL &amp; GRAIN</h2>
        <div className="hero-sub">세키 공방 장인의 수제 커팅 시저. 손의 균형을 다시 설계하다.</div>
        <button className="hero-cta" onClick={(e) => { e.stopPropagation(); onOpenSeller("steelgrain"); }}>브랜드 보기</button>
      </div>
    </div>
  );
}

export function RankingList({ items, onOpen, sellers }) {
  return (
    <div>
      {items.map((p, i) => (
        <div key={p.id} className="rankrow" onClick={() => onOpen(p)}>
          <div className={"rank-num" + (i < 3 ? " top" : "")}>{i + 1}</div>
          <div className="rank-media"><Placeholder icon={p.icon} tone={p.tone} size={28} /></div>
          <div className="rank-body">
            <div className="rank-brand">{sellers[p.seller]?.name || p.seller}</div>
            <div className="rank-name">{p.name}</div>
            <div className="rank-price">{won(p.price)}원</div>
          </div>
          <button className="pcard-like" style={{ position: "static", color: "var(--muted-2)" }} onClick={(e) => e.stopPropagation()}>
            <Icon name="heart" size={20} />
          </button>
        </div>
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

export default function HomeScreen({ layout, cardVariant, ctx }) {
  const { open, openSeller, likes, like, following, follow, sellers, products, ranking, byCat } = ctx;
  const newItems = products.filter((p) => p.badge === "new" || p.badge === "best").slice(0, 6);
  const handmade = byCat("핸드메이드").concat(byCat("앞치마·유니폼"));

  // shared blocks
  const brandRailBlock = (
    <div className="section" style={{ marginTop: 18 }}>
      <SectionHeader title="입점 브랜드" sub="미용인이 만든 브랜드를 팔로우하세요" more="전체" onMore={() => openSeller("steelgrain")} />
      <BrandRail onOpenSeller={openSeller} sellers={sellers} />
    </div>
  );
  const rankingBlock = (
    <div className="section">
      <SectionHeader title="실시간 랭킹" sub="지금 미용인들이 담는 도구" more="더보기" onMore={() => {}} />
      <RankingList items={ranking} onOpen={open} sellers={sellers} />
    </div>
  );
  const spotlightBlock = (
    <div className="section">
      <SectionHeader title="이번 주 브랜드" more="전체" onMore={() => openSeller("bladebros")} />
      <BrandCard id="bladebros" onOpenSeller={openSeller} following={following} onFollow={follow} sellers={sellers} />
    </div>
  );

  // ---- layout: GRID-FIRST ----
  if (layout === "grid") {
    return (
      <div className="byc-scroll fadein" key="grid">
        <div className="chiprow">
          {["추천", "신상", "랭킹", "가위", "클리퍼", "빗·브러시", "앞치마", "소모품"].map((c, i) => (
            <div key={c} className={"chip" + (i === 0 ? " active" : "")}>{c}</div>
          ))}
        </div>
        {brandRailBlock}
        <div className="section" style={{ marginTop: 24 }}>
          <SectionHeader title="전체 상품" sub={`입점 브랜드 ${Object.keys(sellers).length}곳 · ${products.length}개`} />
          <ProductGrid items={products} variant={cardVariant} onOpen={open} likes={likes} onLike={like} sellers={sellers} />
        </div>
        <HomePromo onMore={() => openSeller("steelgrain")} />
        <Foot />
      </div>
    );
  }

  // ---- layout: RANKING-LED ----
  if (layout === "ranking") {
    return (
      <div className="byc-scroll fadein" key="ranking">
        <div className="chiprow">
          {["전체", "가위", "클리퍼", "빗·브러시", "앞치마", "소모품", "핸드메이드"].map((c, i) => (
            <div key={c} className={"chip" + (i === 0 ? " active" : "")}>{c}</div>
          ))}
        </div>
        <div className="section" style={{ marginTop: 8 }}>
          <SectionHeader title="이번 주 랭킹" sub="판매·찜 기준 실시간 집계" />
          <RankingList items={ranking} onOpen={open} sellers={sellers} />
        </div>
        <div className="divider-strip" />
        {brandRailBlock}
        <div className="section">
          <SectionHeader title="신상품" more="전체" onMore={() => {}} />
          <ProductRail items={newItems} variant={cardVariant === "overlay" ? "overlay" : "minimal"} onOpen={open} likes={likes} onLike={like} sellers={sellers} />
        </div>
        <HomePromo onMore={() => openSeller("steelgrain")} />
        <Foot />
      </div>
    );
  }

  // ---- layout: MAGAZINE (default) ----
  return (
    <div className="byc-scroll fadein" key="magazine">
      <HomeHero onOpenSeller={openSeller} />
      {brandRailBlock}
      <div className="section">
        <SectionHeader title="신상품" sub="방금 입점한 도구들" more="전체" onMore={() => {}} />
        <ProductRail items={newItems} variant={cardVariant === "overlay" ? "overlay" : cardVariant} onOpen={open} likes={likes} onLike={like} sellers={sellers} />
      </div>
      {rankingBlock}
      {spotlightBlock}
      <div className="section">
        <SectionHeader title="핸드메이드 · 워크웨어" sub="한 점씩 만드는 셀러" more="전체" onMore={() => openSeller("foldstudio")} />
        <ProductGrid items={handmade.slice(0, 4)} variant={cardVariant} onOpen={open} likes={likes} onLike={like} sellers={sellers} />
      </div>
      <HomePromo onMore={() => openSeller("steelgrain")} />
      <Foot />
    </div>
  );
}
