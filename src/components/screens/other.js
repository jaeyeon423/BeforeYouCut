"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import { createClient } from '../../utils/supabase/client';
import { useApp } from '@/contexts/app-context';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import {
  createOrder,
  getCategoryProducts,
  recordConsents,
} from '@/app/actions';
import {
  Placeholder,
  SectionHeader,
  ProductGrid,
  ProductRail,
  Verified,
} from '../ui';
import IntermediaryNotice from '../IntermediaryNotice';
import {
  CATEGORIES,
  CAT_ICON,
  POPULAR_KEYWORDS,
  won,
} from '../../data/data';
import { parseProductSpec, splitDetailLines } from '@/utils/product-detail';
import { Foot } from './home';

// ============================================================
// CATEGORY
// ============================================================
export function CategoryScreen({ cat = "전체", initialItems = [], initialHasMore = false, total = 0, filter = null }) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="byc-scroll fadein">
      <div className="section" style={{ marginTop: 8 }}>
        <div className="catgrid">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/category?cat=${encodeURIComponent(c.key)}${filter ? `&filter=${filter}` : ""}`}
              className="catcell"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cat-ico" style={cat === c.key ? { background: "var(--ink)", color: "#fff" } : null}>
                <Icon name={c.icon} size={26} stroke={1.5} />
              </div>
              <div className="cat-label">{c.key}</div>
            </Link>
          ))}
        </div>
      </div>
      <div className="divider-strip" style={{ marginTop: 20 }} />
      <div className="section" style={{ marginTop: 16 }}>
        <SectionHeader title={displayTitle} sub={`${total}개 상품`} />
        <ProductGrid items={items} variant="meta" />
        {hasMore && (
          <div style={{ padding: "20px 18px" }}>
            <button className="btn-ghost" style={{ width: "100%", padding: 14, borderRadius: 8, border: "1px solid var(--line-strong)", background: "#fff", cursor: "pointer", fontWeight: 700 }}
              onClick={loadMore} disabled={loading}>
              {loading ? "불러오는 중..." : "더보기"}
            </button>
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
          {POPULAR_KEYWORDS && POPULAR_KEYWORDS.length > 0 && (
            <div className="search-section">
              <h4>인기 검색어 <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>오후 3:00 기준</span></h4>
              <div className="kwlist">
                {POPULAR_KEYWORDS.map(([w, d], i) => (
                  <div key={w} className="kwrow" onClick={() => setQ(w)}>
                    <span className="kw-rank">{i + 1}</span>
                    <span className="kw-text">{w}</span>
                    <span className="kw-delta" style={d === "NEW" ? { color: "var(--accent)", fontWeight: 700 } : null}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="search-section">
            <h4>브랜드 바로가기</h4>
            <div className="chiprow" style={{ padding: "0 0 4px" }}>
              {Object.values(sellers).map((s) => (
                <Link key={s.id} href={`/sellers/${s.id}`} className="chip" style={{ textDecoration: "none" }}>{s.name}</Link>
              ))}
            </div>
          </div>
        </>
      )}

      {q && (
        <div className="section" style={{ marginTop: 14 }}>
          <SectionHeader title={`'${q}' 검색 결과`} sub={`${results.length}개`} />
          {results.length ? (
            <ProductGrid items={results} variant="meta" />
          ) : (
            <div style={{ padding: "60px 18px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              검색 결과가 없습니다.
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
export function DetailScreen({ product: p, seller, related = [] }) {
  const { likes, toggleLike, showToast } = useApp();
  const { addCart } = useCart();
  const s = seller || { id: p.seller, name: p.seller, category: "도구", followers: "0", products: 0, tone: "tone-a" };
  const [dot, setDot] = useState(0);
  const [inquireOpen, setInquireOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  const liked = likes.has(p.id);
  const { rows: specRows, details } = parseProductSpec(p.spec);
  const detailIntro = details.intro || p.desc || `${s.name}가 구성한 ${p.cat} 상품입니다. 상세 정보와 판매자 안내를 확인한 뒤 주문해 주세요.`;
  const highlights = splitDetailLines(details.highlights);
  const usageTips = details.usage || "사용 후 마른 천으로 닦아 습기가 적은 곳에 보관해 주세요. 날이 있는 도구는 충격과 낙하에 주의해 주세요.";
  const shippingGuide = details.shipping || "평균 2영업일 내 출고됩니다. 도서산간 지역은 배송 기간이 더 소요될 수 있습니다.";
  const returnGuide = details.returns || "상품 수령 후 7일 이내 미사용 상품에 한해 교환/반품 신청이 가능합니다. 사용 흔적이 있거나 구성품이 훼손된 경우 제한될 수 있습니다.";
  const purchaseNotice = details.notice || "상품별 소재, 치수, 인증 대상 여부를 확인해 주세요. 수작업 상품은 미세한 마감 차이가 있을 수 있습니다.";
  const fallbackHighlights = [
    `${s.name} 판매자가 직접 구성한 상세 정보`,
    `${p.cat} 카테고리에 맞춘 사용/관리 안내`,
    "구매 전 확인사항과 판매자 정보를 한 화면에서 확인",
  ];
  const visibleHighlights = highlights.length > 0 ? highlights : fallbackHighlights;
  const mediaCaptions = ["제품 전체", "사용 포인트", "구성 정보"];

  const handleInquireSubmit = (e) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    showToast("문의가 셀러에게 전송되었습니다.");
    setInquiryText("");
    setInquireOpen(false);
  };

  return (
    <>
      <div className="byc-scroll">
        <div className="pd-media">
          <Placeholder icon={p.icon} tone={p.tone} size={92} />
          {p.badge && <span className={"badge " + p.badge} style={{ top: 14, left: 14 }}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
          <div className="pd-media-caption">
            <span>{mediaCaptions[dot]}</span>
            <b>{p.name}</b>
          </div>
          <div className="pd-dots">{[0, 1, 2].map((i) => <i key={i} className={i === dot ? "on" : ""} onClick={() => setDot(i)} />)}</div>
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

        <div className="pd-block">
          <h5>사용과 관리</h5>
          <p className="pd-paragraph">{usageTips}</p>
        </div>

        <div className="pd-block">
          <h5>배송 · 교환 · 반품</h5>
          <div className="pd-guide-grid">
            <div>
              <b>배송 안내</b>
              <p>{shippingGuide}</p>
            </div>
            <div>
              <b>교환/반품</b>
              <p>{returnGuide}</p>
            </div>
          </div>
        </div>

        <div className="pd-block">
          <h5>구매 전 확인사항</h5>
          <p className="pd-paragraph">{purchaseNotice}</p>
        </div>

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
        <button className="buy" onClick={() => { addCart(p); showToast("장바구니에 담았어요"); }}>장바구니 담기</button>
      </div>

      {inquireOpen && (
        <ModalSheet title="상품 문의하기" onClose={() => setInquireOpen(false)}>
          <form onSubmit={handleInquireSubmit}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>셀러: {s.name}</div>
            <textarea value={inquiryText} onChange={(e) => setInquiryText(e.target.value)}
              placeholder="문의 내용을 입력하세요 (배송, 상품 옵션 등)" required
              style={sheetTextarea} />
            <button className="buy" type="submit" style={{ width: "100%" }}>문의 전송</button>
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

  const handleInquireSubmit = (e) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    showToast("셀러에게 문의 메세지가 전송되었습니다.");
    setInquiryText("");
    setInquireOpen(false);
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
            <button className="buy" type="submit" style={{ width: "100%" }}>문의 전송</button>
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
export function CartScreen() {
  const router = useRouter();
  const { sellers, showToast } = useApp();
  const { user } = useAuth();
  const { cart: items, removeCart, clearCart } = useCart();
  const total = items.reduce((a, p) => a + p.price, 0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("010-1234-5678");
  const [shippingAddress, setShippingAddress] = useState("");
  const [payMethod, setPayMethod] = useState("카드결제");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setBuyerName(user.email.split("@")[0]);
  }, [user]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) { alert("배송지를 입력해 주세요."); return; }

    setLoading(true);
    try {
      const res = await createOrder({
        name: buyerName,
        address: shippingAddress,
        total,
        items: items.map((p) => ({ id: p.id, name: p.name, price: p.price, seller: p.seller, icon: p.icon, tone: p.tone })),
      });
      if (res?.success) {
        clearCart();
        setCheckoutOpen(false);
        showToast("주문 및 결제가 완료되었습니다!");
        router.push("/my");
      }
    } catch (err) {
      console.error(err);
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
                <div className="rank-media"><Placeholder icon={p.icon} tone={p.tone} size={28} /></div>
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
        <Foot />
      </div>
      {items.length > 0 && (
        <div className="pd-buybar">
          <button className="buy" onClick={() => {
            if (!user) { showToast("로그인이 필요한 서비스입니다."); return; }
            setCheckoutOpen(true);
          }}>{won(total)}원 · 주문하기</button>
        </div>
      )}

      {checkoutOpen && (
        <ModalSheet title="주문 / 결제하기" onClose={() => !loading && setCheckoutOpen(false)} maxHeight="85%">
          <form onSubmit={handleCheckoutSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={sheetLabel}>주문자 정보</label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <input style={sheetInput} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required placeholder="이름" disabled={loading} />
                <input style={sheetInput} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} required placeholder="연락처" disabled={loading} />
              </div>
            </div>
            <div>
              <label style={sheetLabel}>배송지 주소</label>
              <input style={{ ...sheetInput, width: "100%", marginTop: 6 }} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} required placeholder="배송지 주소를 상세히 입력해 주세요." disabled={loading} />
            </div>
            <div>
              <label style={{ ...sheetLabel, marginBottom: 6, display: "block" }}>결제 수단</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["카드결제", "토스페이", "카카오페이"].map((m) => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)} disabled={loading}
                    style={{
                      flex: 1, padding: "10px 0", fontSize: 12.5, fontWeight: 600,
                      border: payMethod === m ? "1.5px solid var(--ink)" : "1px solid var(--line)",
                      borderRadius: 6, background: payMethod === m ? "var(--ink)" : "#fff",
                      color: payMethod === m ? "#fff" : "var(--ink-soft)", cursor: "pointer",
                    }}>{m}</button>
                ))}
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>총 결제 금액</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "var(--accent)" }}>{won(total)}원</span>
              </div>
              <button className="buy" type="submit" style={{ width: "100%" }} disabled={loading}>
                {loading ? "결제 진행 중..." : "결제하기"}
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
export function MyScreen({ orders = [] }) {
  const router = useRouter();
  const { sellers, likes, showToast } = useApp();
  const { user, signOut } = useAuth();
  const supabase = createClient();

  const [historyOpen, setHistoryOpen] = useState(false);

  const [authOpen, setAuthOpen] = useState(null); // 'signin' | 'signup' | null
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  // 회원가입 약관 동의 상태
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    if (authOpen === "signup" && (!consentTerms || !consentPrivacy)) {
      alert("이용약관 및 개인정보처리방침에 모두 동의해 주세요.");
      return;
    }

    setAuthLoading(true);
    if (authOpen === "signup") {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { name: authEmail.split("@")[0] } },
      });
      setAuthLoading(false);
      if (error) { alert("회원가입 에러: " + error.message); }
      else {
        // 동의 이력 서버 저장 (비동기 — 실패해도 가입 흐름 중단 안 함)
        recordConsents({
          consentedTypes: ["USER_TERMS", "PRIVACY_POLICY"],
        }).catch((e) => console.error("consent record failed:", e));
        showToast("회원가입이 완료되었습니다. 로그인해 주세요.");
        setConsentTerms(false);
        setConsentPrivacy(false);
        setAuthOpen("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      setAuthLoading(false);
      if (error) { alert("로그인 에러: " + error.message); }
      else { showToast("로그인에 성공했습니다!"); setAuthOpen(null); setAuthEmail(""); setAuthPassword(""); }
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

  return (
    <div className="byc-scroll fadein">
      {user ? (
        <div style={{ padding: "26px 18px 6px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={avatarBox}><Icon name="user" size={30} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{user.email.split('@')[0]} 님</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>일반회원 · {user.email}</div>
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
            <button className="btn-ghost" style={{ flex: 1, padding: "10px 0", height: "auto", fontSize: 13, border: "1px solid var(--line)" }} onClick={() => setAuthOpen("signup")}>회원가입</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", margin: "18px", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {[
          ["주문", String(orders.length), () => setHistoryOpen(true)],
          ["저장", String(likes.size), () => router.push("/saved")],
          ["판매자", "센터", () => {
            if (!user) { showToast("로그인이 필요한 서비스입니다."); return; }
            router.push("/seller");
          }],
        ].map(([l, v, action], i) => (
          <div key={l} onClick={action || undefined}
            style={{ flex: 1, padding: "16px 0", textAlign: "center", borderLeft: i ? "1px solid var(--line)" : "none", cursor: action ? "pointer" : "default" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="banner-promo" style={{ margin: "8px 18px 0", cursor: "pointer" }} onClick={() => {
        if (!user) { showToast("로그인이 필요한 서비스입니다."); return; }
        router.push("/seller");
      }}>
        <div className="bp-kicker">SELLER CENTER</div>
        <div className="bp-title">판매자 센터로<br/>전환하기</div>
        <div className="bp-sub">입점 신청, 상품 상세 구성, 주문·정산 관리는 판매자 전용 화면에서 진행합니다.</div>
        <div className="bp-arrow"><Icon name="store" size={22} /></div>
      </div>

      <div style={{ marginTop: 24 }}>
        {[
          { label: "주문 내역", action: () => setHistoryOpen(true) },
          { label: "판매자 센터", action: () => {
            if (!user) { showToast("로그인이 필요한 서비스입니다."); return; }
            router.push("/seller");
          } },
          { label: "저장한 도구", action: () => router.push("/saved") },
          { label: "고객센터", action: () => {} },
          { label: "설정", action: () => {} },
        ].map((item, i) => (
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
                    <Placeholder icon={item.icon} tone={item.tone} size={20} />
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
              </div>
            )) : (
              <div style={{ padding: "50px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>주문하신 내역이 없습니다.</div>
            )}
          </div>
        </ModalSheet>
      )}

      {authOpen && (
        <ModalSheet title={authOpen === "signin" ? "로그인" : "회원가입"} onClose={() => !authLoading && setAuthOpen(null)}>
          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={sheetLabel}>이메일 주소</label>
              <input style={{ ...sheetInput, width: "100%", marginTop: 6 }} type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="email@example.com" disabled={authLoading} />
            </div>
            <div>
              <label style={sheetLabel}>비밀번호 (6자 이상)</label>
              <input style={{ ...sheetInput, width: "100%", marginTop: 6 }} type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="••••••••" disabled={authLoading} minLength={6} />
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
              <button className="buy" type="submit" style={{ width: "100%" }} disabled={authLoading}>
                {authLoading ? "처리 중..." : authOpen === "signin" ? "로그인하기" : "가입하기"}
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 12.5, color: "var(--ink-soft)" }}>
              {authOpen === "signin" ? (
                <span>계정이 없으신가요? <button type="button" style={linkBtn} onClick={() => { setAuthOpen("signup"); setConsentTerms(false); setConsentPrivacy(false); }}>회원가입</button></span>
              ) : (
                <span>이미 계정이 있으신가요? <button type="button" style={linkBtn} onClick={() => setAuthOpen("signin")}>로그인</button></span>
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
