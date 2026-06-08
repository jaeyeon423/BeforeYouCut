"use client";

import React from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { AppProvider } from "@/contexts/app-context";

/**
 * Client-side context composition. `initialSellers` is fetched on the server
 * (root layout) and handed down so brand/product cards can resolve seller
 * names without an extra client round-trip.
 */
export default function Providers({ initialSellers, children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <AppProvider initialSellers={initialSellers}>
          {children}
        </AppProvider>
      </CartProvider>
    </AuthProvider>
  );
}
