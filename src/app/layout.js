import "./globals.css";
import Providers from "@/components/providers";
import AppShell from "@/components/app-shell";
import { getSellersMap } from "@/app/actions";

export const metadata = {
  title: "BEFORE YOU CUT — 미용인 브랜딩 마켓",
  description: "미용인을 위한 브랜드 마켓플레이스 · 입점 셀러 직접 판매",
};

export default async function RootLayout({ children }) {
  // Loaded once on the server so cards anywhere can resolve seller names.
  const sellers = await getSellersMap();

  return (
    <html lang="ko" style={{ margin: 0, height: "100%", background: "#e7e7e8" }}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, height: "100%", background: "#e7e7e8" }}>
        <Providers initialSellers={sellers}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
