#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { cleanEnv, isPlaceholder, loadEnvFiles } = require("./lib/env");

loadEnvFiles();

const args = new Set(process.argv.slice(2));
const productionMode = args.has("--production") || process.env.VERCEL_ENV === "production";
const liveUrlArgIndex = process.argv.findIndex((arg) => arg === "--url");
const liveUrl = liveUrlArgIndex >= 0 ? process.argv[liveUrlArgIndex + 1] : "";

const failures = [];
const warnings = [];

function pass(label) {
  console.log(`PASS ${label}`);
}

function warn(label, detail) {
  warnings.push(`${label}${detail ? `: ${detail}` : ""}`);
  console.warn(`WARN ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label, detail) {
  failures.push(`${label}${detail ? `: ${detail}` : ""}`);
  console.error(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
}

function requireEnv(name, { validator, placeholderAllowed = false } = {}) {
  const value = cleanEnv(name);
  if (!value) {
    fail(name, "환경변수가 비어 있습니다.");
    return null;
  }
  if (!placeholderAllowed && isPlaceholder(value)) {
    fail(name, "placeholder 값으로 보입니다.");
    return null;
  }
  if (validator) {
    const result = validator(value);
    if (result !== true) {
      fail(name, result);
      return null;
    }
  }
  pass(name);
  return value;
}

function requireOneOf(names, label) {
  const found = names.find((name) => cleanEnv(name));
  if (!found) {
    fail(label, `${names.join(" 또는 ")} 중 하나가 필요합니다.`);
    return null;
  }
  if (isPlaceholder(cleanEnv(found))) {
    fail(found, "placeholder DB URL로 보입니다.");
    return null;
  }
  pass(`${label} (${found})`);
  return found;
}

function validateHexLength(length) {
  return (value) => (/^[0-9a-f]+$/i.test(value) && value.length === length) || `${length}자 hex 값이어야 합니다.`;
}

function validateUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) || "http(s) URL이어야 합니다.";
  } catch {
    return "올바른 URL 형식이 아닙니다.";
  }
}

function checkTossKey(name, testPrefix, livePrefix) {
  const value = cleanEnv(name);
  if (!value) {
    fail(name, "환경변수가 비어 있습니다.");
    return;
  }
  if (isPlaceholder(value)) {
    fail(name, "placeholder 값으로 보입니다.");
    return;
  }
  if (!value.startsWith(testPrefix) && !value.startsWith(livePrefix)) {
    fail(name, `${testPrefix} 또는 ${livePrefix} 로 시작해야 합니다.`);
    return;
  }
  if (productionMode && value.startsWith(testPrefix)) {
    fail(name, "Vercel Production 출시 전 live 키로 교체해야 합니다.");
    return;
  } else if (value.startsWith(testPrefix)) {
    warn(name, "현재 테스트 키입니다. --production 실행 시 실패 처리됩니다.");
  }
  pass(name);
}

function checkSiteConfig() {
  const configPath = path.join(process.cwd(), "src/site.config.js");
  if (!fs.existsSync(configPath)) {
    fail("src/site.config.js", "파일을 찾을 수 없습니다.");
    return;
  }
  const source = fs.readFileSync(configPath, "utf8");
  const fields = [
    ["business.name", /name:\s*"([^"]*)"/],
    ["business.ceo", /ceo:\s*"([^"]*)"/],
    ["business.address", /address:\s*"([^"]*)"/],
    ["business.phone", /phone:\s*"([^"]*)"/],
    ["business.email", /email:\s*"([^"]*)"/],
    ["business.businessRegNo", /businessRegNo:\s*"([^"]*)"/],
    ["business.mailOrderRegNo", /mailOrderRegNo:\s*"([^"]*)"/],
    ["business.privacyOfficer.name", /privacyOfficer:\s*\{[\s\S]*?name:\s*"([^"]*)"/],
    ["business.privacyOfficer.email", /privacyOfficer:\s*\{[\s\S]*?email:\s*"([^"]*)"/],
    ["service.url", /url:\s*"([^"]*)"/],
  ];

  for (const [label, pattern] of fields) {
    const value = source.match(pattern)?.[1]?.trim() || "";
    if (!value || isPlaceholder(value)) {
      fail(label, "공개 표시용 운영 정보가 비어 있거나 placeholder입니다.");
    } else {
      pass(label);
    }
  }
}

async function checkLiveUrl(baseUrl) {
  if (!baseUrl) return;
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    fail("--url", "올바른 URL을 입력해 주세요.");
    return;
  }

  const paths = ["/", "/category", "/terms", "/terms/privacy", "/terms/refund"];
  for (const pathname of paths) {
    const url = `${origin}${pathname}`;
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 400) {
        pass(`live ${pathname}`);
      } else {
        fail(`live ${pathname}`, `HTTP ${response.status}`);
      }
    } catch (error) {
      fail(`live ${pathname}`, error.message);
    }
  }
}

async function main() {
  console.log(`Production mode: ${productionMode ? "yes" : "no"}`);

  requireEnv("NEXT_PUBLIC_SUPABASE_URL", { validator: validateUrl });
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireOneOf(["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DIRECT_URL", "POSTGRES_URL_NON_POOLING"], "Database URL");

  checkTossKey("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_ck_", "live_ck_");
  checkTossKey("TOSS_SECRET_KEY", "test_sk_", "live_sk_");
  requireEnv("TOSS_WEBHOOK_SECRET");
  requireEnv("PG_MERCHANT_ID");
  requireEnv("CHECKOUT_SESSION_SECRET");

  requireEnv("ADMIN_EMAILS");
  requireEnv("ENCRYPTION_KEY", { validator: validateHexLength(64) });
  requireEnv("ENCRYPTION_IV", { validator: validateHexLength(32) });
  requireEnv("PHONE_VERIFICATION_SECRET");

  requireEnv("NAVER_SENS_SERVICE_ID");
  requireEnv("NAVER_SENS_ACCESS_KEY");
  requireEnv("NAVER_SENS_SECRET_KEY");
  requireEnv("NAVER_SENS_SMS_FROM");

  requireEnv("NEXT_PUBLIC_SENTRY_DSN", { validator: validateUrl });
  requireEnv("SENTRY_ORG");
  requireEnv("SENTRY_PROJECT");
  requireEnv("SENTRY_AUTH_TOKEN");

  checkSiteConfig();
  await checkLiveUrl(liveUrl);

  console.log("");
  console.log(`Summary: ${failures.length} failure(s), ${warnings.length} warning(s)`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
