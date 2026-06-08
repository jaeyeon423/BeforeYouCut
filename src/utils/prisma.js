import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

let prisma;

const createPrismaClient = () => {
  if (!connectionString) {
    throw new Error("Database connection URL is not defined in environment variables.");
  }
  
  // Clean connection string (remove quotes)
  let cleanUrl = connectionString.replace(/^["']|["']$/g, '');
  // Remove sslmode parameter to prevent node-postgres from overriding our custom ssl options
  cleanUrl = cleanUrl.replace(/[?&]sslmode=[^&]*/, '');
  
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.globalPrisma) {
    global.globalPrisma = createPrismaClient();
  }
  prisma = global.globalPrisma;
}

export { prisma };
export default prisma;
