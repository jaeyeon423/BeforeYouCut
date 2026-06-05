"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../components/icons';
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

// Frozen production configurations
const CONFIG = {
  homeLayout: "magazine",
  cardVariant: "meta",
  theme: "mono",
  typeStyle: "default"
};

function OverlayHeader({ title, onBack, cart, onBag }) {
  return (
    <div className="topbar bordered" style={{ paddingTop: 16 }}>
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
      mainScreen = <SellerScreen sid={top.sid} cardVariant={CONFIG.cardVariant} ctx={ctx} />; 
      headerTitle = "브랜드"; 
    }
    else if (top.kind === "bag") { 
      mainScreen = <BagScreen ctx={ctx} />; 
      headerTitle = "장바구니"; 
    }
  } else {
    if (tab === "home") mainScreen = <HomeScreen layout={CONFIG.homeLayout} cardVariant={CONFIG.cardVariant} ctx={ctx} />;
    else if (tab === "category") mainScreen = <CategoryScreen cardVariant={CONFIG.cardVariant} ctx={ctx} />;
    else if (tab === "search") mainScreen = <SearchScreen ctx={ctx} />;
    else if (tab === "saved") mainScreen = <SavedScreen ctx={ctx} />;
    else if (tab === "my") mainScreen = <MyScreen ctx={ctx} />;
  }

  const tabTitles = { category: "카테고리", search: "검색", saved: "저장", my: "마이페이지" };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f1f2',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div className="byc" data-theme={CONFIG.theme} data-type={CONFIG.typeStyle} style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        height: '100vh',
        background: 'var(--paper)',
        boxShadow: '0 0 20px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* header */}
        {top ? (
          <OverlayHeader title={headerTitle} onBack={ctx.back} cart={cart.length} onBag={ctx.openBag} />
        ) : tab === "home" ? (
          <TopBar onNav={(k) => goNav(k)} cart={cart.length} />
        ) : (
          <TopBar onNav={(k) => goNav(k)} cart={cart.length} title={tabTitles[tab]} bordered />
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
      </div>
    </div>
  );
}
