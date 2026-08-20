#!/usr/bin/env node

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

async function main() {
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

  const client = await pool.connect();
  try {
    console.log("Supabase Storage RLS 정책을 적용합니다...");

    // 1. Allow public read on product-images
    await client.query(`
      DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
      CREATE POLICY "product_images_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'product-images');
    `);

    // 2. Allow authenticated users to upload to product-images
    await client.query(`
      DROP POLICY IF EXISTS "product_images_auth_insert" ON storage.objects;
      CREATE POLICY "product_images_auth_insert" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
    `);

    // 3. Allow authenticated users to update/delete their images in product-images
    await client.query(`
      DROP POLICY IF EXISTS "product_images_auth_update" ON storage.objects;
      CREATE POLICY "product_images_auth_update" ON storage.objects
        FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
    `);

    console.log("PASS Storage RLS 정책 적용이 완료되었습니다.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exitCode = 1;
});
