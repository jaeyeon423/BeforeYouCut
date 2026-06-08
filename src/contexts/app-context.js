"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toggleLike as toggleLikeAction, toggleFollow as toggleFollowAction, getUserInteractions } from "@/app/actions";

const AppContext = createContext({
  sellers: {},
  likes: new Set(),
  following: new Set(),
  toast: null,
  toggleLike: () => {},
  toggleFollow: () => {},
  showToast: () => {},
});

export function AppProvider({ initialSellers = {}, children }) {
  const { user } = useAuth();
  const [sellers] = useState(initialSellers);
  const [likes, setLikes] = useState(new Set());
  const [following, setFollowing] = useState(new Set());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // Load the signed-in user's likes/follows; clear them on sign-out.
  useEffect(() => {
    let active = true;
    if (!user) {
      setLikes(new Set());
      setFollowing(new Set());
      return;
    }
    getUserInteractions()
      .then((data) => {
        if (!active) return;
        setLikes(new Set(data.likes || []));
        setFollowing(new Set(data.following || []));
      })
      .catch((e) => console.error("Failed to load interactions:", e));
    return () => { active = false; };
  }, [user]);

  const toggleLike = useCallback(async (productId) => {
    if (!user) {
      showToast("로그인이 필요한 서비스입니다.");
      return;
    }
    // Optimistic update.
    setLikes((s) => {
      const n = new Set(s);
      n.has(productId) ? n.delete(productId) : n.add(productId);
      return n;
    });
    try {
      await toggleLikeAction(productId);
    } catch (e) {
      console.error(e);
      setLikes((s) => {
        const n = new Set(s);
        n.has(productId) ? n.delete(productId) : n.add(productId);
        return n;
      });
      showToast("오류가 발생했습니다.");
    }
  }, [user, showToast]);

  const toggleFollow = useCallback(async (sellerId) => {
    if (!user) {
      showToast("로그인이 필요한 서비스입니다.");
      return;
    }
    let wasFollowing = false;
    setFollowing((s) => {
      const n = new Set(s);
      if (n.has(sellerId)) {
        wasFollowing = true;
        n.delete(sellerId);
      } else {
        n.add(sellerId);
      }
      return n;
    });
    showToast(wasFollowing ? "팔로우를 취소했어요" : "브랜드를 팔로우했어요");
    try {
      await toggleFollowAction(sellerId);
    } catch (e) {
      console.error(e);
      setFollowing((s) => {
        const n = new Set(s);
        n.has(sellerId) ? n.delete(sellerId) : n.add(sellerId);
        return n;
      });
      showToast("오류가 발생했습니다.");
    }
  }, [user, showToast]);

  return (
    <AppContext.Provider value={{ sellers, likes, following, toast, toggleLike, toggleFollow, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
