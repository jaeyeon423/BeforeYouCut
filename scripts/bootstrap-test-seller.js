#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const { cleanEnv, loadEnvFiles } = require("./lib/env");

loadEnvFiles();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || "0";

function getDatabaseUrl() {
  return (
    cleanEnv("DATABASE_URL") ||
    cleanEnv("POSTGRES_PRISMA_URL") ||
    cleanEnv("POSTGRES_URL") ||
    cleanEnv("DIRECT_URL") ||
    cleanEnv("POSTGRES_URL_NON_POOLING")
  );
}

function createPrisma() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL 또는 POSTGRES_* DB URL이 필요합니다.");
  }
  const parsedUrl = new URL(connectionString.replace(/^["']|["']$/g, ""));
  parsedUrl.searchParams.delete("sslmode");
  const pool = new Pool({
    connectionString: parsedUrl.toString(),
    max: 2,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function findAuthUserByEmail(supabase, email) {
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < perPage) break;
  }
  return null;
}

async function upsertAuthUser(supabase, { email, password, name, phone }) {
  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  const email = String(emailArg || cleanEnv("TEST_SELLER_EMAIL") || "").trim().toLowerCase();
  const password = String(passwordArg || cleanEnv("TEST_SELLER_PASSWORD") || "").trim();
  if (!email || !password) {
    throw new Error("사용법: node scripts/bootstrap-test-seller.js <email> <password>");
  }
  if (password.length < 8) {
    throw new Error("테스트 판매자 비밀번호는 8자 이상이어야 합니다.");
  }

  const supabaseUrl = cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = cleanEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const prisma = createPrisma();
  const sellerId = cleanEnv("TEST_SELLER_ID") || "test-seller-account";
  const name = cleanEnv("TEST_SELLER_NAME") || "테스트 셀러";
  const phone = cleanEnv("TEST_SELLER_PHONE") || "01000000000";

  try {
    const authUser = await upsertAuthUser(supabase, { email, password, name, phone });

    await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email,
        name,
        phone,
        role: "SELLER",
      },
      create: {
        id: authUser.id,
        email,
        name,
        phone,
        role: "SELLER",
      },
    });

    await prisma.seller.upsert({
      where: { id: sellerId },
      update: {
        name,
        verified: true,
        desc: "미용인을 위한 전문 도구 브랜드",
        category: "도구",
        followers: "0",
        productsCount: 0,
        since: new Date().getFullYear().toString(),
        tone: "tone-a",
        story: [
          `${name}은 미용인의 전문적인 시술 환경을 위한 고품질 도구를 제안합니다.`,
          "현장 피드백을 바탕으로 검증된 상품과 신속한 사후관리를 약속합니다."
        ],
        notice: "신규 입점 안내 — 전 상품 안전 포장 및 출고",
        isActive: true,
        sellerType: "BUSINESS",
        businessName: name,
        representative: "김재연",
        businessRegNo: "8881802645",
        kycStatus: "APPROVED",
        kycMemo: null,
        kycSubmittedAt: new Date(),
        kycReviewedAt: new Date(),
        kycReviewedBy: "bootstrap-test-seller",
        userId: authUser.id,
      },
      create: {
        id: sellerId,
        name,
        verified: true,
        desc: "미용인을 위한 전문 도구 브랜드",
        category: "도구",
        followers: "0",
        productsCount: 0,
        since: new Date().getFullYear().toString(),
        tone: "tone-a",
        story: [
          `${name}은 미용인의 전문적인 시술 환경을 위한 고품질 도구를 제안합니다.`,
          "현장 피드백을 바탕으로 검증된 상품과 신속한 사후관리를 약속합니다."
        ],
        notice: "신규 입점 안내 — 전 상품 안전 포장 및 출고",
        isActive: true,
        sellerType: "BUSINESS",
        businessName: name,
        representative: "김재연",
        kycStatus: "APPROVED",
        kycSubmittedAt: new Date(),
        kycReviewedAt: new Date(),
        kycReviewedBy: "bootstrap-test-seller",
        userId: authUser.id,
      },
    });

    console.log(`PASS ${email} - SELLER account is ready (${sellerId})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
