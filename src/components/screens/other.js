"use client";

import React, { useCallback, useMemo, useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import { createClient } from '../../utils/supabase/client';
import { useApp } from '@/contexts/app-context';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import {
  createInquiry,
  getCategoryProducts,
  prepareCheckout,
  registerBuyer,
  requestSignupPhoneVerification,
  updateMyShippingProfile,
  verifySignupPhoneCode,
} from '@/app/actions';
import {
  Placeholder,
  ProductMedia,
  SectionHeader,
  ProductGrid,
  ProductRail,
  Verified,
} from '../ui';
import IntermediaryNotice from '../IntermediaryNotice';
import {
  CATEGORIES,
  CAT_ICON,
  won,
} from '../../data/data';
import { parseProductSpec, splitDetailLines } from '@/utils/product-detail';
import { Foot } from './home';

function loadTossPaymentsSdk(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("브라우저에서만 결제를 진행할 수 있습니다."));
    if (window.TossPayments) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("결제창 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("결제창 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

const KAKAO_POSTCODE_SDK_URL = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function getPostcodeConstructor() {
  if (typeof window === "undefined") return null;
  return window.kakao?.Postcode || window.daum?.Postcode || null;
}

function loadPostcodeSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("브라우저에서만 주소 검색을 사용할 수 있습니다."));
    if (getPostcodeConstructor()) return resolve();

    const existing = document.querySelector(`script[src="${KAKAO_POSTCODE_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("주소 검색 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_POSTCODE_SDK_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("주소 검색 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

async function openAddressSearch({ onSelect, onError }) {
  try {
    await loadPostcodeSdk();
    const Postcode = getPostcodeConstructor();
    if (!Postcode) throw new Error("주소 검색 SDK를 사용할 수 없습니다.");

    new Postcode({
      oncomplete(data) {
        const baseAddress = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        const extras = [];
        if (data.userSelectedType === "R") {
          if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
          if (data.buildingName && data.apartment === "Y") extras.push(data.buildingName);
        }
        const extraAddress = extras.length ? ` (${extras.join(", ")})` : "";
        const zonecode = data.zonecode ? `[${data.zonecode}] ` : "";
        onSelect(`${zonecode}${baseAddress}${extraAddress}`.trim());
      },
    }).open();
  } catch (error) {
    onError?.(error.message || "주소 검색을 열지 못했습니다.");
  }
}

function composeShippingAddress(address, addressDetail) {
  return [address, addressDetail].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
}

function categoryHref(cat, filter, tab = "category") {
  const params = new URLSearchParams();
  if (tab && tab !== "category") params.set("tab", tab);
  if (cat) params.set("cat", cat);
  if (filter) params.set("filter", filter);
  return `/category?${params.toString()}`;
}

function sortCatalogItems(items, sort) {
  const copy = [...items];
  if (sort === "price-asc") return copy.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return copy.sort((a, b) => b.price - a.price);
  if (sort === "review") return copy.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  return copy;
}

const CATEGORY_DIRECTORY = [
  {
    key: "전체",
    title: "전체",
    icon: "grid",
    sections: [
      {
        title: "도구",
        items: [
          { label: "가위", icon: "scissors", href: "/category?cat=가위" },
          { label: "클리퍼", icon: "clipper", href: "/category?cat=클리퍼" },
          { label: "빗·브러시", icon: "comb", href: "/category?cat=빗·브러시" },
          { label: "드라이기", icon: "spark", href: "/category?cat=드라이기" },
          { label: "케이스·수납", icon: "case", href: "/category?cat=케이스·수납" },
          { label: "앞치마·유니폼", icon: "apron", href: "/category?cat=앞치마·유니폼" },
        ],
      },
      {
        title: "소모품·케어",
        items: [
          { label: "소모품", icon: "bottle", href: "/category?cat=소모품" },
          { label: "염색·펌", icon: "bottle", href: "/category?cat=염색·펌" },
          { label: "샴푸·케어", icon: "bottle", href: "/category?cat=샴푸·케어" },
          { label: "소독·위생", icon: "spark", href: "/category?cat=소독·위생" },
        ],
      },
    ],
  },
  {
    key: "가위",
    title: "가위",
    icon: "scissors",
    sections: [
      {
        title: "품목별",
        items: ["커팅 시저", "틴닝/숱가위", "블렌딩 가위", "왼손 가위", "가위 오일", "가위 케이스"].map((label, index) => ({
          label,
          icon: index === 4 ? "bottle" : index === 5 ? "case" : "scissors",
        })),
      },
    ],
  },
  {
    key: "클리퍼",
    title: "클리퍼",
    icon: "clipper",
    sections: [
      {
        title: "품목별",
        items: ["바리깡", "트리머", "클리퍼 날", "클리퍼 가드", "충전기", "청소 브러시"].map((label, index) => ({
          label,
          icon: index === 5 ? "brush" : "clipper",
        })),
      },
    ],
  },
  {
    key: "빗·브러시",
    title: "빗·브러시",
    icon: "comb",
    sections: [
      {
        title: "품목별",
        items: ["커트빗", "꼬리빗", "롤브러시", "패들브러시", "염색 브러시", "더스트 브러시"].map((label, index) => ({
          label,
          icon: index > 1 ? "brush" : "comb",
        })),
      },
    ],
  },
  {
    key: "염색·펌",
    title: "염색·펌",
    icon: "bottle",
    sections: [
      {
        title: "품목별",
        items: ["염모제", "산화제", "펌제", "중화제", "블리치", "컬러차트"].map((label) => ({
          label,
          icon: "bottle",
        })),
      },
    ],
  },
  {
    key: "샴푸·케어",
    title: "샴푸·케어",
    icon: "bottle",
    sections: [
      {
        title: "품목별",
        items: ["샴푸", "트리트먼트", "두피케어", "에센스", "스타일링제", "열보호제"].map((label, index) => ({
          label,
          icon: index > 2 ? "spark" : "bottle",
        })),
      },
    ],
  },
  {
    key: "드라이기",
    title: "드라이기",
    icon: "spark",
    sections: [
      {
        title: "품목별",
        items: ["드라이어", "고데기", "아이론", "디퓨저", "열기기 거치대", "전기용품"].map((label, index) => ({
          label,
          icon: index === 4 ? "case" : "spark",
        })),
      },
    ],
  },
  {
    key: "소독·위생",
    title: "소독·위생",
    icon: "spark",
    sections: [
      {
        title: "품목별",
        items: ["소독기", "소독제", "일회용 장갑", "마스크", "타월", "넥페이퍼"].map((label, index) => ({
          label,
          icon: index < 2 ? "spark" : "bottle",
        })),
      },
    ],
  },
  {
    key: "앞치마·유니폼",
    title: "앞치마·유니폼",
    icon: "apron",
    sections: [
      {
        title: "품목별",
        items: ["커트보", "앞치마", "시술 가운", "장갑", "타월", "작업화"].map((label, index) => ({
          label,
          icon: index === 3 || index === 4 ? "spark" : "apron",
        })),
      },
    ],
  },
  {
    key: "소모품",
    title: "소모품",
    icon: "bottle",
    sections: [
      {
        title: "품목별",
        items: ["염모제", "펌제", "산화제", "샴푸/트리트먼트", "위생 소모품", "쉐이빙/제모"].map((label, index) => ({
          label,
          icon: index === 3 ? "bottle" : index === 5 ? "spark" : "bottle",
        })),
      },
    ],
  },
  {
    key: "케이스·수납",
    title: "케이스·수납",
    icon: "case",
    sections: [
      {
        title: "품목별",
        items: ["시저 케이스", "툴 롤백", "카트/트레이", "파우치", "소독함", "브러시 홀더"].map((label) => ({
          label,
          icon: "case",
        })),
      },
    ],
  },
];

function directoryItemHref(group, item) {
  return item.href || `/search?q=${encodeURIComponent(item.label)}&cat=${encodeURIComponent(group.key)}`;
}

// ============================================================
// CATEGORY
// ============================================================
export function CategoryScreen({ cat = "전체", initialItems = [], initialHasMore = false, total = 0, filter = null, tab = "category", sellers: serverSellers = [] }) {
  const { sellers: contextSellers, following, toggleFollow } = useApp();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("recommended");

  // Reset when the category or filter changes.
  useEffect(() => {
    setItems(initialItems);
    setPage(0);
    setHasMore(initialHasMore);
  }, [cat, filter, initialItems, initialHasMore]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const next = page + 1;
      const res = await getCategoryProducts(cat, next, 20, filter);
      setItems((prev) => [...prev, ...res.items]);
      setPage(next);
      setHasMore(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  let displayTitle = cat;
  if (filter === "new") {
    displayTitle = `${cat} · 신상품`;
  } else if (filter === "best") {
    displayTitle = `${cat} · 우선 검토`;
  }
  const visibleItems = sortCatalogItems(items, sort);
  const currentDirectory = CATEGORY_DIRECTORY.find((category) => category.key === cat) || CATEGORY_DIRECTORY[0];
  const sellerDirectory = useMemo(() => {
    if (serverSellers.length > 0) return serverSellers;
    return Object.values(contextSellers || {});
  }, [serverSellers, contextSellers]);
  const sellerGroups = useMemo(() => {
    const grouped = new Map();
    sellerDirectory.forEach((seller) => {
      const key = seller.category || "기타";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    const groups = Array.from(grouped.entries()).map(([key, count]) => ({ key, count }));
    if (groups.length === 0) {
      return CATEGORY_DIRECTORY.map((group) => ({ key: group.key, count: 0 }));
    }
    return [{ key: "전체", count: sellerDirectory.length }, ...groups];
  }, [sellerDirectory]);
  const activeBrandCategory = sellerGroups.some((group) => group.key === cat) ? cat : "전체";
  const visibleSellers = activeBrandCategory === "전체" ? sellerDirectory : sellerDirectory.filter((seller) => seller.category === activeBrandCategory);
  const shouldShowProducts = visibleItems.length > 0 || filter;
  const filterTabs = [
    { label: "전체", value: null },
    { label: "신상품", value: "new" },
    { label: "우선 검토", value: "best" },
  ];

  return (
    <div className="byc-scroll fadein">
      <div className="category-directory">
        <div className="directory-tabs" role="tablist" aria-label="탐색 유형">
          <Link role="tab" aria-selected={tab === "category"} href={categoryHref(cat, filter)} className={tab === "category" ? "active" : ""}>카테고리</Link>
          <Link role="tab" aria-selected={tab === "brand"} href={categoryHref(cat, null, "brand")} className={tab === "brand" ? "active" : ""}>브랜드</Link>
        </div>

        {tab === "category" ? (
          <>
            <div className="catalog-filterbar directory-filterbar">
              {filterTabs.map((filterTab) => (
                <Link key={filterTab.label} href={categoryHref(cat, filterTab.value)} className={"catalog-filter" + (filter === filterTab.value ? " active" : "")}>
                  {filterTab.label}
                </Link>
              ))}
            </div>
            <div className="directory-layout">
              <nav className="directory-rail" aria-label="카테고리 목록">
                {CATEGORY_DIRECTORY.map((group) => (
                  <Link
                    key={group.key}
                    href={categoryHref(group.key, filter)}
                    className={currentDirectory.key === group.key ? "active" : ""}
                  >
                    {group.title}
                  </Link>
                ))}
              </nav>
              <div className="directory-panel">
                <div className="directory-title">
                  <div>
                    <span className="directory-badge">{currentDirectory.title.slice(0, 1)}</span>
                    <b>{currentDirectory.title}</b>
                  </div>
                  <Icon name="chev-r-sm" size={16} />
                </div>
                <div className="directory-actions">
                  <Link href={categoryHref(currentDirectory.key, "new")}>신상품 보기</Link>
                  <Link href={categoryHref(currentDirectory.key, null)}>전체 보기</Link>
                </div>
                {currentDirectory.sections.map((section) => (
                  <section key={section.title} className="directory-section">
                    <h3>{section.title}</h3>
                    <div className="directory-grid">
                      {section.items.map((item) => (
                        <Link key={item.label} href={directoryItemHref(currentDirectory, item)} className="directory-item">
                          <span className="directory-item-icon"><Icon name={item.icon || currentDirectory.icon} size={26} stroke={1.35} /></span>
                          <b>{item.label}</b>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {shouldShowProducts && (
              <>
                <div className="divider-strip" style={{ marginTop: 14 }} />
                <div className="section" style={{ marginTop: 16 }}>
                  <div className="catalog-toolbar">
                    <div>
                      <b>{displayTitle}</b>
                      <span>{visibleItems.length}개 표시 · 총 {total}개</span>
                    </div>
                    <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="상품 정렬">
                      <option value="recommended">추천순</option>
                      <option value="price-asc">낮은 가격순</option>
                      <option value="price-desc">높은 가격순</option>
                      <option value="review">리뷰 많은순</option>
                    </select>
                  </div>
                  {visibleItems.length > 0 ? (
                    <ProductGrid items={visibleItems} variant="meta" />
                  ) : (
                    <div className="catalog-empty">
                      <b>조건에 맞는 상품이 없습니다</b>
                      <span>다른 카테고리나 필터를 선택해 보세요.</span>
                      <Link href="/category">전체 상품 보기</Link>
                    </div>
                  )}
                  {hasMore && (
                    <div style={{ padding: "20px 18px" }}>
                      <button className="btn-ghost" style={{ width: "100%", padding: 14, borderRadius: 8, border: "1px solid var(--line-strong)", background: "#fff", cursor: "pointer", fontWeight: 700 }}
                        onClick={loadMore} disabled={loading}>
                        {loading ? "불러오는 중..." : "더보기"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="directory-layout">
            <nav className="directory-rail" aria-label="브랜드 카테고리">
              {sellerGroups.map((group) => (
                <Link
                  key={group.key}
                  href={categoryHref(group.key, null, "brand")}
                  className={activeBrandCategory === group.key ? "active" : ""}
                >
                  {group.key}
                </Link>
              ))}
            </nav>
            <div className="directory-panel">
              <div className="directory-title">
                <div>
                  <span className="directory-badge">B</span>
                  <b>브랜드</b>
                </div>
                <Icon name="chev-r-sm" size={16} />
              </div>
              <div className="directory-actions">
                <Link href="/sellers">전체 브랜드 보기</Link>
                <Link href="/seller">판매자 입점</Link>
              </div>
              <section className="directory-section">
                <h3>{activeBrandCategory === "전체" ? "입점 브랜드" : `${activeBrandCategory} 브랜드`}</h3>
                {visibleSellers.length > 0 ? (
                  <div className="brand-directory-grid">
                    {visibleSellers.map((seller) => {
                      const isFollowing = following.has(seller.id);

                      return (
                        <article key={seller.id} className="brand-directory-item">
                          <Link href={`/sellers/${seller.id}`} className="brand-directory-link">
                            <span className="brand-directory-logo">
                              <Placeholder icon={CAT_ICON[seller.category] || "scissors"} tone={seller.tone || "tone-a"} size={24} />
                            </span>
                            <b>{seller.name}{seller.verified && <Verified size={12} />}</b>
                            <small>{seller.category || "기타"} · 상품 {seller.products || 0}개</small>
                          </Link>
                          <button type="button" onClick={() => toggleFollow(seller.id)} className={"brand-directory-follow" + (isFollowing ? " on" : "")}>
                            {isFollowing ? "팔로잉" : "팔로우"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="catalog-empty" style={{ margin: 0 }}>
                    <b>입점 브랜드가 없습니다</b>
                    <span>다른 브랜드 카테고리를 선택해 보세요.</span>
                    <Link href="/category?tab=brand">전체 브랜드 보기</Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
      <Foot />
    </div>
  );
}

// ============================================================
// SEARCH
// ============================================================
export function SearchScreen({ products = [] }) {
  const { sellers } = useApp();
  const [q, setQ] = useState("");
  const results = q
    ? products.filter((p) =>
        (p.name + (sellers[p.seller]?.name || p.seller) + p.cat).toLowerCase().includes(q.toLowerCase()))
    : [];
  const suggestedCategories = CATEGORIES.filter((category) => category.key !== "전체").slice(0, 7);
  const suggestedProducts = products.slice(0, 6);

  return (
    <div className="byc-scroll fadein">
      <div style={{ height: 8 }} />
      <div className="searchbar">
        <Icon name="search" size={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드, 도구, 카테고리 검색" autoFocus />
        {q && <button className="icon-btn" onClick={() => setQ("")}><Icon name="close" size={18} /></button>}
      </div>

      {!q && (
        <>
          <div className="search-section">
            <h4>추천 검색</h4>
            <div className="chiprow" style={{ padding: "0 0 4px" }}>
              {suggestedCategories.map((category) => (
                <button key={category.key} type="button" className="chip" onClick={() => setQ(category.key)}>{category.key}</button>
              ))}
            </div>
          </div>
          <div className="search-section">
            <h4>입점 브랜드</h4>
            <div className="chiprow" style={{ padding: "0 0 4px" }}>
              {Object.values(sellers).map((s) => (
                <Link key={s.id} href={`/sellers/${s.id}`} className="chip" style={{ textDecoration: "none" }}>{s.name}</Link>
              ))}
            </div>
          </div>
          {suggestedProducts.length > 0 && (
            <div className="section" style={{ marginTop: 22 }}>
              <SectionHeader title="바로 둘러볼 상품" sub="검색 전에도 구매 가능한 상품을 확인하세요" more="전체" href="/category" />
              <ProductRail items={suggestedProducts} variant="meta" />
            </div>
          )}
        </>
      )}

      {q && (
        <div className="section" style={{ marginTop: 14 }}>
          <div className="search-result-head">
            <div>
              <b>{q}</b>
              <span>{results.length}개 상품 검색됨</span>
            </div>
            <Link href={`/category?cat=${encodeURIComponent(q)}`}>카테고리 보기</Link>
          </div>
          {results.length ? (
            <ProductGrid items={results} variant="meta" />
          ) : (
            <div className="catalog-empty">
              <b>검색 결과가 없습니다</b>
              <span>상품명, 브랜드명, 카테고리를 다르게 입력해 보세요.</span>
              <Link href="/category">전체 상품 보기</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PRODUCT DETAIL
// ============================================================
const DETAIL_SPEC_SUMMARY = [
  { label: "소재/구성", keys: ["소재"] },
  { label: "치수/용량", keys: ["치수", "크기", "용량"] },
  { label: "제조국", keys: ["제조국", "원산지"] },
  { label: "인증/안전", keys: ["KC 인증 여부", "인증"] },
  { label: "A/S", keys: ["A/S 책임자", "AS 책임자"] },
];

function findSpecValue(rows, keys) {
  const found = rows.find(([key]) => keys.includes(String(key || "").trim()));
  return found ? found[1] : "";
}

export function DetailScreen({ product: p, seller, related = [] }) {
  const router = useRouter();
  const { likes, toggleLike, showToast } = useApp();
  const { addCart, replaceCart } = useCart();
  const s = seller || { id: p.seller, name: p.seller, category: "도구", followers: "0", products: 0, tone: "tone-a" };
  const [dot, setDot] = useState(0);
  const [inquireOpen, setInquireOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  const [isInquiryPending, startInquiryTransition] = useTransition();
  const liked = likes.has(p.id);
  const { rows: specRows, details } = parseProductSpec(p.spec);
  const detailIntro = details.intro || p.desc || `${s.name}가 구성한 ${p.cat} 상품입니다. 상세 정보와 판매자 안내를 확인한 뒤 주문해 주세요.`;
  const highlights = splitDetailLines(details.highlights);
  const usageTips = details.usage || "사용 후 마른 천으로 닦아 습기가 적은 곳에 보관해 주세요. 날이 있는 도구는 충격과 낙하에 주의해 주세요.";
  const shippingGuide = details.shipping || "평균 2영업일 내 출고됩니다. 도서산간 지역은 배송 기간이 더 소요될 수 있습니다.";
  const returnGuide = details.returns || "상품 수령 후 7일 이내 미사용 상품에 한해 교환/반품 신청이 가능합니다. 사용 흔적이 있거나 구성품이 훼손된 경우 제한될 수 있습니다.";
  const purchaseNotice = details.notice || "상품별 소재, 치수, 인증 대상 여부를 확인해 주세요. 수작업 상품은 미세한 마감 차이가 있을 수 있습니다.";
  const detailNarrativeSections = [
    { label: "DETAIL", title: "상품 상세 설명", body: detailIntro },
    { label: "CARE", title: "사용/관리 팁", items: splitDetailLines(usageTips) },
    { label: "DELIVERY", title: "배송 안내", items: splitDetailLines(shippingGuide) },
    { label: "RETURN", title: "교환/반품 기준", items: splitDetailLines(returnGuide) },
    { label: "CHECK", title: "구매 전 확인사항", items: splitDetailLines(purchaseNotice) },
  ];
  const specSummaryRows = DETAIL_SPEC_SUMMARY
    .map((item) => ({ label: item.label, value: findSpecValue(specRows, item.keys) }))
    .filter((item) => item.value);
  const fallbackHighlights = [
    `${s.name} 판매자가 직접 구성한 상세 정보`,
    `${p.cat} 카테고리에 맞춘 사용/관리 안내`,
    "구매 전 확인사항과 판매자 정보를 한 화면에서 확인",
  ];
  const visibleHighlights = highlights.length > 0 ? highlights : fallbackHighlights;
  const gallery = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const activeDot = gallery[dot] ? dot : 0;
  const activeImage = gallery[activeDot] || null;

  const handleAddCart = () => {
    addCart(p);
    showToast("장바구니에 담았어요");
  };

  const handleDirectOrder = () => {
    replaceCart([p]);
    router.push("/cart?checkout=1");
  };

  const handleInquireSubmit = (e) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    startInquiryTransition(async () => {
      try {
        await createInquiry({
          sellerId: s.id,
          productId: p.id,
          type: "INQUIRY",
          title: `상품 문의: ${p.name}`,
          content: inquiryText,
        });
        showToast("문의가 접수되었습니다.");
        setInquiryText("");
        setInquireOpen(false);
      } catch (error) {
        showToast(error.message || "문의 접수에 실패했습니다.");
      }
    });
  };

  return (
    <>
      <div className="byc-scroll">
        <div className="pd-media">
          <ProductMedia p={p} image={activeImage} size={92} loading="eager" />
          {p.badge && <span className={"badge " + p.badge} style={{ top: 14, left: 14 }}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
          <div className="pd-media-caption">
            <span>{gallery.length > 1 ? `${activeDot + 1} / ${gallery.length}` : "제품 이미지"}</span>
            <b>{p.name}</b>
          </div>
          {gallery.length > 1 && (
            <div className="pd-dots">
              {gallery.map((image, i) => (
                <i key={`${image}-${i}`} className={i === activeDot ? "on" : ""} onClick={() => setDot(i)} />
              ))}
            </div>
          )}
        </div>

        <div className="pd-body">
          <div className="pd-brandline">
            <Link href={`/sellers/${s.id}`} className="pd-brand" style={{ textDecoration: "none", color: "inherit" }}>{s.name}{s.verified && <Verified />}</Link>
            <button className="icon-btn"><Icon name="share" size={20} /></button>
          </div>
          <h1 className="pd-name">{p.name}</h1>
          <div className="pd-rating">
            <span className="stars"><Icon name="star" size={13} />{p.rating}</span>
            <span>리뷰 {p.reviews}</span><span>·</span><span>찜 {(p.likes ?? 0).toLocaleString()}</span>
          </div>
          <div className="pd-pricebox">
            {p.disc ? <span className="pd-disc">{p.disc}%</span> : null}
            <span className="pd-price">{won(p.price)}원</span>
            {p.orig ? <span className="pd-orig">{won(p.orig)}원</span> : null}
          </div>
          {p.desc && <p className="pd-summary">{p.desc}</p>}
          <div className="pd-trust-grid">
            <div><Icon name="ship" size={17} /><span>평균 2일 출고</span></div>
            <div><Icon name="check" size={17} /><span>판매자 직접 검수</span></div>
            <div><Icon name="store" size={17} /><span>브랜드 공식 상품</span></div>
            <div><Icon name="bell" size={17} /><span>문의 가능</span></div>
          </div>
          <div className="pd-action-row">
            <button type="button" className="pd-secondary-action" onClick={() => setInquireOpen(true)}>
              <Icon name="bell" size={17} /> 상품 문의
            </button>
            <Link href={`/sellers/${s.id}`} className="pd-secondary-action">
              <Icon name="store" size={17} /> 브랜드 보기
            </Link>
          </div>
          <div className="pd-decision-panel">
            <div className="pd-decision-row">
              <span>판매자</span>
              <b>{s.verified ? "검증 완료" : "입점 판매자"}</b>
            </div>
            <div className="pd-decision-row">
              <span>배송</span>
              <b>평균 2영업일 출고</b>
            </div>
            <div className="pd-decision-row">
              <span>교환/반품</span>
              <b>수령 후 7일 이내 신청</b>
            </div>
            <div className="pd-decision-note">결제는 PG 승인 후 주문으로 확정되며, 판매자와 상품 정보는 주문 상세에서 다시 확인할 수 있습니다.</div>
          </div>
        </div>

        <div className="pd-divider" />

        <div className="pd-detail-hero">
          <div className="pd-kicker">DETAIL STORY</div>
          <h2>{p.name}</h2>
          <p>{detailIntro}</p>
          <div className="pd-highlight-list">
            {visibleHighlights.map((item) => (
              <div key={item}><Icon name="check" size={16} /><span>{item}</span></div>
            ))}
          </div>
        </div>

        <Link href={`/sellers/${s.id}`} className="pd-sellerstrip" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="ss-logo"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={22} /></div>
          <div className="ss-info">
            <div className="ss-name">{s.name}{s.verified && <Verified size={12} />}</div>
            <div className="ss-meta">입점 셀러 · 상품 {s.products}개 · A/S 안내 확인</div>
          </div>
          <span className="btn-follow" aria-hidden="true">판매자 정보</span>
        </Link>

        <section className="pd-detail-content" aria-label="상품 상세 내용">
          <div className="pd-section-heading">
            <span>상세 내용</span>
            <h5>구매 전 확인할 핵심 정보</h5>
            <p>판매자가 입력한 상세 설명, 사용 방법, 배송과 교환/반품 기준을 결제 전 한 화면에서 확인할 수 있습니다.</p>
          </div>
          <div className="pd-detail-card-list">
            {detailNarrativeSections.map((section) => (
              <article key={section.title} className="pd-detail-card">
                <div className="pd-card-kicker">{section.label}</div>
                <h6>{section.title}</h6>
                {section.body && <p>{section.body}</p>}
                {section.items && section.items.length > 0 && (
                  <ul>
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </article>
            ))}
          </div>
          {specSummaryRows.length > 0 && (
            <div className="pd-spec-summary" aria-label="기본 상품 상세 정보">
              {specSummaryRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.value}</b>
                </div>
              ))}
            </div>
          )}
        </section>

        {specRows.length > 0 && (
          <div className="pd-block">
            <h5>상품 정보</h5>
            <dl style={{ margin: 0 }}>
              {specRows.map(([k, v]) => (
                <div key={k} className="pd-spec"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
        )}

        {/* 판매자 연락처 — 전자상거래법 제13조 판매자 정보 표시 */}
        <div className="pd-block" style={{ paddingTop: 14 }}>
          <h5 style={{ marginBottom: 10 }}>판매자 정보</h5>
          <dl style={{ margin: 0, fontSize: 12.5 }}>
            <div className="pd-spec"><dt>판매자</dt><dd>{s.businessName || s.name}</dd></div>
            {s.sellerType === "BUSINESS" && s.businessRegNo && (
              <div className="pd-spec"><dt>사업자번호</dt><dd>{s.businessRegNo}</dd></div>
            )}
            {s.representative && (
              <div className="pd-spec"><dt>대표자</dt><dd>{s.representative}</dd></div>
            )}
          </dl>
        </div>

        {/* 통신판매중개자 고지 — 전자상거래법 제20조 */}
        <div style={{ padding: "0 18px 18px" }}>
          <IntermediaryNotice seller={s} />
        </div>

        {related.length > 0 && (
          <div className="section" style={{ marginTop: 22 }}>
            <SectionHeader title={`${s.name}의 다른 상품`} more="브랜드" href={`/sellers/${s.id}`} />
            <ProductRail items={related} variant="minimal" />
          </div>
        )}
        <Foot />
      </div>

      <div className="pd-buybar">
        <button className="like-box" onClick={() => toggleLike(p.id)}>
          <Icon name="heart" size={22} fill={liked} stroke={1.8} />
          <span>{((p.likes ?? 0) + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="buy buy-subtle" onClick={handleAddCart}>장바구니</button>
        <button className="buy" onClick={handleDirectOrder}>바로 주문</button>
      </div>

      {inquireOpen && (
        <ModalSheet title="상품 문의하기" onClose={() => setInquireOpen(false)}>
          <form onSubmit={handleInquireSubmit}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>셀러: {s.name}</div>
            <textarea value={inquiryText} onChange={(e) => setInquiryText(e.target.value)}
              placeholder="문의 내용을 입력하세요 (배송, 상품 옵션 등)" required
              style={sheetTextarea} />
            <button className="buy" type="submit" style={{ width: "100%" }} disabled={isInquiryPending}>{isInquiryPending ? "전송 중..." : "문의 전송"}</button>
          </form>
        </ModalSheet>
      )}
    </>
  );
}

// ============================================================
// SELLER PROFILE
// ============================================================
export function SellerScreen({ seller, products = [] }) {
  const { showToast } = useApp();
  const s = seller || { id: "", name: "알 수 없는 브랜드", category: "도구", desc: "", followers: "0", products: 0, tone: "tone-a", story: [] };
  const [tab, setTab] = useState("상품");
  const [inquireOpen, setInquireOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  const [isInquiryPending, startInquiryTransition] = useTransition();

  const handleInquireSubmit = (e) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    startInquiryTransition(async () => {
      try {
        await createInquiry({
          sellerId: s.id,
          type: "INQUIRY",
          title: `브랜드 문의: ${s.name}`,
          content: inquiryText,
        });
        showToast("문의가 접수되었습니다.");
        setInquiryText("");
        setInquireOpen(false);
      } catch (error) {
        showToast(error.message || "문의 접수에 실패했습니다.");
      }
    });
  };

  return (
    <div className="byc-scroll fadein">
      <div className="sp-cover"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={56} /></div>
      <div className="sp-head">
        <div className="sp-logo"><Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone} size={30} /></div>
        <h1 className="sp-name">{s.name}{s.verified && <Verified size={20} />}</h1>
        <div className="sp-tagline">{s.desc} · since {s.since || "2026"}</div>
        <div className="sp-stats">
          <div className="sp-stat"><span className="num">{products.length}</span><span className="lbl">상품</span></div>
          <div className="sp-stat"><span className="num">{s.category}</span><span className="lbl">전문분야</span></div>
          <div className="sp-stat"><span className="num">{s.since || "2026"}</span><span className="lbl">입점연도</span></div>
        </div>
        <div className="sp-actions">
          <button className="btn-ghost" onClick={() => setInquireOpen(true)}>문의하기</button>
        </div>
        <div className="sp-trust-grid">
          <div><Icon name="verified" size={16} /><span>{s.verified ? "검증 판매자" : "입점 판매자"}</span></div>
          <div><Icon name="ship" size={16} /><span>배송·반품 안내</span></div>
          <div><Icon name="bell" size={16} /><span>브랜드 문의 가능</span></div>
        </div>
      </div>

      {s.notice && (
        <div className="sp-noticebar" style={{ marginTop: 18 }}>
          <span className="tag">공지</span><span>{s.notice}</span>
        </div>
      )}

      <div className="sp-tabs">
        {["상품", "제작/검수"].map((t) => (
          <button key={t} className={"sp-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "상품" && (
        <div className="section" style={{ marginTop: 18 }}>
          <ProductGrid items={products} variant="meta" />
        </div>
      )}
      {tab === "제작/검수" && (
        <div className="sp-story">
          {s.story && s.story.length > 0 ? s.story.map((para, i) => <p key={i}>{para}</p>) : <p>등록된 제작/검수 안내가 없습니다.</p>}
          <div className="tag-strip">
            {["#" + s.category, "#검수", "#A/S안내", "#since" + (s.since || "2026")].map((t) => <span key={t} className="t">{t}</span>)}
          </div>
        </div>
      )}
      <Foot />

      {inquireOpen && (
        <ModalSheet title="브랜드 문의하기" onClose={() => setInquireOpen(false)}>
          <form onSubmit={handleInquireSubmit}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>셀러: {s.name}</div>
            <textarea value={inquiryText} onChange={(e) => setInquiryText(e.target.value)}
              placeholder="문의하실 내용을 작성해 주세요." required style={sheetTextarea} />
            <button className="buy" type="submit" style={{ width: "100%" }} disabled={isInquiryPending}>{isInquiryPending ? "전송 중..." : "문의 전송"}</button>
          </form>
        </ModalSheet>
      )}
    </div>
  );
}

// ============================================================
// SAVED LIST  (auth-gated)
// ============================================================
export function SavedScreen({ products = [] }) {
  const { user, loading } = useAuth();
  const { likes } = useApp();
  const items = products.filter((p) => likes.has(p.id));

  if (!loading && !user) return <LoginPrompt message="로그인하면 저장한 도구를 볼 수 있어요." />;

  return (
    <div className="byc-scroll fadein">
      <div className="section" style={{ marginTop: 14 }}>
        <SectionHeader title="저장한 도구" sub={`${items.length}개`} />
        {items.length ? (
          <ProductGrid items={items} variant="meta" />
        ) : (
          <div style={{ padding: "70px 30px", textAlign: "center", color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ color: "var(--muted-2)", marginBottom: 12 }}><Icon name="heart" size={40} stroke={1.4} /></div>
            상품 카드의 하트를 눌러<br/>관심 도구를 저장해보세요.
          </div>
        )}
      </div>
      <Foot />
    </div>
  );
}

// ============================================================
// SHOPPING BAG & CHECKOUT
// ============================================================
export function CartScreen({ initialCheckout = false, shippingProfile = null }) {
  const router = useRouter();
  const { sellers, showToast } = useApp();
  const { user, loading: authLoading } = useAuth();
  const { cart: items, removeCart } = useCart();
  const total = items.reduce((a, p) => a + p.price, 0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutIntentHandled, setCheckoutIntentHandled] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddressDetail, setShippingAddressDetail] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shippingProfile) return;
    setBuyerName((current) => current || shippingProfile.name || "");
    setBuyerPhone((current) => current || shippingProfile.phone || "");
    setShippingAddress((current) => current || shippingProfile.address || "");
    setShippingAddressDetail((current) => current || shippingProfile.addressDetail || "");
  }, [shippingProfile]);

  useEffect(() => {
    if (!buyerName && user?.email) setBuyerName(user.email.split("@")[0]);
  }, [buyerName, user]);

  const goToLogin = useCallback(() => {
    setCheckoutOpen(false);
    router.push(`/my?auth=signin&returnTo=${encodeURIComponent("/cart?checkout=1")}`);
  }, [router]);

  useEffect(() => {
    if (!initialCheckout || checkoutIntentHandled || !items.length || authLoading) return;
    setCheckoutIntentHandled(true);
    if (!user) {
      goToLogin();
      return;
    }
    setCheckoutOpen(true);
  }, [authLoading, checkoutIntentHandled, goToLogin, initialCheckout, items.length, user]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) { alert("배송지를 입력해 주세요."); return; }
    const fullShippingAddress = composeShippingAddress(shippingAddress, shippingAddressDetail);

    setLoading(true);
    try {
      if (saveAsDefault) {
        await updateMyShippingProfile({
          name: buyerName,
          phone: buyerPhone,
          address: shippingAddress,
          addressDetail: shippingAddressDetail,
        });
      }
      const checkout = await prepareCheckout({
        name: buyerName,
        phone: buyerPhone,
        address: fullShippingAddress,
        total,
        items: items.map((p) => ({ id: p.id, name: p.name, price: p.price, seller: p.seller, icon: p.icon, tone: p.tone })),
        origin: window.location.origin,
      });
      await loadTossPaymentsSdk(checkout.sdkUrl);
      const tossPayments = window.TossPayments(checkout.clientKey);
      const payment = tossPayments.payment({ customerKey: checkout.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: checkout.amount },
        orderId: checkout.providerOrderId,
        orderName: checkout.orderName,
        successUrl: checkout.successUrl,
        failUrl: checkout.failUrl,
        customerEmail: checkout.customerEmail,
        customerName: checkout.customerName,
        customerMobilePhone: checkout.customerMobilePhone,
        card: {
          useEscrow: false,
          flowMode: "DEFAULT",
          useCardPoint: false,
          useAppCardOnly: false,
        },
      });
    } catch (err) {
      console.error(err);
      if (err?.message?.includes("로그인")) {
        goToLogin();
        return;
      }
      showToast(err.message || "결제 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="byc-scroll fadein">
        <div className="section" style={{ marginTop: 14 }}>
          <SectionHeader title="장바구니" sub={`${items.length}개`} />
          {items.length ? items.map((p, i) => (
            <div key={i} className="rankrow" style={{ borderBottom: "1px solid var(--line)" }}>
              <Link href={`/products/${p.id}`} style={{ display: "flex", gap: 14, flex: 1, minWidth: 0, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                <div className="rank-media"><ProductMedia p={p} size={28} /></div>
                <div className="rank-body">
                  <div className="rank-brand">{sellers[p.seller]?.name || p.seller}</div>
                  <div className="rank-name">{p.name}</div>
                  <div className="rank-price">{won(p.price)}원</div>
                </div>
              </Link>
              <button className="icon-btn" onClick={() => removeCart(i)}><Icon name="close" size={18} /></button>
            </div>
          )) : (
            <div style={{ padding: "70px 30px", textAlign: "center", color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ color: "var(--muted-2)", marginBottom: 12 }}><Icon name="bag" size={40} stroke={1.4} /></div>
              담은 상품이 없습니다.
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className="cart-summary-card">
            <div className="cart-summary-head">
              <b>주문 요약</b>
              <span>{items.length}개 상품</span>
            </div>
            <div className="cart-summary-line"><span>상품 금액</span><b>{won(total)}원</b></div>
            <div className="cart-summary-line"><span>배송비</span><b>판매자 정책 확인</b></div>
            <div className="cart-summary-total"><span>결제 예정 금액</span><b>{won(total)}원</b></div>
            <div className="cart-summary-note">주문자 정보와 배송지를 확인한 뒤 토스페이먼츠 결제창에서 최종 결제 수단을 선택합니다.</div>
          </div>
        )}
        <Foot />
      </div>
      {items.length > 0 && (
        <div className="pd-buybar">
          <button className="buy" onClick={() => {
            if (!user) { goToLogin(); return; }
            setCheckoutOpen(true);
          }}>{won(total)}원 · 주문하기</button>
        </div>
      )}

      {checkoutOpen && (
        <ModalSheet title="주문 / 결제하기" onClose={() => !loading && setCheckoutOpen(false)} maxHeight="85%">
          <form onSubmit={handleCheckoutSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="checkout-sheet-block">
              <label style={sheetLabel}>주문 상품</label>
              <div className="checkout-line-list">
                {items.map((item, index) => (
                  <div className="checkout-line" key={`${item.id}-${index}`}>
                    <span>{item.name}</span>
                    <b>{won(item.price)}원</b>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={sheetLabel}>주문자 정보</label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <input style={sheetInput} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required placeholder="이름" disabled={loading} />
                <input style={sheetInput} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} required placeholder="연락처" disabled={loading} />
              </div>
            </div>
            <div>
              <label style={sheetLabel}>배송지 주소</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input style={{ ...sheetInput, width: "100%" }} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} required placeholder="주소 검색 후 상세 주소를 추가해 주세요." disabled={loading} />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => openAddressSearch({ onSelect: setShippingAddress, onError: showToast })}
                  disabled={loading}
                  style={{ width: 92, border: "1px solid var(--line)", borderRadius: 6, background: "#fff", fontWeight: 800, fontSize: 12.5, cursor: loading ? "default" : "pointer" }}
                >
                  주소 찾기
                </button>
              </div>
              <input
                style={{ ...sheetInput, width: "100%", marginTop: 8 }}
                value={shippingAddressDetail}
                onChange={(e) => setShippingAddressDetail(e.target.value)}
                placeholder="상세주소 (동/호수, 층, 문 앞 요청 등)"
                disabled={loading}
              />
              {shippingProfile?.address && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>기본 배송지를 불러왔습니다.</div>
              )}
              <div style={{ marginTop: 10 }}>
                <ConsentCheckbox
                  checked={saveAsDefault}
                  onChange={setSaveAsDefault}
                  label="이 배송지를 기본 배송지로 저장"
                />
              </div>
            </div>
            <div>
              <label style={{ ...sheetLabel, marginBottom: 6, display: "block" }}>결제 수단</label>
              <div style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                카드 및 간편결제는 토스페이먼츠 결제창에서 선택합니다.
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>총 결제 금액</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "var(--accent)" }}>{won(total)}원</span>
              </div>
              <div className="checkout-agreement-note">
                주문 내용을 확인했으며 결제 진행 시 PG 승인 결과에 따라 주문이 확정됩니다.
              </div>
              <button className="buy" type="submit" style={{ width: "100%" }} disabled={loading}>
                {loading ? "결제창 준비 중..." : "결제창 열기"}
              </button>
            </div>
          </form>
        </ModalSheet>
      )}
    </>
  );
}

// ============================================================
// MY PAGE & ONBOARDING
// ============================================================
function accountRoleLabel(role) {
  const labels = {
    ADMIN: "관리자",
    SELLER: "판매자",
    BUYER: "구매자",
  };
  return labels[role] || "구매자";
}

function accountKycLabel(status) {
  const labels = {
    DRAFT: "심사 정보 작성 전",
    SUBMITTED: "심사 검토 대기",
    APPROVED: "심사 승인",
    REJECTED: "심사 반려",
  };
  return labels[status] || "입점 준비";
}

export function MyScreen({ orders = [], initialAuthMode = null, authReturnTo = null, shippingProfile = null, accountSummary = null }) {
  const router = useRouter();
  const { sellers, likes, showToast } = useApp();
  const { user, signOut } = useAuth();
  const supabase = createClient();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [authOpen, setAuthOpen] = useState(null); // 'signin' | 'signup' | null
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPhoneCode, setAuthPhoneCode] = useState("");
  const [authPhoneSent, setAuthPhoneSent] = useState(false);
  const [authPhoneVerified, setAuthPhoneVerified] = useState(false);
  const [authPhoneDebugCode, setAuthPhoneDebugCode] = useState("");
  const [authPhoneLoading, setAuthPhoneLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [shippingName, setShippingName] = useState(shippingProfile?.name || "");
  const [shippingPhone, setShippingPhone] = useState(shippingProfile?.phone || "");
  const [shippingAddress, setShippingAddress] = useState(shippingProfile?.address || "");
  const [shippingAddressDetail, setShippingAddressDetail] = useState(shippingProfile?.addressDetail || "");
  const [shippingSaving, setShippingSaving] = useState(false);
  const accountRole = accountSummary?.role || "BUYER";
  const accountName = accountSummary?.name || user?.email?.split("@")[0] || "";
  const roleLabel = accountRoleLabel(accountRole);
  const sellerSummary = accountSummary?.seller || null;
  const isAdmin = accountSummary?.isAdmin || accountRole === "ADMIN";
  const savedShippingLabel = shippingAddress ? "저장" : "미등록";
  // 회원가입 약관 동의 상태
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  useEffect(() => {
    if (!user && ["signin", "signup"].includes(initialAuthMode)) {
      setAuthOpen(initialAuthMode);
    }
  }, [initialAuthMode, user]);

  useEffect(() => {
    if (!shippingProfile) return;
    setShippingName(shippingProfile.name || "");
    setShippingPhone(shippingProfile.phone || "");
    setShippingAddress(shippingProfile.address || "");
    setShippingAddressDetail(shippingProfile.addressDetail || "");
  }, [shippingProfile]);

  const resetSignupVerification = () => {
    setAuthPhoneCode("");
    setAuthPhoneSent(false);
    setAuthPhoneVerified(false);
    setAuthPhoneDebugCode("");
  };

  const resetSignupForm = () => {
    setAuthName("");
    setAuthPhone("");
    setAuthEmail("");
    setAuthPassword("");
    setConsentTerms(false);
    setConsentPrivacy(false);
    resetSignupVerification();
  };

  const handleAuthPhoneChange = (value) => {
    setAuthPhone(value);
    if (authPhoneSent || authPhoneVerified) resetSignupVerification();
  };

  const handleRequestPhoneVerification = async () => {
    if (!authPhone.trim()) {
      alert("휴대폰 번호를 입력해 주세요.");
      return;
    }
    setAuthPhoneLoading(true);
    try {
      const result = await requestSignupPhoneVerification({ phone: authPhone });
      setAuthPhoneSent(true);
      setAuthPhoneVerified(false);
      setAuthPhoneCode("");
      setAuthPhoneDebugCode(result.debugCode || "");
      showToast("인증번호를 발송했습니다.");
    } catch (error) {
      showToast(error.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setAuthPhoneLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!authPhoneCode.trim()) {
      alert("인증번호를 입력해 주세요.");
      return;
    }
    setAuthPhoneLoading(true);
    try {
      await verifySignupPhoneCode({ phone: authPhone, code: authPhoneCode });
      setAuthPhoneVerified(true);
      setAuthPhoneDebugCode("");
      showToast("휴대폰 인증이 완료되었습니다.");
    } catch (error) {
      showToast(error.message || "휴대폰 인증에 실패했습니다.");
    } finally {
      setAuthPhoneLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    if (authOpen === "signup" && (!consentTerms || !consentPrivacy)) {
      alert("이용약관 및 개인정보처리방침에 모두 동의해 주세요.");
      return;
    }
    if (authOpen === "signup" && (!authName.trim() || !authPhone.trim())) {
      alert("이름과 연락처를 입력해 주세요.");
      return;
    }
    if (authOpen === "signup" && authName.trim().length > 50) {
      alert("이름은 50자 이하여야 합니다.");
      return;
    }
    if (authOpen === "signup" && authPhone.trim().length > 30) {
      alert("연락처는 30자 이하여야 합니다.");
      return;
    }
    if (authOpen === "signup" && !authPhoneVerified) {
      alert("휴대폰 인증을 완료해 주세요.");
      return;
    }

    setAuthLoading(true);
    if (authOpen === "signup") {
      try {
        const result = await registerBuyer({
          name: authName,
          phone: authPhone,
          email: authEmail,
          password: authPassword,
          consentedTypes: ["USER_TERMS", "PRIVACY_POLICY"],
        });
        showToast(result.emailConfirmationRequired ? "회원가입이 완료되었습니다. 이메일 확인 후 로그인해 주세요." : "회원가입이 완료되었습니다.");
        resetSignupForm();
        if (result.emailConfirmationRequired) {
          setAuthOpen("signin");
        } else {
          setAuthOpen(null);
          router.refresh();
        }
      } catch (error) {
        alert("회원가입 에러: " + (error.message || "회원가입에 실패했습니다."));
      } finally {
        setAuthLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      setAuthLoading(false);
      if (error) { alert("로그인 에러: " + error.message); }
      else {
        showToast("로그인에 성공했습니다!");
        setAuthOpen(null);
        setAuthEmail("");
        setAuthPassword("");
        if (authReturnTo) router.push(authReturnTo);
        else router.refresh();
      }
    }
  };

  const handleShippingProfileSubmit = async (e) => {
    e.preventDefault();
    setShippingSaving(true);
    try {
      const result = await updateMyShippingProfile({
        name: shippingName,
        phone: shippingPhone,
        address: shippingAddress,
        addressDetail: shippingAddressDetail,
      });
      if (result?.profile) {
        setShippingName(result.profile.name || "");
        setShippingPhone(result.profile.phone || "");
        setShippingAddress(result.profile.address || "");
        setShippingAddressDetail(result.profile.addressDetail || "");
      }
      showToast("기본 배송지를 저장했습니다.");
      setSettingsOpen(false);
      router.refresh();
    } catch (error) {
      showToast(error.message || "배송지 저장에 실패했습니다.");
    } finally {
      setShippingSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast("로그아웃되었습니다.");
    } catch (err) {
      alert("로그아웃 에러: " + err.message);
    }
  };

  const openSellerCenter = () => {
    if (!user) {
      showToast("로그인이 필요한 서비스입니다.");
      setAuthOpen("signin");
      return;
    }
    router.push("/seller");
  };

  const openAdminConsole = () => {
    if (!user) {
      setAuthOpen("signin");
      return;
    }
    if (!isAdmin) {
      showToast("관리자 권한이 필요한 화면입니다.");
      return;
    }
    router.push("/admin");
  };

  const menuItems = [
    { label: "주문 내역", action: () => setHistoryOpen(true) },
    { label: "저장한 도구", action: () => router.push("/saved") },
    { label: "판매자 센터", action: openSellerCenter },
    ...(isAdmin ? [{ label: "관리자 콘솔", action: openAdminConsole }] : []),
    { label: "고객센터", action: () => {} },
    { label: "설정", action: () => {
      if (!user) { setAuthOpen("signin"); return; }
      setSettingsOpen(true);
    } },
  ];

  return (
    <div className="byc-scroll fadein">
      {user ? (
        <div style={{ padding: "26px 18px 6px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={avatarBox}><Icon name="user" size={30} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{accountName || user.email.split('@')[0]} 님</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{roleLabel} 계정 · {accountSummary?.email || user.email}</div>
          </div>
          <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 11, background: "none", border: "1px solid var(--line)" }} onClick={handleSignOut}>로그아웃</button>
        </div>
      ) : (
        <div style={{ padding: "26px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={avatarBox}><Icon name="user" size={30} /></div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>게스트 사용자</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>로그인 시 나만의 정보를 연동합니다.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="buy" style={{ flex: 1, padding: "10px 0", height: "auto", fontSize: 13 }} onClick={() => setAuthOpen("signin")}>로그인</button>
            <button className="btn-ghost" style={{ flex: 1, padding: "10px 0", height: "auto", fontSize: 13, border: "1px solid var(--line)" }} onClick={() => { resetSignupForm(); setAuthOpen("signup"); }}>회원가입</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", margin: "18px", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {[
          ["주문", String(orders.length), () => setHistoryOpen(true)],
          ["저장", String(likes.size), () => router.push("/saved")],
          ["배송지", savedShippingLabel, () => {
            if (!user) { setAuthOpen("signin"); return; }
            setSettingsOpen(true);
          }],
        ].map(([l, v, action], i) => (
          <div key={l} onClick={action || undefined}
            style={{ flex: 1, padding: "16px 0", textAlign: "center", borderLeft: i ? "1px solid var(--line)" : "none", cursor: action ? "pointer" : "default" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="account-focus-card">
        <div className="account-focus-head">
          <div>
            <div className="account-focus-kicker">BUYER ACCOUNT</div>
            <h2>구매 정보</h2>
          </div>
          <Icon name="bag" size={22} />
        </div>
        <div className="account-focus-grid">
          <button type="button" onClick={() => setHistoryOpen(true)}>
            <b>{orders.length}건</b>
            <span>주문 내역</span>
          </button>
          <button type="button" onClick={() => router.push("/saved")}>
            <b>{likes.size}개</b>
            <span>저장 상품</span>
          </button>
        </div>
        <div className="account-address-row">
          <div>
            <b>기본 배송지</b>
            <span>{shippingAddress ? composeShippingAddress(shippingAddress, shippingAddressDetail) : "저장된 배송지가 없습니다"}</span>
          </div>
          <button type="button" onClick={() => {
            if (!user) { setAuthOpen("signin"); return; }
            setSettingsOpen(true);
          }}>
            {shippingAddress ? "수정" : "등록"}
          </button>
        </div>
      </div>

      <div className="account-role-hub">
        <div className="account-role-head">
          <div>
            <div className="account-focus-kicker">ROLE HUB</div>
            <h2>역할별 화면</h2>
          </div>
          <span>{user ? roleLabel : "게스트"}</span>
        </div>
        <div className="account-role-grid">
          <button type="button" className="account-role-card active" onClick={() => setHistoryOpen(true)}>
            <Icon name="bag" size={19} />
            <b>구매자</b>
            <span>{orders.length}건 주문 · {likes.size}개 저장</span>
          </button>
          <button type="button" className="account-role-card" onClick={openSellerCenter}>
            <Icon name="store" size={19} />
            <b>{sellerSummary ? "판매자 센터" : "판매자 입점"}</b>
            <span>{sellerSummary ? `${sellerSummary.name} · ${accountKycLabel(sellerSummary.kycStatus)}` : "입점 신청, 상품, 주문, 정산 관리"}</span>
          </button>
          {isAdmin && (
            <button type="button" className="account-role-card admin" onClick={openAdminConsole}>
              <Icon name="lock" size={19} />
              <b>관리자 콘솔</b>
              <span>상품 검수, KYC, 환불, 정산, CS 처리</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {menuItems.map((item, i) => (
          <div key={item.label} onClick={item.action}
            style={{ display: "flex", alignItems: "center", padding: "16px 18px", borderTop: i === 0 ? "1px solid var(--line)" : "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
            <span style={{ flex: 1, fontSize: 14, letterSpacing: "-0.02em" }}>{item.label}</span>
            <span style={{ color: "var(--muted-2)" }}><Icon name="chev-r-sm" size={16} /></span>
          </div>
        ))}
      </div>
      <Foot />

      {historyOpen && (
        <ModalSheet title="주문 내역" onClose={() => setHistoryOpen(false)} maxHeight="85%">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {orders.length > 0 ? orders.map((ord) => (
              <div key={ord.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{ord.id.slice(0, 8)}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{ord.date}</span>
                </div>
                {ord.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                      <ProductMedia p={item} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{sellers[item.seller]?.name || item.seller}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{won(item.price)}원</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: "var(--ink-soft)" }}>배송상태: <b>{ord.status}</b></span>
                  <span style={{ fontWeight: 800 }}>총 {won(ord.total)}원</span>
                </div>
                <Link
                  href={`/orders/${ord.id}`}
                  onClick={() => setHistoryOpen(false)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, fontWeight: 800, color: "var(--ink)", textDecoration: "none" }}
                >
                  주문 상세 보기 <Icon name="chev-r-sm" size={14} />
                </Link>
              </div>
            )) : (
              <div style={{ padding: "50px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>주문하신 내역이 없습니다.</div>
            )}
          </div>
        </ModalSheet>
      )}

      {settingsOpen && (
        <ModalSheet title="배송지 설정" onClose={() => !shippingSaving && setSettingsOpen(false)}>
          <form onSubmit={handleShippingProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={sheetLabel}>기본 수령인</label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <input style={sheetInput} value={shippingName} onChange={(e) => setShippingName(e.target.value)} required placeholder="이름" disabled={shippingSaving} />
                <input style={sheetInput} value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} required placeholder="연락처" disabled={shippingSaving} />
              </div>
            </div>
            <div>
              <label style={sheetLabel}>기본 배송지</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input style={{ ...sheetInput, width: "100%" }} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} required placeholder="주소 검색 후 상세 주소를 추가해 주세요." disabled={shippingSaving} />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => openAddressSearch({ onSelect: setShippingAddress, onError: showToast })}
                  disabled={shippingSaving}
                  style={{ width: 92, border: "1px solid var(--line)", borderRadius: 6, background: "#fff", fontWeight: 800, fontSize: 12.5, cursor: shippingSaving ? "default" : "pointer" }}
                >
                  주소 찾기
                </button>
              </div>
              <input
                style={{ ...sheetInput, width: "100%", marginTop: 8 }}
                value={shippingAddressDetail}
                onChange={(e) => setShippingAddressDetail(e.target.value)}
                placeholder="상세주소 (동/호수, 층, 문 앞 요청 등)"
                disabled={shippingSaving}
              />
            </div>
            <button className="buy" type="submit" style={{ width: "100%" }} disabled={shippingSaving}>
              {shippingSaving ? "저장 중..." : "기본 배송지 저장"}
            </button>
          </form>
        </ModalSheet>
      )}

      {authOpen && (
        <ModalSheet title={authOpen === "signin" ? "로그인" : "회원가입"} onClose={() => !authLoading && setAuthOpen(null)}>
          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {authOpen === "signup" && (
              <div>
                <label style={sheetLabel}>기본 정보</label>
                <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                  <input style={sheetInput} value={authName} onChange={(e) => setAuthName(e.target.value)} required placeholder="이름" disabled={authLoading} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...sheetInput, width: "100%" }}
                      value={authPhone}
                      onChange={(e) => handleAuthPhoneChange(e.target.value)}
                      required
                      placeholder="휴대폰 번호"
                      disabled={authLoading || authPhoneLoading || authPhoneVerified}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={handleRequestPhoneVerification}
                      disabled={authLoading || authPhoneLoading || authPhoneVerified}
                      style={{ width: 98, border: "1px solid var(--line)", borderRadius: 6, background: "#fff", fontWeight: 800, fontSize: 12.5, cursor: authLoading || authPhoneLoading || authPhoneVerified ? "default" : "pointer" }}
                    >
                      {authPhoneSent ? "재전송" : "인증요청"}
                    </button>
                  </div>
                  {authPhoneSent && !authPhoneVerified && (
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={sheetLabel}>SMS 인증번호</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          style={{ ...sheetInput, width: "100%" }}
                          value={authPhoneCode}
                          onChange={(e) => setAuthPhoneCode(e.target.value)}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="인증번호 6자리"
                          disabled={authLoading || authPhoneLoading}
                        />
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={handleVerifyPhoneCode}
                          disabled={authLoading || authPhoneLoading}
                          style={{ width: 98, border: "1px solid var(--line)", borderRadius: 6, background: "#fff", fontWeight: 800, fontSize: 12.5, cursor: authLoading || authPhoneLoading ? "default" : "pointer" }}
                        >
                          확인
                        </button>
                      </div>
                    </div>
                  )}
                  {authPhoneDebugCode && (
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>개발용 인증번호: {authPhoneDebugCode}</div>
                  )}
                  {authPhoneVerified && (
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 800 }}>휴대폰 인증 완료</div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label style={sheetLabel}>이메일 주소</label>
              <input style={{ ...sheetInput, width: "100%", marginTop: 6 }} type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="email@example.com" disabled={authLoading || (authOpen === "signup" && !authPhoneVerified)} />
            </div>
            <div>
              <label style={sheetLabel}>비밀번호 (6자 이상)</label>
              <input style={{ ...sheetInput, width: "100%", marginTop: 6 }} type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" disabled={authLoading || (authOpen === "signup" && !authPhoneVerified)} minLength={6} />
            </div>
            {/* 회원가입 약관 동의 — 개인정보보호법 제22조 */}
            {authOpen === "signup" && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <ConsentCheckbox
                  checked={consentTerms && consentPrivacy}
                  onChange={(v) => { setConsentTerms(v); setConsentPrivacy(v); }}
                  label="전체 동의"
                  bold
                />
                <ConsentCheckbox
                  checked={consentTerms}
                  onChange={setConsentTerms}
                  label={<span>[필수] <a href="/terms" target="_blank" style={linkBtn}>이용약관</a> 동의</span>}
                />
                <ConsentCheckbox
                  checked={consentPrivacy}
                  onChange={setConsentPrivacy}
                  label={<span>[필수] <a href="/terms/privacy" target="_blank" style={linkBtn}>개인정보처리방침</a> 동의</span>}
                />
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <button className="buy" type="submit" style={{ width: "100%" }} disabled={authLoading || authPhoneLoading || (authOpen === "signup" && !authPhoneVerified)}>
                {authLoading ? "처리 중..." : authOpen === "signin" ? "로그인하기" : authPhoneVerified ? "가입하기" : "휴대폰 인증 필요"}
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 12.5, color: "var(--ink-soft)" }}>
              {authOpen === "signin" ? (
                <span>계정이 없으신가요? <button type="button" style={linkBtn} onClick={() => { resetSignupForm(); setAuthOpen("signup"); }}>회원가입</button></span>
              ) : (
                <span>이미 계정이 있으신가요? <button type="button" style={linkBtn} onClick={() => { resetSignupForm(); setAuthOpen("signin"); }}>로그인</button></span>
              )}
            </div>
          </form>
        </ModalSheet>
      )}
    </div>
  );
}

// ============================================================
// Shared bits
// ============================================================
function LoginPrompt({ message }) {
  return (
    <div className="byc-scroll fadein">
      <div style={{ padding: "90px 30px", textAlign: "center", color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ color: "var(--muted-2)", marginBottom: 14 }}><Icon name="user" size={40} stroke={1.4} /></div>
        {message}
        <div style={{ marginTop: 20 }}>
          <Link href="/my" className="buy" style={{ display: "inline-block", padding: "10px 24px", height: "auto", textDecoration: "none" }}>로그인하러 가기</Link>
        </div>
      </div>
    </div>
  );
}

function ModalSheet({ title, onClose, maxHeight, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}>
      <div className="fadein" style={{ width: "100%", background: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: "24px 18px 30px", boxSizing: "border-box", maxHeight, overflowY: maxHeight ? "auto" : "visible" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConsentCheckbox({ checked, onChange, label, bold }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "var(--ink)", flexShrink: 0 }}
      />
      <span style={{ fontSize: bold ? 12.5 : 12, fontWeight: bold ? 700 : 400, color: "var(--ink-soft)" }}>
        {label}
      </span>
    </label>
  );
}

const sheetLabel = { fontSize: 12, fontWeight: 700, color: "var(--muted)" };
const sheetInput = { border: "1px solid var(--line)", background: "var(--surface)", margin: 0, flex: 1, padding: 10, borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" };
const sheetTextarea = { width: "100%", height: 120, borderRadius: 8, border: "1px solid var(--line)", padding: 12, boxSizing: "border-box", fontFamily: "inherit", fontSize: 13, outline: "none", resize: "none", marginBottom: 18 };
const avatarBox = { width: 60, height: 60, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" };
const linkBtn = { background: "none", border: "none", color: "var(--ink)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" };
