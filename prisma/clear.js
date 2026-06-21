const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');


dotenv.config({ path: '.env.local' });
dotenv.config();

let connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

let cleanUrl = connectionString;
if (connectionString) {
  cleanUrl = connectionString.replace(/^["']|["']$/g, '');
  try {
    const parsedUrl = new URL(cleanUrl);
    parsedUrl.searchParams.delete('sslmode');
    cleanUrl = parsedUrl.toString();
  } catch (e) {
    console.error("Failed to parse database connection URL:", e);
  }
}

const pool = new Pool({
  connectionString: cleanUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning database...");

  // Delete in reverse order of foreign key dependencies
  const repliesDeleted = await prisma.csReply.deleteMany({});
  console.log(`Deleted ${repliesDeleted.count} CS replies.`);

  const inquiriesDeleted = await prisma.csInquiry.deleteMany({});
  console.log(`Deleted ${inquiriesDeleted.count} CS inquiries.`);

  const settlementsDeleted = await prisma.settlement.deleteMany({});
  console.log(`Deleted ${settlementsDeleted.count} settlements.`);

  const refundsDeleted = await prisma.refundRequest.deleteMany({});
  console.log(`Deleted ${refundsDeleted.count} refund requests.`);

  const shipmentsDeleted = await prisma.shipmentTracking.deleteMany({});
  console.log(`Deleted ${shipmentsDeleted.count} shipment records.`);

  const auditLogsDeleted = await prisma.auditLog.deleteMany({});
  console.log(`Deleted ${auditLogsDeleted.count} audit logs.`);

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

  const bankAccountsDeleted = await prisma.sellerBankAccount.deleteMany({});
  console.log(`Deleted ${bankAccountsDeleted.count} seller bank accounts.`);

  const sellersDeleted = await prisma.seller.deleteMany({});
  console.log(`Deleted ${sellersDeleted.count} sellers.`);

  const consentsDeleted = await prisma.consentRecord.deleteMany({});
  console.log(`Deleted ${consentsDeleted.count} consent records.`);

  const phoneVerificationsDeleted = await prisma.phoneVerification.deleteMany({});
  console.log(`Deleted ${phoneVerificationsDeleted.count} phone verification records.`);

  const usersDeleted = await prisma.user.deleteMany({});
  console.log(`Deleted ${usersDeleted.count} users.`);

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
