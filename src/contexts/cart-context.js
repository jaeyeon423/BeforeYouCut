"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const CART_KEY = "byc_cart";

const CartContext = createContext({
  cart: [],
  addCart: () => {},
  replaceCart: () => {},
  removeCart: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to read cart from storage:", e);
    }
  }, []);

  // Persist on change (after initial hydration).
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, mounted]);

  const addCart = useCallback((p) => setCart((c) => [...c, p]), []);
  const replaceCart = useCallback((items) => setCart(Array.isArray(items) ? items : []), []);
  const removeCart = useCallback((i) => setCart((c) => c.filter((_, k) => k !== i)), []);
  const clearCart = useCallback(() => setCart([]), []);

  return (
    <CartContext.Provider value={{ cart, addCart, replaceCart, removeCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
