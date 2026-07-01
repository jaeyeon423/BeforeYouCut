#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const { cleanEnv, loadEnvFiles } = require("./lib/env");

loadEnvFiles();

function getDatabaseUrl() {
  return (
    cleanEnv("DATABASE_URL") ||
    cleanEnv("POSTGRES_PRISMA_URL") ||
    cleanEnv("POSTGRES_URL") ||
    cleanEnv("DIRECT_URL") ||
    cleanEnv("POSTGRES_URL_NON_POOLING")
  );
}

function parseAdminEmails() {
  const cliEmails = process.argv.slice(2);
  const source = cliEmails.length > 0 ? cliEmails.join(",") : cleanEnv("ADMIN_EMAILS");
  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
    ssl: { rejectUnauthorized: process.env.VERCEL_ENV === "production" },
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

async function main() {
  const emails = parseAdminEmails();
  if (emails.length === 0) {
    throw new Error("관리자로 지정할 이메일을 인자로 넘기거나 ADMIN_EMAILS에 설정하세요.");
  }

  const supabaseUrl = cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = cleanEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const prisma = createPrisma();

  try {
    for (const email of emails) {
      const authUser = await findAuthUserByEmail(supabase, email);
      if (!authUser) {
        console.warn(`WARN ${email} - Supabase Auth 사용자를 찾지 못했습니다. 먼저 해당 이메일로 가입/로그인하세요.`);
        continue;
      }

      await prisma.user.upsert({
        where: { id: authUser.id },
        update: {
          email,
          role: "ADMIN",
        },
        create: {
          id: authUser.id,
          email,
          name: authUser.user_metadata?.name || email.split("@")[0],
          phone: authUser.user_metadata?.phone || null,
          role: "ADMIN",
        },
      });
      console.log(`PASS ${email} - ADMIN role applied`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
