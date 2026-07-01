#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const { cleanEnv, loadEnvFiles } = require("./lib/env");

loadEnvFiles();

const checks = [];

function record(ok, label, detail = "") {
  checks.push({ ok, label, detail });
  const prefix = ok ? "PASS" : "FAIL";
  console[ok ? "log" : "error"](`${prefix} ${label}${detail ? ` - ${detail}` : ""}`);
}

function requireEnv(name) {
  const value = cleanEnv(name);
  if (!value) {
    record(false, name, "환경변수가 비어 있습니다.");
    return null;
  }
  record(true, name);
  return value;
}

async function listWithAnon(client, bucket) {
  const { data, error } = await client.storage.from(bucket).list("", { limit: 1 });
  return { data, error };
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    process.exitCode = 1;
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  if (bucketError) {
    record(false, "storage.listBuckets", bucketError.message);
    process.exitCode = 1;
    return;
  }

  const bucketByName = new Map((buckets || []).map((bucket) => [bucket.name, bucket]));
  const productBucket = bucketByName.get("product-images");
  const sellerDocsBucket = bucketByName.get("seller-documents");

  record(Boolean(productBucket), "product-images bucket", productBucket ? "" : "버킷이 없습니다. prisma/rls.sql을 적용하세요.");
  if (productBucket) {
    record(productBucket.public === true, "product-images public flag", `현재 public=${productBucket.public}`);
  }

  record(Boolean(sellerDocsBucket), "seller-documents bucket", sellerDocsBucket ? "" : "버킷이 없습니다. prisma/rls.sql을 적용하세요.");
  if (sellerDocsBucket) {
    record(sellerDocsBucket.public === false, "seller-documents private flag", `현재 public=${sellerDocsBucket.public}`);
  }

  if (productBucket) {
    const { error } = await listWithAnon(anon, "product-images");
    record(!error, "anon can list product-images", error?.message || "");
  }

  if (sellerDocsBucket) {
    const { error } = await listWithAnon(anon, "seller-documents");
    record(Boolean(error), "anon cannot list seller-documents", error ? error.message : "anon 키로 목록 조회가 허용됩니다.");
  }

  const failures = checks.filter((check) => !check.ok);
  console.log("");
  console.log(`Summary: ${failures.length} failure(s)`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
