-- ============================================================
-- Row Level Security (RLS) 정책
-- 개인정보보호법 제29조 — 안전성 확보 조치 (접근 권한 최소화)
--
-- 적용 방법:
--   Supabase 대시보드 → SQL Editor → 이 파일 내용 실행
--   또는: supabase db push (CLI)
--
-- 주의:
--   - Prisma는 service_role 키로 접속 → RLS 우회 가능 → 서버에서만 사용할 것
--   - 클라이언트(anon key)는 RLS 정책을 통과해야만 데이터 접근 가능
--   - TODO(운영자 확인): 적용 전 Supabase 프로젝트 auth.users 구조 확인
-- ============================================================

-- ── User 테이블 ──────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- 본인만 자신의 레코드 조회 가능
CREATE POLICY "user_select_own" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

-- 본인만 자신의 레코드 수정 가능
CREATE POLICY "user_update_own" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- ── Order 테이블 ─────────────────────────────────────────────
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- 구매자: 본인 주문만 조회
CREATE POLICY "order_select_buyer" ON "Order"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 판매자: 자신의 상품이 포함된 주문 조회
-- (Prisma 서버 레이어에서 JOIN으로 처리 — 직접 SELECT 정책은 복잡도로 생략)

-- ── OrderItem 테이블 ─────────────────────────────────────────
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orderitem_select_buyer" ON "OrderItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Order"
      WHERE "Order".id = "OrderItem"."orderId"
        AND "Order"."userId" = auth.uid()::text
    )
  );

-- ── ConsentRecord 테이블 ─────────────────────────────────────
ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;

-- 본인 동의 이력만 조회
CREATE POLICY "consent_select_own" ON "ConsentRecord"
  FOR SELECT USING (auth.uid()::text = "userId");

-- 서버(service_role)만 INSERT 허용 — 클라이언트 직접 INSERT 차단
CREATE POLICY "consent_insert_server_only" ON "ConsentRecord"
  FOR INSERT WITH CHECK (false); -- service_role은 RLS 우회하므로 안전

-- ── SellerBankAccount 테이블 (민감 정보) ────────────────────
ALTER TABLE "SellerBankAccount" ENABLE ROW LEVEL SECURITY;

-- 해당 판매자 본인만 조회
CREATE POLICY "bankaccount_select_own" ON "SellerBankAccount"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Seller"
      WHERE "Seller".id = "SellerBankAccount"."sellerId"
        AND "Seller"."userId" = auth.uid()::text
    )
  );

-- 서버(service_role)만 INSERT/UPDATE — 클라이언트 직접 쓰기 차단
CREATE POLICY "bankaccount_write_server_only" ON "SellerBankAccount"
  FOR ALL WITH CHECK (false);

-- ── Settlement 테이블 ────────────────────────────────────────
ALTER TABLE "Settlement" ENABLE ROW LEVEL SECURITY;

-- 판매자는 자신의 정산 내역만 조회
CREATE POLICY "settlement_select_seller" ON "Settlement"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Seller"
      WHERE "Seller".id = "Settlement"."sellerId"
        AND "Seller"."userId" = auth.uid()::text
    )
  );

-- ── RefundRequest 테이블 ─────────────────────────────────────
ALTER TABLE "RefundRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refund_select_owner" ON "RefundRequest"
  FOR SELECT USING (auth.uid()::text = "userId");

-- ── CsInquiry 테이블 ─────────────────────────────────────────
ALTER TABLE "CsInquiry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiry_select_owner" ON "CsInquiry"
  FOR SELECT USING (auth.uid()::text = "userId");

-- ── AuditLog 테이블 (관리자만) ──────────────────────────────
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- 클라이언트는 감사 로그 직접 접근 불가 — 서버(service_role)만 접근
CREATE POLICY "auditlog_no_client_access" ON "AuditLog"
  FOR ALL USING (false);

-- ── Like / Follow / Product / Seller — 공개 읽기 ────────────
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "like_select_public" ON "Like" FOR SELECT USING (true);
CREATE POLICY "like_write_own" ON "Like"
  FOR ALL USING (auth.uid()::text = "userId");

ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_select_public" ON "Follow" FOR SELECT USING (true);
CREATE POLICY "follow_write_own" ON "Follow"
  FOR ALL USING (auth.uid()::text = "userId");

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_select_public" ON "Product" FOR SELECT USING (true);
-- 상품 쓰기는 서버(service_role)만
CREATE POLICY "product_write_server_only" ON "Product"
  FOR ALL WITH CHECK (false);

ALTER TABLE "Seller" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller_select_public" ON "Seller" FOR SELECT USING (true);
CREATE POLICY "seller_write_server_only" ON "Seller"
  FOR ALL WITH CHECK (false);

-- ── Supabase Storage 버킷/정책 ──────────────────────────────
-- product-images: 공개 상품 이미지. seller-documents: 비공개 KYC/정산 서류.
-- 아래 storage.* 정책은 Supabase SQL Editor에서 실행해야 한다.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seller-documents',
  'seller-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_seller_write_own" ON storage.objects;
CREATE POLICY "product_images_seller_write_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public."Seller"
      WHERE "Seller".id = (storage.foldername(name))[1]
        AND "Seller"."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "seller_documents_select_own" ON storage.objects;
CREATE POLICY "seller_documents_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'seller-documents'
    AND EXISTS (
      SELECT 1 FROM public."Seller"
      WHERE "Seller".id = (storage.foldername(name))[1]
        AND "Seller"."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "seller_documents_insert_own" ON storage.objects;
CREATE POLICY "seller_documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'seller-documents'
    AND EXISTS (
      SELECT 1 FROM public."Seller"
      WHERE "Seller".id = (storage.foldername(name))[1]
        AND "Seller"."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "seller_documents_update_own" ON storage.objects;
CREATE POLICY "seller_documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'seller-documents'
    AND EXISTS (
      SELECT 1 FROM public."Seller"
      WHERE "Seller".id = (storage.foldername(name))[1]
        AND "Seller"."userId" = auth.uid()::text
    )
  ) WITH CHECK (
    bucket_id = 'seller-documents'
    AND EXISTS (
      SELECT 1 FROM public."Seller"
      WHERE "Seller".id = (storage.foldername(name))[1]
        AND "Seller"."userId" = auth.uid()::text
    )
  );
