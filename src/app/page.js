"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../components/icons';
import IOSDevice from '../components/ios-device';
import { 
  useTweaks, 
  TweaksPanel, 
  TweakSection, 
  TweakRadio, 
  TweakColor 
} from '../components/tweaks-panel';
import { TopBar, BottomNav } from '../components/ui';
import HomeScreen from '../components/screens/home';
import { 
  CategoryScreen, 
  SearchScreen, 
  SavedScreen, 
  MyScreen, 
  DetailScreen, 
  SellerScreen, 
  BagScreen 
} from '../components/screens/other';
import { SELLERS as staticSellers, PRODUCTS as staticProducts } from '../data/data';

const TWEAK_DEFAULTS = {
  "homeLayout": "magazine",
  "cardVariant": "meta",
  "navMode": "bottom",
  "theme": "mono",
  "typeStyle": "default"
};

function OverlayHeader({ title, onBack, cart, onBag }) {
  return (
    <div className="topbar bordered" style={{ paddingTop: 58 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        {title && (
          <div className="wordmark" style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="공유"><Icon name="share" size={21} /></button>
        <button className="icon-btn" onClick={onBag} aria-label="장바구니">
          <Icon name="bag" size={22} />
          {cart > 0 && <span className="dot" style={{ width: 7, height: 7 }} />}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([]);          // overlay screens stack
  const [likes, setLikes] = useState(new Set());
  const [following, setFollowing] = useState(new Set(["steelgrain"]));
  const [cart, setCart] = useState([]);
  const [sellers, setSellers] = useState(staticSellers);
  const [products, setProducts] = useState(staticProducts);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  
  const [mounted, setMounted] = useState(false);
  const toastTimerRef = useRef(null);
  const rootRef = useRef(null);

  // Scaler Effect matching original fit() logic
  useEffect(() => {
    const W = 402, H = 874;
    function fit() {
      const root = rootRef.current;
      if (!root) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!vw || !vh) return;
      const s = Math.min(vw / W, vh / H, 1);
      root.style.transform = `scale(${s})`;
    }
    
    window.addEventListener('resize', fit);
    fit();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(document.documentElement);
      const stage = document.getElementById('stage');
      if (stage) ro.observe(stage);
    }
    
    return () => {
      window.removeEventListener('resize', fit);
      if (ro) ro.disconnect();
    };
  }, []);

  // Load from localStorage on client-mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedLikes = localStorage.getItem('byc_likes');
      if (savedLikes) setLikes(new Set(JSON.parse(savedLikes)));

      const savedFollowing = localStorage.getItem('byc_following');
      if (savedFollowing) setFollowing(new Set(JSON.parse(savedFollowing)));

      const savedCart = localStorage.getItem('byc_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedSellers = localStorage.getItem('byc_sellers');
      if (savedSellers) setSellers(JSON.parse(savedSellers));

      const savedProducts = localStorage.getItem('byc_products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedOrders = localStorage.getItem('byc_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_likes', JSON.stringify(Array.from(likes)));
  }, [likes, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_following', JSON.stringify(Array.from(following)));
  }, [following, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_cart', JSON.stringify(cart));
  }, [cart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_sellers', JSON.stringify(sellers));
  }, [sellers, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_products', JSON.stringify(products));
  }, [products, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_orders', JSON.stringify(orders));
  }, [orders, mounted]);

  const scrollKey = tab + "|" + stack.map((s) => s.kind + (s.sid || s.p?.id || "")).join(">");
  const top = stack[stack.length - 1];

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1600);
  }, []);

  const byId = useCallback((id) => products.find((x) => x.id === id), [products]);
  const bySeller = useCallback((sid) => products.filter((x) => x.seller === sid), [products]);
  const byCat = useCallback((c) => c === "전체" ? products : products.filter((x) => x.cat === c), [products]);

  // Ranking calculation dynamically based on likes/ratings
  const ranking = ["p6", "p1", "p9", "p4", "p13"].map(byId).filter(Boolean);

  const goNav = (key) => {
    setStack([]);
    if (key === "bag") { 
      setStack([{ kind: "bag" }]); 
      return; 
    }
    if (key === "search") { setTab("search"); return; }
    setTab(key);
  };

  const ctx = {
    open: (p) => setStack((s) => [...s, { kind: "detail", p }]),
    openSeller: (sid) => setStack((s) => [...s, { kind: "seller", sid }]),
    openBag: () => setStack((s) => [...s, { kind: "bag" }]),
    back: () => setStack((s) => s.slice(0, -1)),
    likes, 
    following, 
    cart,
    sellers,
    products,
    ranking,
    orders,
    byCat,
    bySeller,
    byId,
    goNav,
    showToast,
    like: (id) => setLikes((s) => { 
      const n = new Set(s); 
      n.has(id) ? n.delete(id) : n.add(id); 
      return n; 
    }),
    follow: (id) => setFollowing((s) => { 
      const n = new Set(s); 
      if (n.has(id)) { 
        n.delete(id); 
        showToast("팔로우를 취소했어요"); 
      } else { 
        n.add(id); 
        showToast("브랜드를 팔로우했어요"); 
      } 
      return n; 
    }),
    addCart: (p) => { 
      setCart((c) => [...c, p]); 
      showToast("장바구니에 담았어요"); 
    },
    removeCart: (i) => setCart((c) => c.filter((_, k) => k !== i)),
    clearCart: () => setCart([]),
    addOrder: (newOrder) => setOrders((o) => [newOrder, ...o]),
    addSeller: (newSeller) => setSellers((s) => ({ ...s, [newSeller.id]: newSeller })),
    addProduct: (newProduct) => setProducts((p) => [newProduct, ...p]),
  };

  // ---- render current main screen ----
  let mainScreen, headerTitle = null;
  if (top) {
    if (top.kind === "detail") { 
      mainScreen = <DetailScreen p={top.p} ctx={ctx} />; 
      headerTitle = sellers[top.p.seller]?.name || top.p.seller; 
    }
    else if (top.kind === "seller") { 
      mainScreen = <SellerScreen sid={top.sid} cardVariant={t.cardVariant} ctx={ctx} />; 
      headerTitle = "브랜드"; 
    }
    else if (top.kind === "bag") { 
      mainScreen = <BagScreen ctx={ctx} />; 
      headerTitle = "장바구니"; 
    }
  } else {
    if (tab === "home") mainScreen = <HomeScreen layout={t.homeLayout} cardVariant={t.cardVariant} ctx={ctx} />;
    else if (tab === "category") mainScreen = <CategoryScreen cardVariant={t.cardVariant} ctx={ctx} />;
    else if (tab === "search") mainScreen = <SearchScreen ctx={ctx} />;
    else if (tab === "saved") mainScreen = <SavedScreen ctx={ctx} />;
    else if (tab === "my") mainScreen = <MyScreen ctx={ctx} />;
  }

  const tabTitles = { category: "카테고리", search: "검색", saved: "저장", my: "마이페이지" };
  const useTopTabs = t.navMode === "top" && !top && tab === "home";

  const dataTheme = t.theme === "mono" ? undefined : t.theme;
  const dataType = t.typeStyle === "default" ? undefined : t.typeStyle;

  return (
    <div id="stage" style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(120% 90% at 50% 0%, #f1f1f2 0%, #e4e4e6 55%, #dcdcde 100%)',
    }}>
      <div id="root" ref={rootRef} style={{ transformOrigin: 'center center', willChange: 'transform' }}>
        <IOSDevice>
          <div className="byc" data-theme={dataTheme} data-type={dataType}>
            {/* header */}
            {top ? (
              <OverlayHeader title={headerTitle} onBack={ctx.back} cart={cart.length} onBag={ctx.openBag} />
            ) : tab === "home" ? (
              <TopBar onNav={(k) => goNav(k)} cart={cart.length} />
            ) : (
              <TopBar onNav={(k) => goNav(k)} cart={cart.length} title={tabTitles[tab]} bordered />
            )}

            {/* top tabs (nav variant) */}
            {useTopTabs && (
              <div className="toptabs">
                {["추천", "랭킹", "신상", "브랜드", "세일", "핸드메이드"].map((c, i) => (
                  <button key={c} className={"toptab" + (i === 0 ? " active" : "")}>{c}</button>
                ))}
              </div>
            )}

            {/* main */}
            <React.Fragment key={scrollKey}>{mainScreen}</React.Fragment>

            {/* bottom nav */}
            {!top && <BottomNav active={tab} onNav={(k) => goNav(k)} />}

            {/* toast */}
            {toast && (
              <div style={{
                position: "absolute", left: "50%", bottom: 96, transform: "translateX(-50%)",
                background: "rgba(17,17,17,0.92)", color: "#fff", fontSize: 13, fontWeight: 600,
                padding: "12px 20px", borderRadius: 999, zIndex: 90, whiteSpace: "nowrap",
                backdropFilter: "blur(8px)", letterSpacing: "-0.01em",
              }}>{toast}</div>
            )}

            {/* tweaks */}
            <TweaksPanel>
              <TweakSection label="홈 레이아웃" />
              <TweakRadio label="구조" value={t.homeLayout}
                options={[{ value: "magazine", label: "매거진" }, { value: "grid", label: "그리드" }, { value: "ranking", label: "랭킹" }]}
                onChange={(v) => { setTweak("homeLayout", v); setTab("home"); setStack([]); }} />

              <TweakSection label="상품 카드" />
              <TweakRadio label="스타일" value={t.cardVariant}
                options={[{ value: "minimal", label: "심플" }, { value: "meta", label: "정보형" }, { value: "overlay", label: "오버레이" }]}
                onChange={(v) => setTweak("cardVariant", v)} />

              <TweakSection label="네비게이션" />
              <TweakRadio label="홈 탐색" value={t.navMode}
                options={[{ value: "bottom", label: "하단 탭" }, { value: "top", label: "상단 탭+하단" }]}
                onChange={(v) => { setTweak("navMode", v); setTab("home"); setStack([]); }} />

              <TweakSection label="컬러 · 타이포" />
              <TweakColor label="액센트" value={ACCENTS[t.theme]}
                options={Object.values(ACCENTS)}
                onChange={(v) => setTweak("theme", THEME_BY_COLOR[v] || "mono")} />
              <TweakRadio label="타이틀 서체" value={t.typeStyle}
                options={[{ value: "default", label: "산세리프" }, { value: "condensed", label: "콘덴스드" }, { value: "serif", label: "세리프" }]}
                onChange={(v) => setTweak("typeStyle", v)} />
            </TweaksPanel>
          </div>
        </IOSDevice>
      </div>
    </div>
  );
}

// accent swatches for the tweak color control
const ACCENTS = { mono: "#111111", cobalt: "#1b3aff", tangerine: "#ff5a1f", forest: "#0e5b3f", acid: "#d6ff2e" };
const THEME_BY_COLOR = Object.fromEntries(Object.entries(ACCENTS).map(([k, v]) => [v, k]));
