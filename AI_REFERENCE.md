# 미용사 — AI & Developer Reference Guide

이 문서는 **미용사(MIYONGSA)** 프로젝트의 설계, 아키텍처, 데이터 모델 및 Next.js 16/React 19 개발 규칙을 설명하는 AI 에이전트 및 개발자 참조 가이드입니다.

> 빠른 작업 시작은 [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)를 먼저 읽으십시오. 이 문서는 더 깊은 아키텍처 설명이 필요할 때 보조 참조로 사용합니다.

---

## 1. 프로젝트 개요 (Overview)

**미용사**는 헤어 디자이너, 바버 등 미용 전문가들을 위한 전문 도구(단조 수제 가위, 디자이너 앞치마, 바버 클리퍼 등) 및 브랜드를 거래하는 **모바일 퍼스트 반응형 웹 마켓플레이스**입니다.

### 핵심 기능 및 유저 시나리오
1. **바이어 (Buyer)**
   - 미니멀 매거진 감성의 Mono 테마 UI에서 상품 브라우징.
   - 상품 상세 조회 및 카테고리별 필터링.
   - 상품 **찜(Like)** 및 셀러 **팔로우(Follow)**.
   - 장바구니에 상품을 담고 주문/결제 진행.
   - `/orders/[id]`에서 주문 상세, 배송 정보, 반품·환불 신청 상태 확인.
2. **셀러 (Seller)**
   - `/seller` 판매자 센터에서 입점 신청(Onboarding)을 통해 브랜드 프로필 생성 및 첫 상품 등록.
   - 입점 완료 시 유저의 `role`이 `SELLER`로 업데이트되며 공개 브랜드 페이지와 판매자 전용 관리 화면 제공.
   - 자신의 상품 상세페이지 내용, 고시 정보, KYC/정산 계좌, 주문, 정산 현황을 판매자 화면에서 관리하고 주문 상세에서 송장을 등록.
3. **인증 (Auth)**
   - Supabase Auth(이메일/비밀번호) 연동.
   - 비로그인(게스트) 사용자는 읽기 전용으로 탐색 가능하며, 쓰기 동작(찜, 팔로우, 주문 등) 시 로그인 유도.

---

## 2. 기술 스택 & 런타임 환경 (Tech Stack & Environment)

### 기술 스택 요약
* **Framework**: Next.js 16.2 (App Router)
* **Frontend**: React 19.2, Vanilla CSS (미니멀 매거진 테마, `100dvh` 적용)
* **Database & Auth**: Supabase PostgreSQL & Supabase Auth SDK (`@supabase/ssr`)
* **ORM**: Prisma 7.8 (Node-Postgres 어댑터 `@prisma/adapter-pg` 적용)
* **CSS Tooling**: TailwindCSS v4가 설정되어 있으나 UI 구현은 Vanilla CSS 위주로 구성됨
* **Deployment**: Vercel

### 필수 환경 변수 (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Supabase PostgreSQL 커넥션 풀링용 (서버 런타임 쿼리용, 포트 6543)
POSTGRES_PRISMA_URL="postgres://postgres.ref:...@aws-1-...pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_URL="postgres://postgres.ref:...@aws-1-...pooler.supabase.com:6543/postgres?sslmode=require"

# direct 연결용 (스키마 마이그레이션 및 CLI 명령어용, 포트 5432)
POSTGRES_URL_NON_POOLING="postgres://postgres.ref:...@aws-1-...pooler.supabase.com:5432/postgres?sslmode=require"
```

---

## 3. 데이터베이스 스키마 & 관계 (Database Schema & Relations)

데이터베이스 설계는 `prisma/schema.prisma`에 정의되어 있으며, 주요 모델은 다음과 같습니다.

### ERD 및 테이블 관계 요약
```mermaid
erDiagram
    User ||--o| Seller : "has one (onboarding)"
    User ||--o{ Order : "places"
    User ||--o{ Like : "likes products"
    User ||--o{ Follow : "follows sellers"
    
    Seller ||--o{ Product : "owns"
    Seller ||--o{ Follow : "has followers"
    
    Product ||--o{ Like : "liked by"
    Product ||--o{ OrderItem : "ordered in"
    
    Order ||--|{ OrderItem : "contains"
```

### 모델별 상세 정보
1. **`User`**
   - Supabase `auth.users.id` (UUID String)와 `id`가 1:1로 매핑됩니다.
   - `role` 필드: `BUYER` (기본값) | `SELLER` | `ADMIN`
2. **`Seller`**
   - 셀러 고유 ID (`id`)는 영문 소문자와 숫자로 구성된 커스텀 문자열입니다 (예: `steelgrain`, `bladebros`).
   - `userId`를 통해 `User`와 1:1 관계를 가집니다.
   - `tone` 필드 (`tone-a`, `tone-b` 등)를 통해 브랜드 테마 스타일을 결정합니다.
   - `sellerType`, `businessRegNo`, `businessDocumentUrl`, `mailOrderDocumentUrl`, `kycStatus`로 판매자 심사 상태를 관리합니다.
3. **`Product`**
   - 각 상품은 UUID `id`를 가지며, 특정 `Seller`에 소속됩니다 (`sellerId`).
   - `badge` (`new` | `best` | `ltd` | `null`)와 할인율(`disc`), 정상가(`orig`), 판매가(`price`)를 관리합니다.
   - `spec` 필드는 JSON 타입으로, 상품 사양(key-value)의 직렬화 배열을 보관합니다.
4. **`Order` & `OrderItem`**
   - 주문 건당 총 결제 금액(`total`), 수령인(`name`), 배송지(`address`), 상태(`status`)를 관리합니다.
   - `OrderItem`은 단일 상품의 서버 검증 단가(`price`)와 수량(`quantity`)을 매핑합니다.
   - 주문은 `prepareCheckout`으로 생성한 `Payment` 세션이 토스페이먼츠 승인 API에서 확인된 뒤 `confirmCheckout`에서만 생성됩니다.
5. **`Like` & `Follow` (다대다 관계 매핑 테이블)**
   - `Like`: `userId`와 `productId` 복합 기본키.
   - `Follow`: `userId`와 `sellerId` 복합 기본키.

---

## 4. 프로젝트 아키텍처 및 구현 패턴

### 디렉토리 구조 및 핵심 역할
* `prisma/` : 스키마 파일, 시드 스크립트(`seed.js`), DB 완전 초기화 스크립트(`clear.js`), TLS 진단(`test_conn.js`) 위치.
* `src/app/` : Next.js App Router 페이지 및 Server Actions.
  - `actions.js`: 데이터베이스 조작을 수행하는 모든 **Server Actions** 정의.
  - `layout.js` & `page.js`: 루트 레이아웃 및 메인 홈 화면.
  - `proxy.js`: Supabase Auth 세션 갱신 헬퍼.
  - `[route]/page.js` (cart, category, my, orders, products, search, seller, sellers 등): App Router 기반 각 화면 진입점.
* `src/components/` : UI 컴포넌트 라이브러리.
  - `ui.js`: 헤더, 바텀 네비게이션, 상품 및 브랜드 카드 등 공용 컴포넌트.
  - `screens/`: 각 페이지에 마운트되는 대형 스크린 컴포넌트들 (`home.js`, `other.js`, `seller-dashboard.js`).
* `src/contexts/` : React Context 관리 (`auth-context.js`, `cart-context.js`, `app-context.js`).
* `src/utils/` : 공통 유틸리티.
  - `prisma.js`: Node-Postgres 커넥션 풀을 활용하는 Prisma Client 싱글톤.
  - `supabase/`: SSR용 Supabase 클라이언트 팩토리 (`client.js`, `server.js`).

### Prisma Client 싱글톤 및 TLS 우회 패턴 (`src/utils/prisma.js`)
- Supabase Free Plan의 동시 커넥션 제한을 방지하기 위해 최대 풀 크기를 `max: 4`로 제한합니다.
- 로컬 개발 환경에서 TLS/SSL 인증서 오류가 발생하는 것을 방지하기 위해, 개발 환경(`NODE_ENV !== 'production'`)에 한해 `NODE_TLS_REJECT_UNAUTHORIZED = '0'` 처리를 수행하고, 풀 생성 시 `ssl: { rejectUnauthorized: false }` 옵션을 부여합니다.

---

## 5. Next.js 16 & React 19 개발 규칙 (Critical Conventions)

### ⚠️ [중요] Next.js 16의 비동기 params 처리
Next.js 16의 App Router에서는 페이지 컴포넌트나 메타데이터 제너레이터에 주어지는 `params`와 `searchParams`가 **동기가 아닌 Promise 객체**로 전달됩니다. 따라서 반드시 사용 전에 `await` 해야 합니다.

* **올바른 패턴**:
  ```javascript
  export async function generateMetadata({ params }) {
    const { id } = await params; // 반드시 await 처리
    const data = await getProductDetail(id);
    // ...
  }

  export default async function ProductPage({ params }) {
    const { id } = await params; // 반드시 await 처리
    // ...
  }
  ```

### Server Actions 인증 보안 패턴
클라이언트에서 전달하는 `userId`를 직접 신뢰하지 마십시오. 모든 쓰기 작업(좋아요, 팔로우, 주문 등) 및 사용자 민감 데이터 조회는 서버에서 세션을 확인하고 처리해야 합니다.

* **보안 패턴 예시**:
  ```javascript
  import { createClient } from "../utils/supabase/server";

  export async function toggleLike(productId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }
    const activeUserId = user.id;
    // activeUserId를 기반으로 DB 로직 수행...
  }
  ```

---

## 6. 주의 사항 및 미결 과제 (Known Issues)

### 1. 관리자 운영 세부 기능
관리자 콘솔(`/admin`)은 구현되어 있으며, `ADMIN` 권한 또는 서버 전용 `ADMIN_EMAILS` 환경변수로 접근합니다. 현재 판매자 승인/숨김, KYC 승인/반려, 상품 검수 승인/반려/숨김, 주문 상태 변경, 환불 승인/거절/완료 기록, 정산 확정/지급완료/제외 기록, 문의 답변/종료 처리를 지원합니다.
- **조치 요망**: 비공개 서류 저장소와 열람 권한 검증, 토스페이먼츠 테스트/라이브 키 및 웹훅 운영 검증, 실제 PG 환불 API 실행, 실제 은행 이체 또는 정산 API 지급 실행, 택배사 배송 추적 API 연동은 후속 구현이 필요합니다.

### 2. 게스트 Fallback 제거 및 안전한 예외 처리
이전 프로토타입에서 사용되던 공용 게스트 계정(`user_default`) 패턴이 제거되었습니다. 비로그인 상태의 사용자가 찜, 팔로우, 주문 등의 액션을 취할 경우 서버 액션 단에서 에러가 반환되므로, 클라이언트(`src/app/page.js`, 각 스크린 컴포넌트 등)에서는 적절한 로그인 유도 토스트 알림을 제공해야 합니다.
