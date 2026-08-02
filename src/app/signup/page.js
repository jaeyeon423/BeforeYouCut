import React, { Suspense } from "react";
import { SignupPageComponent } from "@/components/screens/auth-screens";
import siteConfig from "@/site.config";

export const metadata = {
  title: `${siteConfig.service.name} — 회원가입`,
  description: `${siteConfig.service.name}에 가입하고 미용인을 위한 전용 혜택과 전문 도구 카탈로그를 만나보세요.`,
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="byc-scroll fadein" style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>로딩 중...</div>}>
      <SignupPageComponent />
    </Suspense>
  );
}
