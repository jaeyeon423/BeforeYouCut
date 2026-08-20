#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const { cleanEnv, loadEnvFiles } = require("./lib/env");

loadEnvFiles();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || "0";

async function main() {
  const supabaseUrl = cleanEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = cleanEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log("Supabase Storage 버킷 생성 및 확인을 시작합니다...");

  // 1. product-images (공개 이미지 버킷)
  const { error: pError } = await supabase.storage.createBucket("product-images", {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  });

  if (pError && !pError.message?.toLowerCase().includes("already exists")) {
    console.error("product-images 생성 에러:", pError.message);
  } else {
    console.log("PASS product-images 버킷 준비 완료 (Public: true)");
  }

  // 2. seller-documents (비공개 서류 버킷)
  const { error: sError } = await supabase.storage.createBucket("seller-documents", {
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  });

  if (sError && !sError.message?.toLowerCase().includes("already exists")) {
    console.error("seller-documents 생성 에러:", sError.message);
  } else {
    console.log("PASS seller-documents 버킷 준비 완료 (Public: false)");
  }
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exitCode = 1;
});
