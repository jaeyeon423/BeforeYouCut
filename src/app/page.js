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
import { createClient } from '../utils/supabase/client';
import { 
  getInitialData, 
  toggleLike, 
  toggleFollow, 
  createOrder, 
  createSeller,
  syncUser
} from './actions';

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
  const [following, setFollowing] = useState(new Set());
  const [cart, setCart] = useState([]);
  const [sellers, setSellers] = useState(staticSellers);
  const [products, setProducts] = useState(staticProducts);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);
  
  const [user, setUser] = useState(null);          // Supabase Auth User object
  const [mounted, setMounted] = useState(false);
  const toastTimerRef = useRef(null);

  const supabase = createClient();

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1600);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await getInitialData();
      setSellers(data.sellers);
      setProducts(data.products);
      setLikes(new Set(data.likes || []));
      setFollowing(new Set(data.following || []));
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
      showToast("데이터를 불러오지 못했습니다.");
    }
  }, [showToast]);

  // Load from database & auth listener on mount
  useEffect(() => {
    setMounted(true);
    
    // Load local cart
    try {
      const savedCart = localStorage.getItem('byc_cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {
      console.error(e);
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const activeUser = session?.user || null;
      setUser(activeUser);
      if (activeUser) {
        await syncUser({ name: activeUser.user_metadata?.name || activeUser.email.split("@")[0] });
      }
      loadData();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user || null;
      setUser(activeUser);
      if (activeUser) {
        await syncUser({ name: activeUser.user_metadata?.name || activeUser.email.split("@")[0] });
      }
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, loadData]);

  // Sync cart state changes to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('byc_cart', JSON.stringify(cart));
  }, [cart, mounted]);

  const scrollKey = tab + "|" + stack.map((s) => s.kind + (s.sid || s.p?.id || "")).join(">");
  const top = stack[stack.length - 1];

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
    user,
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
    like: async (id) => {
      if (!user) {
        showToast("로그인이 필요한 서비스입니다.");
        return;
      }
      // Optimistic update
      setLikes((s) => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
      try {
        await toggleLike(id);
      } catch (e) {
        console.error(e);
        // Revert on error
        setLikes((s) => {
          const n = new Set(s);
          n.has(id) ? n.delete(id) : n.add(id);
          return n;
        });
        showToast("오류가 발생했습니다.");
      }
    },
    follow: async (id) => {
      if (!user) {
        showToast("로그인이 필요한 서비스입니다.");
        return;
      }
      setFollowing((s) => {
        const n = new Set(s);
        if (n.has(id)) {
          n.delete(id);
          showToast("팔로우를 취소했어요");
        } else {
          n.add(id);
          showToast("브랜드를 팔로우했어요");
        }
        return n;
      });
      try {
        await toggleFollow(id);
      } catch (e) {
        console.error(e);
        // Revert on error
        setFollowing((s) => {
          const n = new Set(s);
          if (n.has(id)) {
            n.delete(id);
          } else {
            n.add(id);
          }
          return n;
        });
        showToast("오류가 발생했습니다.");
      }
    },
    addCart: (p) => { 
      setCart((c) => [...c, p]); 
      showToast("장바구니에 담았어요"); 
    },
    removeCart: (i) => setCart((c) => c.filter((_, k) => k !== i)),
    clearCart: () => setCart([]),
    addOrder: async (orderData) => {
      if (!user) {
        showToast("로그인이 필요한 서비스입니다.");
        return false;
      }
      try {
        const res = await createOrder({
          name: orderData.buyer,
          address: orderData.address,
          total: orderData.total,
          items: orderData.items
        });
        if (res.success) {
          setOrders((o) => [res.order, ...o]);
          showToast("주문 및 결제가 완료되었습니다!");
          return true;
        }
      } catch (e) {
        console.error(e);
        showToast("결제 처리에 실패했습니다.");
        return false;
      }
    },
    addSeller: async (onboardData) => {
      if (!user) {
        showToast("로그인이 필요한 서비스입니다.");
        return false;
      }
      try {
        const res = await createSeller(onboardData);
        if (res.success) {
          setSellers((s) => ({
            ...s,
            [res.seller.id]: res.seller
          }));
          if (res.product) {
            setProducts((p) => [res.product, ...p]);
          }
          showToast("브랜드 입점 신청이 완료되었습니다!");
          return true;
        }
      } catch (e) {
        console.error(e);
        showToast("입점 신청에 실패했습니다.");
        return false;
      }
    },
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
      minHeight: '100dvh',
      background: '#f1f1f2',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div className="byc" data-theme={CONFIG.theme} data-type={CONFIG.typeStyle} style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        height: '100dvh',
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
