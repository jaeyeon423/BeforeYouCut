import React from 'react';
import Link from 'next/link';
import Icon from '../icons';
import {
  Placeholder,
  ProductMedia,
  SectionHeader,
  ProductRail,
} from '../ui';
import { won } from '../../data/data';
import { CAT_ICON } from '../../data/data';
import BusinessFooter from '../BusinessFooter';



export function HomeHero({ seller, banner }) {
  if (!seller) {
    const kicker = banner?.kicker || "MIYONGSA";
    const title = banner?.title || "미용 전문가를 위한\n검수 도구 마켓";
    const desc = banner?.desc || "가위, 클리퍼, 앞치마, 소모품을 판매자 정보와 배송 기준까지 확인하고 구매하세요.";
    const ctaText = banner?.ctaText || "도구 둘러보기";
    const ctaLink = banner?.ctaLink || "/category";
    const icon = banner?.icon || "scissors";
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
        <div className="hero-kicker">검수 브랜드</div>
        <h2 className="hero-title">{seller.name}</h2>
        <div className="hero-sub">{seller.desc} · 판매자 정보와 A/S 기준 확인</div>
        <Link href={`/sellers/${seller.id}`} className="hero-cta">브랜드 보기</Link>
      </div>
    </div>
  );
}

function BuyerTrustStrip() {
  const items = [
    { icon: "verified", title: "입점 판매자", desc: "상품별 판매자 정보 확인" },
    { icon: "ship", title: "배송 기준", desc: "주문 전 배송·반품 안내" },
    { icon: "lock", title: "안전 결제", desc: "PG 승인 후 주문 생성" },
  ];

  return (
    <div className="buyer-trust-strip">
      {items.map((item) => (
        <div className="buyer-trust-item" key={item.title}>
          <span className="buyer-trust-icon"><Icon name={item.icon} size={17} /></span>
          <b>{item.title}</b>
          <span>{item.desc}</span>
        </div>
      ))}
    </div>
  );
}

function BuyerQuickActions() {
  const actions = [
    { href: "/category", icon: "grid", title: "카테고리", desc: "필요한 도구부터 찾기" },
    { href: "/sellers", icon: "store", title: "브랜드", desc: "입점 판매자 확인" },
    { href: "/my", icon: "user", title: "배송지", desc: "기본 정보 관리" },
  ];

  return (
    <div className="buyer-action-grid">
      {actions.map((action) => (
        <Link href={action.href} className="buyer-action" key={action.title}>
          <Icon name={action.icon} size={20} />
          <div>
            <b>{action.title}</b>
            <span>{action.desc}</span>
          </div>
          <Icon name="chev-r-sm" size={15} />
        </Link>
      ))}
    </div>
  );
}

function EmptyRetailBlock({ title, desc, href, action }) {
  return (
    <div className="retail-empty">
      <b>{title}</b>
      <span>{desc}</span>
      {href && <Link href={href}>{action}</Link>}
    </div>
  );
}

export function PriorityToolList({ items }) {
  return (
    <div>
      {items.map((p, i) => (
        <Link key={p.id} href={`/products/${p.id}`} className="rankrow" style={{ textDecoration: "none", color: "inherit" }}>
          <div className={"rank-num" + (i < 3 ? " top" : "")}>{i + 1}</div>
          <div className="rank-media"><ProductMedia p={p} size={28} /></div>
          <div className="rank-body">
            <div className="rank-brand">{p.sellerName || p.seller}</div>
            <div className="rank-name">{p.name}</div>
            <div className="rank-price">{won(p.price)}원</div>
          </div>
          <span className="pcard-like" style={{ position: "static", color: "var(--muted-2)" }} aria-hidden="true">
            <Icon name="chev-r-sm" size={20} />
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
      <BuyerTrustStrip />

      <div className="section" style={{ marginTop: 18 }}>
        <SectionHeader title="새로 입점한 전문 도구" sub="스펙, 판매자, 배송 기준을 함께 확인하세요" more="전체" href="/category?filter=new" />
        {newItems.length > 0 ? (
          <ProductRail items={newItems} variant={cardVariant} />
        ) : (
          <EmptyRetailBlock title="등록된 공개 상품이 없습니다" desc="관리자 승인 후 구매 가능한 상품이 노출됩니다." href="/category" action="카테고리 보기" />
        )}
      </div>

      <div className="section">
        <SectionHeader title="구매 전 비교할 도구" sub="가격, 상세 스펙, 판매자 신뢰 정보를 확인하세요" more="더보기" href="/category?filter=best" />
        {ranking.length > 0 ? (
          <PriorityToolList items={ranking} />
        ) : (
          <EmptyRetailBlock title="비교할 상품 데이터가 부족합니다" desc="상품과 주문 데이터가 쌓이면 우선 검토 목록이 채워집니다." href="/category" action="전체 상품 보기" />
        )}
      </div>

      <div className="section">
        <SectionHeader title="쇼핑 바로가기" sub="구매 전에 자주 확인하는 메뉴" />
        <BuyerQuickActions />
      </div>

      <Foot />
    </div>
  );
}
