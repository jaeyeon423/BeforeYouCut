"use client";

import React from 'react';
import Icon from '../icons';
import { 
  Placeholder, 
  SectionHeader, 
  ProductGrid, 
  ProductRail, 
  Verified,
  BrandCard
} from '../ui';
import { 
  SELLERS, 
  PRODUCTS, 
  CATEGORIES, 
  CAT_ICON, 
  POPULAR_KEYWORDS, 
  won, 
  bySeller, 
  byCat 
} from '../../data/data';
import { Foot } from './home';

// ============================================================
// CATEGORY
// ============================================================
export function CategoryScreen({ cardVariant, ctx }) {
  const { open, likes, like } = ctx;
  const [active, setActive] = React.useState("전체");
  const items = byCat(active);
  return (
    <div className="byc-scroll fadein" key="cat">
      <div className="section" style={{ marginTop: 8 }}>
        <div className="catgrid">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="catcell" onClick={() => setActive(c.key)}>
              <div className="cat-ico" style={active === c.key ? { background: "var(--ink)", color: "#fff" } : null}>
                <Icon name={c.icon} size={26} stroke={1.5} />
              </div>
              <div className="cat-label">{c.key === "전체" ? "전체" : c.key}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="divider-strip" style={{ marginTop: 20 }} />
      <div className="section" style={{ marginTop: 16 }}>
        <SectionHeader title={active} sub={`${items.length}개 상품`} more="필터" onMore={() => {}} />
        <ProductGrid items={items} variant={cardVariant} onOpen={open} likes={likes} onLike={like} />
      </div>
      <Foot />
    </div>
  );
}

// ============================================================
// SEARCH
// ============================================================
export function SearchScreen({ ctx }) {
  const { open } = ctx;
  const [q, setQ] = React.useState("");
  const results = q ? PRODUCTS.filter((p) =>
    (p.name + SELLERS[p.seller].name + p.cat).toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div className="byc-scroll fadein" key="search">
      <div style={{ height: 8 }} />
      <div className="searchbar">
        <Icon name="search" size={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드, 도구, 카테고리 검색" autoFocus />
        {q && <button className="icon-btn" onClick={() => setQ("")}><Icon name="close" size={18} /></button>}
      </div>

      {!q && (
        <>
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
          <div className="search-section">
            <h4>브랜드 바로가기</h4>
            <div className="chiprow" style={{ padding: "0 0 4px" }}>
              {Object.values(SELLERS).map((s) => (
                <div key={s.id} className="chip" onClick={() => ctx.openSeller(s.id)}>{s.name}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {q && (
        <div className="section" style={{ marginTop: 14 }}>
          <SectionHeader title={`'${q}' 검색 결과`} sub={`${results.length}개`} />
          {results.length ? (
            <ProductGrid items={results} variant="meta" onOpen={open} likes={ctx.likes} onLike={ctx.like} />
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
export function DetailScreen({ p, ctx }) {
  const s = SELLERS[p.seller];
  const [dot, setDot] = React.useState(0);
  const liked = ctx.likes.has(p.id);
  const related = bySeller(p.seller).filter((x) => x.id !== p.id).slice(0, 4);
  return (
    <>
      <div className="byc-scroll" key={"detail" + p.id}>
        <div className="pd-media">
          <Placeholder icon={p.icon} tone={p.tone} size={92} />
          {p.badge && <span className={"badge " + p.badge} style={{ top: 14, left: 14 }}>{p.badge === "new" ? "NEW" : p.badge === "best" ? "BEST" : "LIMITED"}</span>}
          <div className="pd-dots">{[0, 1, 2].map((i) => <i key={i} className={i === dot ? "on" : ""} onClick={() => setDot(i)} />)}</div>
        </div>

        <div className="pd-body">
          <div className="pd-brandline">
            <div className="pd-brand" onClick={() => ctx.openSeller(s.id)}>{s.name}{s.verified && <Verified />}</div>
            <button className="icon-btn"><Icon name="share" size={20} /></button>
          </div>
          <h1 className="pd-name">{p.name}</h1>
          <div className="pd-rating">
            <span className="stars"><Icon name="star" size={13} />{p.rating}</span>
            <span>리뷰 {p.reviews}</span><span>·</span><span>찜 {p.likes.toLocaleString()}</span>
          </div>
          <div className="pd-pricebox">
            {p.disc ? <span className="pd-disc">{p.disc}%</span> : null}
            <span className="pd-price">{won(p.price)}원</span>
            {p.orig ? <span className="pd-orig">{won(p.orig)}원</span> : null}
          </div>
          {p.desc && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, marginTop: 14 }}>{p.desc}</p>}
          <div className="pd-rating" style={{ marginTop: 14, color: "var(--ink-soft)" }}>
            <Icon name="ship" size={18} /><span>무료배송 · 평균 2일 내 출고</span>
          </div>
        </div>

        <div className="pd-divider" />

        {/* seller strip — the key "입점 셀러" emphasis */}
        <div className="pd-sellerstrip" onClick={() => ctx.openSeller(s.id)}>
          <div className="ss-logo"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={22} /></div>
          <div className="ss-info">
            <div className="ss-name">{s.name}{s.verified && <Verified size={12} />}</div>
            <div className="ss-meta">입점 셀러 · 팔로워 {s.followers} · 상품 {s.products}개</div>
          </div>
          <button className={"btn-follow" + (ctx.following.has(s.id) ? " on" : "")} onClick={(e) => { e.stopPropagation(); ctx.follow(s.id); }}>
            {ctx.following.has(s.id) ? "팔로잉" : "+ 팔로우"}
          </button>
        </div>

        {p.spec.length > 0 && (
          <div className="pd-block">
            <h5>상품 정보</h5>
            <dl style={{ margin: 0 }}>
              {p.spec.map(([k, v]) => (
                <div key={k} className="pd-spec"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
        )}

        {related.length > 0 && (
          <div className="section" style={{ marginTop: 22 }}>
            <SectionHeader title={`${s.name}의 다른 상품`} more="브랜드" onMore={() => ctx.openSeller(s.id)} />
            <ProductRail items={related} variant="minimal" onOpen={ctx.open} likes={ctx.likes} onLike={ctx.like} />
          </div>
        )}
        <Foot />
      </div>

      {/* sticky buy bar */}
      <div className="pd-buybar">
        <button className="like-box" onClick={() => ctx.like(p.id)}>
          <Icon name="heart" size={22} fill={liked} stroke={1.8} />
          <span>{(p.likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="buy" onClick={() => ctx.addCart(p)}>장바구니 담기</button>
      </div>
    </>
  );
}

// ============================================================
// SELLER PROFILE
// ============================================================
export function SellerScreen({ sid, cardVariant, ctx }) {
  const s = SELLERS[sid];
  const [tab, setTab] = React.useState("상품");
  const items = bySeller(sid);
  const isF = ctx.following.has(sid);
  return (
    <div className="byc-scroll fadein" key={"seller" + sid}>
      <div className="sp-cover"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={56} /></div>
      <div className="sp-head">
        <div className="sp-logo"><Placeholder icon={CAT_ICON[s.category]} tone={s.tone} size={30} /></div>
        <h1 className="sp-name">{s.name}{s.verified && <Verified size={20} />}</h1>
        <div className="sp-tagline">{s.desc} · since {s.since}</div>
        <div className="sp-stats">
          <div className="sp-stat"><span className="num">{s.products}</span><span className="lbl">상품</span></div>
          <div className="sp-stat"><span className="num">{s.followers}</span><span className="lbl">팔로워</span></div>
          <div className="sp-stat"><span className="num">{s.category}</span><span className="lbl">카테고리</span></div>
        </div>
        <div className="sp-actions">
          <button className={"btn-follow" + (isF ? " on" : "")} onClick={() => ctx.follow(sid)}>{isF ? "팔로잉" : "+ 팔로우"}</button>
          <button className="btn-ghost">문의하기</button>
        </div>
      </div>

      {s.notice && (
        <div className="sp-noticebar" style={{ marginTop: 18 }}>
          <span className="tag">공지</span><span>{s.notice}</span>
        </div>
      )}

      <div className="sp-tabs">
        {["상품", "브랜드 스토리", "리뷰"].map((t) => (
          <button key={t} className={"sp-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "상품" && (
        <div className="section" style={{ marginTop: 18 }}>
          <ProductGrid items={items} variant={cardVariant} onOpen={ctx.open} likes={ctx.likes} onLike={ctx.like} />
        </div>
      )}
      {tab === "브랜드 스토리" && (
        <div className="sp-story">
          {s.story.map((para, i) => <p key={i}>{para}</p>)}
          <div className="tag-strip">
            {["#" + s.category, "#입점셀러", "#수제", "#since" + s.since].map((t) => <span key={t} className="t">{t}</span>)}
          </div>
        </div>
      )}
      {tab === "리뷰" && (
        <div className="sp-story">
          {[
            ["김O현 디자이너", 5, "현장에서 매일 쓰는데 손목 부담이 확실히 줄었어요. 텐션 조정 서비스도 좋아요."],
            ["원장 P", 4, "퀄리티 대비 합리적. 배송도 빨랐습니다."],
            ["바버 J", 5, "셀러가 직접 응대해줘서 신뢰가 갑니다. 재구매 의사 있어요."],
          ].map(([who, r, txt], i) => (
            <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", gap: 4, color: "var(--ink)", marginBottom: 6 }}>
                {Array.from({ length: r }).map((_, k) => <Icon key={k} name="star" size={13} />)}
              </div>
              <p style={{ margin: "0 0 6px" }}>{txt}</p>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{who}</div>
            </div>
          ))}
        </div>
      )}
      <Foot />
    </div>
  );
}

// ============================================================
// SIMPLE PLACEHOLDER SCREENS (saved / my / bag)
// ============================================================
export function SavedScreen({ ctx }) {
  const items = PRODUCTS.filter((p) => ctx.likes.has(p.id));
  return (
    <div className="byc-scroll fadein" key="saved">
      <div className="section" style={{ marginTop: 14 }}>
        <SectionHeader title="저장한 도구" sub={`${items.length}개`} />
        {items.length ? (
          <ProductGrid items={items} variant="meta" onOpen={ctx.open} likes={ctx.likes} onLike={ctx.like} />
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

export function BagScreen({ ctx }) {
  const items = ctx.cart;
  const total = items.reduce((a, p) => a + p.price, 0);
  return (
    <>
      <div className="byc-scroll fadein" key="bag">
        <div className="section" style={{ marginTop: 14 }}>
          <SectionHeader title="장바구니" sub={`${items.length}개`} />
          {items.length ? items.map((p, i) => (
            <div key={i} className="rankrow" style={{ borderBottom: "1px solid var(--line)" }} onClick={() => ctx.open(p)}>
              <div className="rank-media"><Placeholder icon={p.icon} tone={p.tone} size={28} /></div>
              <div className="rank-body">
                <div className="rank-brand">{SELLERS[p.seller].name}</div>
                <div className="rank-name">{p.name}</div>
                <div className="rank-price">{won(p.price)}원</div>
              </div>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); ctx.removeCart(i); }}><Icon name="close" size={18} /></button>
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
          <button className="buy" onClick={() => {}}>{won(total)}원 · 주문하기</button>
        </div>
      )}
    </>
  );
}

export function MyScreen({ ctx }) {
  return (
    <div className="byc-scroll fadein" key="my">
      <div style={{ padding: "26px 18px 6px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          <Icon name="user" size={30} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>김미용 디자이너</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>일반회원 · 팔로잉 {ctx.following.size}</div>
        </div>
      </div>

      <div style={{ display: "flex", margin: "18px", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {[["주문", "0"], ["저장", String(ctx.likes.size)], ["쿠폰", "2"], ["적립금", "0"]].map(([l, v], i) => (
          <div key={l} style={{ flex: 1, padding: "16px 0", textAlign: "center", borderLeft: i ? "1px solid var(--line)" : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* seller onboarding CTA — connects to the "입점" goal */}
      <div className="banner-promo" style={{ margin: "8px 18px 0" }} onClick={() => {}}>
        <div className="bp-kicker">FOR SELLERS</div>
        <div className="bp-title">내 브랜드를<br/>입점시키기</div>
        <div className="bp-sub">미용인이라면 누구나 셀러가 될 수 있어요. 수수료·정산 안내 보기.</div>
        <div className="bp-arrow"><Icon name="store" size={22} /></div>
      </div>

      <div style={{ marginTop: 24 }}>
        {["주문 내역", "팔로우한 브랜드", "최근 본 상품", "리뷰 관리", "고객센터", "설정"].map((l, i) => (
          <div key={l} style={{ display: "flex", alignItems: "center", padding: "16px 18px", borderTop: i === 0 ? "1px solid var(--line)" : "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
            <span style={{ flex: 1, fontSize: 14, letterSpacing: "-0.02em" }}>{l}</span>
            <span style={{ color: "var(--muted-2)" }}><Icon name="chev-r-sm" size={16} /></span>
          </div>
        ))}
      </div>
      <Foot />
    </div>
  );
}
