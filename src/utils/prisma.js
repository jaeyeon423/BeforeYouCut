import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// DATABASE_TLS_REJECT_UNAUTHORIZED can force TLS certificate verification on/off.
// By default, Vercel production verifies certificates; local and non-production
// builds keep the Supabase development bypass for self-signed certificate chains.

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder?sslmode=disable";

let realPrisma = null;

function parseBooleanEnv(value) {
  if (value === undefined) return null;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function shouldRejectDatabaseTlsUnauthorized() {
  const override = parseBooleanEnv(process.env.DATABASE_TLS_REJECT_UNAUTHORIZED);
  if (override !== null) return override;
  return process.env.VERCEL_ENV === 'production';
}

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL && !process.env.DIRECT_URL && !process.env.POSTGRES_URL_NON_POOLING) {
    console.warn("WARNING: Database connection URL is not defined in environment variables. Prisma will fail queries gracefully via actions try-catch blocks.");
  }
  
  // Clean connection string (remove quotes)
  let cleanUrl = connectionString.replace(/^["']|["']$/g, '');
  
  // Safely parse URL to modify query parameters without breaking query syntax
  try {
    const parsedUrl = new URL(cleanUrl);
    parsedUrl.searchParams.delete('sslmode');
    cleanUrl = parsedUrl.toString();
  } catch (e) {
    console.error("Failed to parse database connection URL:", e);
  }
  
  const rejectUnauthorized = shouldRejectDatabaseTlsUnauthorized();

  const pool = new Pool({
    connectionString: cleanUrl,
    max: 4, // Prevent connection exhaustion on Supabase Free Plan
    ssl: {
      rejectUnauthorized,
    },
  });
  
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prismaProxy = new Proxy({}, {
  get(target, prop) {
    if (!realPrisma) {
      if (process.env.NODE_ENV === 'production') {
        realPrisma = createPrismaClient();
      } else {
        if (!global.globalPrisma) {
          global.globalPrisma = createPrismaClient();
        }
        realPrisma = global.globalPrisma;
      }
    }
    return realPrisma[prop];
  }
});

export { prismaProxy as prisma };
export default prismaProxy;
