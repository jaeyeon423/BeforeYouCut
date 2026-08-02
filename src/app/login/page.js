import React, { Suspense } from "react";
import { LoginPageComponent } from "@/components/screens/auth-screens";
import siteConfig from "@/site.config";

export const metadata = {
  title: `${siteConfig.service.name} — 로그인`,
  description: `${siteConfig.service.name} 계정에 로그인하고 미용인을 위한 전문 도구 카탈로그를 탐색하세요.`,
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="byc-scroll fadein" style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>로딩 중...</div>}>
      <LoginPageComponent />
    </Suspense>
  );
}
