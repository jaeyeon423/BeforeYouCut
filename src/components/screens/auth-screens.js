"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useApp } from "@/contexts/app-context";
import Icon from "@/components/icons";
import { Wordmark } from "@/components/ui";
import {
  requestSignupPhoneVerification,
  verifySignupPhoneCode,
  registerBuyer,
  syncUser,
} from "@/app/actions";

export function LoginPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/my";
  const { showToast } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        throw error;
      }

      if (data?.user) {
        await syncUser({
          name: data.user.user_metadata?.name || email.split("@")[0],
          phone: data.user.user_metadata?.phone,
        }).catch((err) => console.error("syncUser error:", err));
      }

      showToast("로그인되었습니다.");
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "로그인 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="byc-scroll fadein" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => router.back()}
          style={styles.backBtn}
          aria-label="뒤로가기"
        >
          <Icon name="chev-l-sm" size={20} />
        </button>
        <div style={styles.headerTitle}>
          <Wordmark />
        </div>
        <div style={{ width: 36 }} />
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.titleSection}>
          <h1 style={styles.h1}>반갑습니다!</h1>
          <p style={styles.subtext}>
            미용인을 위한 전문 도구 마켓플레이스,<br />
            <strong>미용사</strong> 계정으로 로그인해 주세요.
          </p>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="login-email" style={styles.label}>이메일 주소</label>
            <input
              id="login-email"
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label htmlFor="login-password" style={styles.label}>비밀번호</label>
            </div>
            <div style={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            style={{
              ...styles.primaryBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "default" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인하기"}
          </button>
        </form>

        <div style={styles.bottomActions}>
          <span style={styles.helperText}>아직 미용사 회원이 아니신가요?</span>
          <Link
            href={`/signup${returnTo !== "/my" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            style={styles.signupLink}
          >
            회원가입하기
          </Link>
        </div>

        {/* Seller / Role Notice Box */}
        <div style={styles.roleNoticeCard}>
          <div style={styles.roleNoticeHeader}>
            <Icon name="store" size={16} />
            <b>판매자 &amp; 관리자 로그인 안내</b>
          </div>
          <p style={styles.roleNoticeBody}>
            동일한 계정으로 로그인 후 셀러 등록 시 <strong>/seller (셀러 센터)</strong> 권한이 자동 부여됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}

export function SignupPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/my";
  const { showToast } = useApp();

  // Step 1: Phone OTP state
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneRequested, setPhoneRequested] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneDebugCode, setPhoneDebugCode] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Step 2: User details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 3: Consents
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRequestPhoneVerification = async () => {
    if (!phone.trim()) {
      setErrorMsg("휴대폰 번호를 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setPhoneLoading(true);
    try {
      const result = await requestSignupPhoneVerification({ phone: phone.trim() });
      setPhoneRequested(true);
      setPhoneDebugCode(result.debugCode || null);
      showToast("인증번호가 발송되었습니다.");
    } catch (err) {
      setErrorMsg(err.message || "인증번호 발송 실패");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode.trim()) {
      setErrorMsg("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setErrorMsg("");
    setPhoneLoading(true);
    try {
      await verifySignupPhoneCode({ phone: phone.trim(), code: phoneCode.trim() });
      setPhoneVerified(true);
      showToast("휴대폰 인증이 완료되었습니다.");
    } catch (err) {
      setErrorMsg(err.message || "인증번호 확인 실패");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!phoneVerified) {
      setErrorMsg("휴대폰 본인인증을 먼저 완료해 주세요.");
      return;
    }
    if (!consentTerms || !consentPrivacy) {
      setErrorMsg("필수 약관에 동의해 주세요.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const consentedTypes = [];
      if (consentTerms) consentedTypes.push("USER_TERMS");
      if (consentPrivacy) consentedTypes.push("PRIVACY_POLICY");

      await registerBuyer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        consentedTypes,
      });

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.warn("Auto-login error after signup:", error);
      } else if (data?.user) {
        await syncUser({ name: name.trim(), phone: phone.trim() }).catch(() => {});
      }

      showToast("미용사 회원가입이 완료되었습니다!");
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      console.error("Signup submit error:", err);
      setErrorMsg(err.message || "회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="byc-scroll fadein" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => router.back()}
          style={styles.backBtn}
          aria-label="뒤로가기"
        >
          <Icon name="chev-l-sm" size={20} />
        </button>

        <div style={styles.headerTitle}>
          <Wordmark />
        </div>
        <div style={{ width: 36 }} />
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.titleSection}>
          <h1 style={styles.h1}>회원가입</h1>
          <p style={styles.subtext}>
            미용인 전용 수제 도구 마켓 <strong>미용사</strong>의 다양한 혜택을 이용해 보세요.
          </p>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleSignupSubmit} style={styles.form}>
          {/* Step 1: Phone Verification */}
          <div style={styles.stepBox}>
            <div style={styles.stepHeader}>
              <span style={styles.stepBadge}>1</span>
              <b style={styles.stepTitle}>휴대폰 본인 인증 (필수)</b>
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="signup-phone" style={styles.label}>휴대폰 번호</label>
              <div style={styles.inlineRow}>
                <input
                  id="signup-phone"
                  type="tel"
                  style={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  disabled={phoneLoading || phoneVerified}
                />
                <button
                  type="button"
                  onClick={handleRequestPhoneVerification}
                  style={styles.inlineBtn}
                  disabled={phoneLoading || phoneVerified || !phone}
                >
                  {phoneRequested ? "재발송" : "인증요청"}
                </button>
              </div>
            </div>

            {phoneRequested && !phoneVerified && (
              <div style={styles.inputGroup}>
                <label htmlFor="signup-phone-code" style={styles.label}>인증번호 6자리</label>
                <div style={styles.inlineRow}>
                  <input
                    id="signup-phone-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    style={styles.input}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="123456"
                    disabled={phoneLoading}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneCode}
                    style={styles.inlineBtnPrimary}
                    disabled={phoneLoading || phoneCode.length !== 6}
                  >
                    인증확인
                  </button>
                </div>
                {phoneDebugCode && (
                  <div style={styles.debugText}>
                    💡 개발/테스트용 인증번호: <strong>{phoneDebugCode}</strong>
                  </div>
                )}
              </div>
            )}

            {phoneVerified && (
              <div style={styles.verifiedSuccessBadge}>
                ✓ 휴대폰 인증이 정상적으로 완료되었습니다.
              </div>
            )}
          </div>

          {/* Step 2: Account Details */}
          <div style={styles.stepBox}>
            <div style={styles.stepHeader}>
              <span style={styles.stepBadge}>2</span>
              <b style={styles.stepTitle}>기본 회원 정보</b>
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="signup-name" style={styles.label}>이름 (실명)</label>
              <input
                id="signup-name"
                type="text"
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                disabled={loading || !phoneVerified}
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="signup-email" style={styles.label}>이메일 주소</label>
              <input
                id="signup-email"
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                disabled={loading || !phoneVerified}
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="signup-password" style={styles.label}>비밀번호 (6자 이상)</label>
              <div style={styles.passwordWrapper}>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  style={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading || !phoneVerified}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Terms Consents */}
          <div style={styles.stepBox}>
            <div style={styles.stepHeader}>
              <span style={styles.stepBadge}>3</span>
              <b style={styles.stepTitle}>약관 동의</b>
            </div>

            <div style={styles.consentList}>
              <label style={styles.consentRowAll}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={consentTerms && consentPrivacy}
                  onChange={(e) => {
                    setConsentTerms(e.target.checked);
                    setConsentPrivacy(e.target.checked);
                  }}
                />
                <b>전체 동의하기</b>
              </label>

              <label style={styles.consentRow}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={consentTerms}
                  onChange={(e) => setConsentTerms(e.target.checked)}
                />
                <span>
                  [필수]{" "}
                  <Link href="/terms" target="_blank" style={styles.termsLink}>
                    서비스 이용약관
                  </Link>{" "}
                  동의
                </span>
              </label>

              <label style={styles.consentRow}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                />
                <span>
                  [필수]{" "}
                  <Link href="/terms/privacy" target="_blank" style={styles.termsLink}>
                    개인정보 수집 및 이용
                  </Link>{" "}
                  동의
                </span>
              </label>
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            style={{
              ...styles.primaryBtn,
              opacity: loading || !phoneVerified ? 0.6 : 1,
              cursor: loading || !phoneVerified ? "default" : "pointer",
            }}
            disabled={loading || !phoneVerified}
          >
            {loading
              ? "가입 처리 중..."
              : !phoneVerified
              ? "휴대폰 본인인증 필요"
              : "가입 완료하기"}
          </button>
        </form>

        <div style={styles.bottomActions}>
          <span style={styles.helperText}>이미 계정이 있으신가요?</span>
          <Link
            href={`/login${returnTo !== "/my" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            style={styles.signupLink}
          >
            로그인하러 가기
          </Link>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    paddingBottom: 40,
    background: "var(--paper)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    padding: "0 16px",
    borderBottom: "1px solid var(--line)",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ink)",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    padding: "24px 20px 40px",
  },
  titleSection: {
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 900,
    margin: "0 0 6px",
    color: "var(--ink)",
    letterSpacing: "-0.02em",
  },
  subtext: {
    fontSize: 13,
    color: "var(--muted)",
    margin: 0,
    lineHeight: 1.6,
  },
  errorAlert: {
    background: "#fdf2f2",
    border: "1px solid #f8b4b4",
    color: "#e02424",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    marginBottom: 18,
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--muted)",
  },
  input: {
    width: "100%",
    height: 44,
    border: "1px solid var(--line-strong)",
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 14,
    background: "#fff",
    color: "var(--ink)",
    outline: "none",
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "var(--muted)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    height: 48,
    background: "var(--ink)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    fontSize: 14.5,
    fontWeight: 800,
    marginTop: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
  },
  bottomActions: {
    marginTop: 24,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  helperText: {
    color: "var(--muted)",
  },
  signupLink: {
    color: "var(--ink)",
    fontWeight: 800,
    textDecoration: "underline",
  },
  roleNoticeCard: {
    marginTop: 32,
    padding: "14px 16px",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
  },
  roleNoticeHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 800,
    color: "var(--ink)",
    marginBottom: 4,
  },
  roleNoticeBody: {
    fontSize: 11.5,
    color: "var(--muted)",
    margin: 0,
    lineHeight: 1.5,
  },
  stepBox: {
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "var(--ink)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--ink)",
  },
  inlineRow: {
    display: "flex",
    gap: 8,
  },
  inlineBtn: {
    width: 90,
    height: 44,
    border: "1px solid var(--line-strong)",
    borderRadius: 8,
    background: "var(--surface)",
    color: "var(--ink)",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },
  inlineBtnPrimary: {
    width: 90,
    height: 44,
    border: "none",
    borderRadius: 8,
    background: "var(--ink)",
    color: "#fff",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },
  debugText: {
    fontSize: 11.5,
    color: "var(--muted)",
    background: "var(--surface)",
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px dashed var(--line-strong)",
  },
  verifiedSuccessBadge: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
  },
  consentList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  consentRowAll: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottom: "1px solid var(--line)",
    cursor: "pointer",
    fontSize: 13,
    color: "var(--ink)",
  },
  consentRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12.5,
    color: "var(--ink-soft)",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "var(--ink)",
    cursor: "pointer",
  },
  termsLink: {
    color: "var(--ink)",
    fontWeight: 700,
    textDecoration: "underline",
  },
};
