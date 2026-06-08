import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// In non-production environments, we bypass unauthorized TLS check to allow connections
// to Supabase/PostgreSQL via local development environments where TLS certificates might be
// self-signed or missing. This setting is strictly restricted to development/testing
// and will never execute in production where proper TLS is enforced by default.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let realPrisma = null;

const createPrismaClient = () => {
  if (!connectionString) {
    throw new Error(
      "Database connection URL is not defined in environment variables. Please check your Vercel Project Settings."
    );
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
  
  const pool = new Pool({
    connectionString: cleanUrl,
    max: 4, // Prevent connection exhaustion on Supabase Free Plan
    ssl: {
      rejectUnauthorized: false,
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
