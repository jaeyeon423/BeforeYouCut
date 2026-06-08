"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { useApp } from "@/contexts/app-context";

// Frozen production presentation config (was in the old page.js).
const CONFIG = { theme: "mono", typeStyle: "default" };

// Routes that render inside an overlay (own back-header, no bottom nav).
function isOverlayRoute(pathname) {
  return (
    pathname.startsWith("/products/") ||
    pathname.startsWith("/sellers/") ||
    pathname === "/cart"
  );
}

// Map a pathname to the active bottom-nav tab key.
function activeTab(pathname) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/category")) return "category";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/saved")) return "saved";
  if (pathname.startsWith("/my")) return "my";
  return null;
}

export default function AppShell({ children }) {
  const pathname = usePathname() || "/";
  const { toast } = useApp();
  const overlay = isOverlayRoute(pathname);
  const active = activeTab(pathname);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#f1f1f2",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <div className="byc" data-theme={CONFIG.theme} data-type={CONFIG.typeStyle} style={{
        position: "relative",
        width: "100%",
        maxWidth: "480px",
        height: "100dvh",
        background: "var(--paper)",
        boxShadow: "0 0 20px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {children}

        {!overlay && active && <BottomNav active={active} />}

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
