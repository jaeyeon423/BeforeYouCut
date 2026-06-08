const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config({ path: '.env.local' });
dotenv.config();

let connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (connectionString) {
  connectionString = connectionString.replace(/^["']|["']$/g, '');
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
  console.log("Cleaning database...");

  // Delete in reverse order of foreign key dependencies
  const orderItemsDeleted = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${orderItemsDeleted.count} order items.`);

  const ordersDeleted = await prisma.order.deleteMany({});
  console.log(`Deleted ${ordersDeleted.count} orders.`);

  const likesDeleted = await prisma.like.deleteMany({});
  console.log(`Deleted ${likesDeleted.count} likes.`);

  const followsDeleted = await prisma.follow.deleteMany({});
  console.log(`Deleted ${followsDeleted.count} follows.`);

  const productsDeleted = await prisma.product.deleteMany({});
  console.log(`Deleted ${productsDeleted.count} products.`);

  const sellersDeleted = await prisma.seller.deleteMany({});
  console.log(`Deleted ${sellersDeleted.count} sellers.`);

  // Delete all users EXCEPT the default guest user
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      NOT: {
        id: "user_default"
      }
    }
  });
  console.log(`Deleted ${usersDeleted.count} users (except default guest user).`);

  // Ensure default guest user exists for seamless out-of-the-box operations
  await prisma.user.upsert({
    where: { id: "user_default" },
    update: {},
    create: {
      id: "user_default",
      email: "guest@beforeyoucut.com",
      name: "게스트 사용자",
      role: "BUYER",
    },
  });
  console.log("Verified default guest user exists.");

  console.log("Database cleaned successfully! Ready for real production data.");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
