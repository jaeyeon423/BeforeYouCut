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

async function main() {
  const prisma = createPrisma();
  try {
    console.log("기존 등록된 모든 상품 삭제 작업을 시작합니다...");
    await prisma.like.deleteMany({});
    const deleted = await prisma.product.deleteMany({});
    
    // Reset productsCount for all sellers
    await prisma.seller.updateMany({
      data: { productsCount: 0 },
    });

    console.log(`PASS 총 ${deleted.count}개의 기존 상품 삭제 및 셀러 상품 수 초기화가 완료되었습니다.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  process.exitCode = 1;
});
