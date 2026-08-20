#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
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
    throw new Error("DATABASE_URL이 필요합니다.");
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

async function main() {
  const prisma = createPrisma();
  try {
    console.log("DHUH 셀러 브랜드 프로필을 정식 상용 정보로 업데이트합니다...");

    const updated = await prisma.seller.updateMany({
      where: { id: "dhuh" },
      data: {
        name: "DHUH",
        desc: "미용인을 위한 프리미엄 전문 도구 브랜드",
        category: "도구",
        story: [
          "DHUH(디에이치유에이치)는 현장 미용인의 정밀한 작업과 편안한 시술을 위해 최고 품질의 전문 도구를 엄선하고 제작합니다.",
          "엄격한 품질 기준과 현장 필드 테스트를 거쳐 검증된 정품 도구만을 제안하며, 1:1 맞춤 상담 및 신속한 사후관리를 지원합니다."
        ],
        notice: "신규 입점 — 전 상품 안전 포장 및 무료 배송 진행 중",
        businessName: "디에이치유에이치",
        representative: "김재연",
        businessRegNo: "8881802645",
      },
    });

    console.log(`PASS ${updated.count}개 셀러 프로필 업데이트 완료!`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exitCode = 1;
});
