const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');


dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

async function test() {
  console.log("Testing connection with connection string...");
  if (!connectionString) {
    console.error("No connection string found!");
    return;
  }
  
  let cleanUrl = connectionString.replace(/^["']|["']$/g, '');
  console.log("Original URL:", cleanUrl.replace(/:[^:@/]+@/, ':***@'));
  
  // Test 1: with sslmode stripped
  let strippedUrl = cleanUrl.replace(/[?&]sslmode=[^&]*/, '');
  console.log("Stripped URL:", strippedUrl.replace(/:[^:@/]+@/, ':***@'));

  try {
    const pool = new Pool({
      connectionString: strippedUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    const users = await prisma.user.findMany();
    console.log("Test 1 SUCCESS! Users:", users);
    await prisma.$disconnect();
  } catch (e) {
    console.error("Test 1 FAILED:", e);
  }

  // Test 2: exactly as src/utils/prisma.js is currently written
  try {
    const pool = new Pool({
      connectionString: strippedUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    const users = await prisma.user.findMany();
    console.log("Test 2 SUCCESS! Users:", users);
    await prisma.$disconnect();
  } catch (e) {
    console.error("Test 2 FAILED:", e);
  }
}

test();
