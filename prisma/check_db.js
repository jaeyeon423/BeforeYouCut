const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

let connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (connectionString) {
  connectionString = connectionString.replace(/^["']|["']$/g, '');
  try {
    const parsedUrl = new URL(connectionString);
    parsedUrl.searchParams.delete('sslmode');
    connectionString = parsedUrl.toString();
  } catch (e) {
    console.error("Failed to parse DB URL:", e);
  }
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.product.count();
  console.log("Product count in DB:", count);
  const products = await prisma.product.findMany();
  console.log("Products in DB:", products.map(p => ({ id: p.id, name: p.name, cat: p.cat })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
