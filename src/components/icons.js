import React from 'react';

/* icons.js — minimal line icons (1.6 stroke), monochrome */
export default function Icon({ name, size = 22, stroke = 1.7, fill = false, style }) {
  const p = { 
    width: size, 
    height: size, 
    viewBox: "0 0 24 24", 
    fill: "none",
    stroke: "currentColor", 
    strokeWidth: stroke, 
    strokeLinecap: "round", 
    strokeLinejoin: "round", 
    style 
  };
  
  switch (name) {
    case "home":     return <svg {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>;
    case "grid":     return <svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg>;
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>;
    case "heart":    return fill
        ? <svg {...p} fill="currentColor" stroke="none"><path d="M12 20.5 4.3 12.8a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5Z"/></svg>
        : <svg {...p}><path d="M12 20.5 4.3 12.8a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5Z"/></svg>;
    case "user":     return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>;
    case "bag":      return <svg {...p}><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>;
    case "bell":     return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 2 7H4c.5-.5 2-2 2-7Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case "star":     return <svg {...p} fill="currentColor" stroke="none"><path d="m12 3 2.5 5.5L20.5 9l-4.5 4 1.3 6L12 16l-5.3 3 1.3-6L3.5 9l6-.5L12 3Z"/></svg>;
    case "chevron":  return <svg {...p}><path d="m9 5 7 7-7 7"/></svg>;
    case "chev-r-sm":return <svg {...p} strokeWidth="2"><path d="m9 6 6 6-6 6"/></svg>;
    case "back":     return <svg {...p}><path d="m15 5-7 7 7 7"/></svg>;
    case "filter":   return <svg {...p}><path d="M4 6h16M7 12h10M10 18h4"/></svg>;
    case "share":    return <svg {...p}><path d="M12 15V4"/><path d="m8 8 4-4 4 4"/><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>;
    case "close":    return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "check":    return <svg {...p}><path d="m5 12 5 5 9-10"/></svg>;
    case "verified": return <svg {...p} fill="currentColor" stroke="none"><path d="m12 2 2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.5l.9-2.9L3 10.6l2.6-1.5 1-2.8 3 .3L12 2Z"/><path d="m8.5 12 2.3 2.3 4.7-4.8" stroke="#fff" strokeWidth="1.8" fill="none"/></svg>;
    case "plus":     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "menu":     return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "trend":    return <svg {...p}><path d="m4 16 5-5 4 4 7-8"/><path d="M16 7h4v4"/></svg>;
    case "store":    return <svg {...p}><path d="M4 9 5 4h14l1 5"/><path d="M4 9v11h16V9"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/><path d="M9 20v-6h6v6"/></svg>;
    case "ship":     return <svg {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>;

    /* product category icons */
    case "scissors": return <svg {...p}><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.5 20 17M8 16.5 20 7"/></svg>;
    case "clipper":  return <svg {...p}><rect x="8" y="3.5" width="8" height="13" rx="2"/><path d="M9 16.5v2.5h6v-2.5M8.5 3.5l1-1h5l1 1"/><path d="M10 6h4M10 8h4"/></svg>;
    case "comb":     return <svg {...p}><path d="M4 8h16v3H4z"/><path d="M6 11v6M9 11v6M12 11v6M15 11v6M18 11v6"/></svg>;
    case "brush":    return <svg {...p}><path d="M14 4 20 10 11 19a4 4 0 0 1-5.6 0 4 4 0 0 1 0-5.6L14 4Z"/><path d="m9 9 6 6"/></svg>;
    case "apron":    return <svg {...p}><path d="M9 4a3 3 0 0 0 6 0"/><path d="M9 4 6 6l1.5 4-1 1V20h11V11l-1-1L18 6l-3-2"/></svg>;
    case "bottle":   return <svg {...p}><path d="M10 3h4v3l1.5 2.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V8.5L10 6V3Z"/><path d="M9 12h6"/></svg>;
    case "case":     return <svg {...p}><rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3.5 13h17"/></svg>;
    case "spark":    return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>;
    default:         return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}
