# BEFORE YOU CUT — 프로덕션 전환 작업 프롬프트

> 프로토타입 → 프로덕션 전환을 위한 단계별 실행 프롬프트.
> 각 프롬프트는 프로젝트 디렉토리(`C:\Users\jaeye\wc\before_you_cut`)에서 바로 실행 가능하도록 작성됨.
> **1단계를 먼저 완료한 뒤 2단계를 진행**할 것.

---

## 1단계 프롬프트: 치명적 버그 수정

```
# 1단계: BEFORE YOU CUT — 보안 및 치명적 버그 수정

## 프로젝트 컨텍스트
- Next.js 16 + React 19 / Supabase Auth / Prisma 7 + PostgreSQL / Vercel 배포
- 미용인을 위한 브랜드 마켓플레이스 앱
- 현재 프로토타입 상태이며, 프로덕션 전 보안/버그 수정이 필요

## 작업 목록 (순서대로 수행)

### 1-1. Next.js 미들웨어 연결
- `src/proxy.js`에 Supabase 세션 갱신 로직이 이미 있지만, 프로젝트 루트에 `middleware.js`가 없어서 실행되지 않음
- 프로젝트 루트(`C:\Users\jaeye\wc\before_you_cut`)에 `middleware.js` 생성
- `src/proxy.js`의 `proxy` 함수를 import하여 Next.js middleware로 export
- matcher 설정도 함께 export (정적 파일 제외)
- 주의: Next.js 16 버전의 middleware 규칙을 `node_modules/next/dist/docs/`에서 확인한 뒤 작성할 것

### 1-2. Server Action 인증 강화
파일: `src/app/actions.js`

현재 문제: 모든 server action이 클라이언트에서 받은 `userId` 파라미터를 그대로 신뢰함.
악의적 사용자가 다른 사용자의 userId로 함수를 호출할 수 있음.

수정 방법:
- `src/utils/supabase/server.js`의 `createClient`를 import
- 각 server action 상단에서 `supabase.auth.getUser()`로 현재 인증된 사용자를 검증
- 인증된 사용자가 있으면 해당 user.id를 사용, 없으면 비로그인 처리
- `userId` 파라미터를 제거하고 서버 사이드에서만 userId를 결정
- 비로그인 사용자의 경우: 좋아요/팔로우/주문은 거부하고 에러 반환 (게스트가 공유 user_default를 쓰는 현재 구조 제거)
- 수정 대상 함수: `getInitialData`, `toggleLike`, `toggleFollow`, `createOrder`, `createSeller`, `syncUser`

### 1-3. syncUser 버그 수정
파일: `src/app/actions.js` 라인 362 부근

​```js
// 현재 (버그): user가 아직 정의 안 됨
update: {
  name: name || user?.name,
},
​```

수정: `prisma.user.upsert`의 update에서 `user?.name` 참조를 제거하고,
name이 주어졌을 때만 업데이트하도록 변경.

### 1-4. 입력값 검증 추가
파일: `src/app/actions.js`

각 server action에 기본 입력값 검증 추가:
- `createSeller`: sellerId가 영문소문자+숫자만 허용 (정규식), name/category 필수, 길이 제한
- `createOrder`: items 배열이 비어있지 않은지, 각 item에 id/price가 있는지, total이 양수인지
- `toggleLike`, `toggleFollow`: productId/sellerId가 문자열이고 비어있지 않은지
- 검증 실패 시 명확한 에러 메시지와 함께 throw

### 1-5. 클라이언트 코드 수정
파일: `src/app/page.js`

Server action의 userId 파라미터가 제거되었으므로:
- `ctx.like`, `ctx.follow`, `ctx.addOrder`, `ctx.addSeller` 등에서 userId 전달 부분 제거
- `getInitialData` 호출 시에도 userId 전달 제거
- 비로그인 상태에서 좋아요/팔로우/주문 시도 시 로그인 유도 토스트 표시
- `loadData` 함수가 비로그인이면 sellers/products만 가져오고 likes/follows/orders는 빈 상태로 설정

### 1-6. TLS 설정 정리
파일: `src/utils/prisma.js`

- `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` 라인이 프로덕션에 절대 적용되지 않도록 확인
- 이미 `NODE_ENV !== 'production'` 조건이 있으므로 OK이나, 주석으로 이유 명시

## 검증
- `npm run build` 성공 확인
- 비로그인 상태에서 좋아요/주문 시도 → 적절한 에러 반환 확인
- 미들웨어가 요청마다 실행되는지 확인
```

---

## 2단계 프롬프트: 아키텍처 개선

```
# 2단계: BEFORE YOU CUT — App Router 기반 라우팅 분리 및 데이터 페칭 최적화

## 프로젝트 컨텍스트
- Next.js 16 + React 19 / Supabase Auth / Prisma 7 + PostgreSQL / Vercel 배포
- 1단계에서 보안 버그 수정 완료된 상태
- 현재 모든 화면이 `src/app/page.js` 하나에서 useState로 전환되는 SPA 구조
- 프로덕션을 위해 App Router 기반 라우팅으로 전환 필요
- 주의: Next.js 16 버전의 API가 학습 데이터와 다를 수 있으므로, 코드 작성 전 반드시 `node_modules/next/dist/docs/`에서 해당 기능 문서를 확인할 것

## 목표 라우트 구조

​```
src/app/
├── layout.js              # 루트 레이아웃 (기존 유지, 폰트/메타)
├── page.js                # 홈 (서버 컴포넌트로 전환)
├── products/
│   └── [id]/
│       └── page.js        # 상품 상세 페이지
├── sellers/
│   └── [id]/
│       └── page.js        # 셀러 프로필 페이지
├── category/
│   └── page.js            # 카테고리 브라우징
├── search/
│   └── page.js            # 검색
├── saved/
│   └── page.js            # 찜 목록
├── my/
│   └── page.js            # 마이페이지
├── cart/
│   └── page.js            # 장바구니
└── actions.js             # Server Actions (기존 유지)
​```

## 작업 목록 (순서대로 수행)

### 2-1. 공유 레이아웃 및 네비게이션 컴포넌트 분리

**앱 쉘 레이아웃 생성:**
- `src/app/layout.js`에 모바일 앱 쉘 구조를 넣되, TopBar와 BottomNav는 클라이언트 컴포넌트로 분리
- BottomNav: `next/link` 기반으로 전환 (현재 `onClick → setTab` 대신)
- TopBar: 현재 페이지에 따라 타이틀/스타일 변경 (usePathname 활용)
- 장바구니 상태: React Context로 관리 (현재 page.js의 useState를 Context로 이동)

**Context 생성:**
- `src/contexts/cart-context.js`: 장바구니 상태 (localStorage 동기화 포함)
- `src/contexts/auth-context.js`: Supabase 인증 상태 (user, loading)
- `src/contexts/app-context.js`: 좋아요/팔로우 상태 (인증된 사용자만)

**레이아웃 구조:**
​```
layout.js (서버)
  → Providers (클라이언트: Context 래퍼)
    → 앱 쉘 (클라이언트: TopBar + children + BottomNav)
      → 각 페이지
​```

### 2-2. 홈 페이지 서버 컴포넌트 전환
파일: `src/app/page.js`

- 서버 컴포넌트로 전환 ("use client" 제거)
- Prisma에서 직접 홈 화면에 필요한 데이터만 fetch:
  - 추천 상품 (ranking 5개)
  - 신상품 (badge="new", 최대 10개)
  - 인기 브랜드 (verified sellers)
  - 베스트 상품 (badge="best", 최대 10개)
- 각 섹션 데이터를 클라이언트 컴포넌트 (HomeHero, ProductRail 등)에 props로 전달
- 기존 `getInitialData`의 "모든 데이터 한번에 fetch" 패턴 제거

### 2-3. 상품 상세 페이지
파일: `src/app/products/[id]/page.js`

- 서버 컴포넌트: Prisma에서 해당 상품 + 셀러 정보 fetch
- `generateMetadata`로 상품별 SEO 메타 태그 (title, description, og:image)
- 좋아요/장바구니 버튼은 클라이언트 컴포넌트로 분리
- 해당 셀러의 다른 상품 추천 (최대 4개)
- 존재하지 않는 상품 ID → notFound() 호출

### 2-4. 셀러 프로필 페이지
파일: `src/app/sellers/[id]/page.js`

- 서버 컴포넌트: 해당 셀러 정보 + 셀러 상품 목록 fetch
- `generateMetadata`로 셀러별 SEO 메타 태그
- 팔로우 버튼은 클라이언트 컴포넌트
- 상품 목록은 탭(전체/스토리/공지) UI 유지
- 존재하지 않는 셀러 ID → notFound() 호출

### 2-5. 카테고리 페이지
파일: `src/app/category/page.js`

- 서버 컴포넌트로 카테고리 목록 렌더링
- 카테고리 선택 시 searchParams로 필터 (`/category?cat=가위`)
- 해당 카테고리 상품을 서버에서 fetch (페이지네이션: 20개씩)
- 무한스크롤 또는 "더보기" 버튼으로 추가 로드 (클라이언트 컴포넌트)

### 2-6. 장바구니 페이지
파일: `src/app/cart/page.js`

- 클라이언트 컴포넌트 (CartContext에서 상태 읽기)
- 기존 BagScreen 로직 이동
- 주문하기 → `createOrder` server action 호출
- 주문 완료 시 `/my`로 리다이렉트

### 2-7. 나머지 페이지
- `src/app/search/page.js`: 검색 (클라이언트 컴포넌트, 기존 SearchScreen 이동)
- `src/app/saved/page.js`: 찜 목록 (인증 필요, 비로그인 시 로그인 유도)
- `src/app/my/page.js`: 마이페이지 (인증 필요, 주문내역/프로필)

### 2-8. 데이터 페칭 최적화

**Server Action 분리:**
`src/app/actions.js`에서 페이지별 데이터 fetch 함수 추가:
- `getHomeData()`: 홈에 필요한 데이터만 (추천/신상/베스트/브랜드)
- `getProductDetail(id)`: 상품 하나 + 셀러 + 관련 상품
- `getSellerProfile(id)`: 셀러 + 상품 목록
- `getCategoryProducts(cat, page, limit)`: 카테고리별 상품 + 페이지네이션
- `getUserSaved(userId)`: 사용자 찜 목록
- `getUserOrders(userId)`: 사용자 주문 내역

**기존 `getInitialData` 처리:**
- deprecated 처리 후 점진적 제거
- 각 페이지가 자기 데이터만 fetch하도록 전환

### 2-9. 네비게이션 전환 처리

**링크 전환:**
- 모든 `ctx.open(product)` → `<Link href={'/products/' + product.id}>`
- 모든 `ctx.openSeller(sid)` → `<Link href={'/sellers/' + sid}>`
- 모든 `ctx.openBag()` → `<Link href="/cart">`
- BottomNav의 탭 전환 → `<Link href="/category">` 등

**기존 page.js 정리:**
- stack/tab useState 제거
- OverlayHeader 제거 (각 페이지 레이아웃이 처리)
- ctx 객체를 Context + 개별 props로 분산

### 2-10. 에러 처리
- `src/app/not-found.js`: 404 페이지
- `src/app/error.js`: 전역 에러 바운더리 (클라이언트 컴포넌트)
- `src/app/loading.js`: 전역 로딩 UI (스켈레톤)

## 검증
- `npm run build` 성공 확인
- 각 라우트 직접 접근 가능 확인: `/`, `/products/p1`, `/sellers/steelgrain`, `/category`, `/cart`
- 브라우저 뒤로가기/앞으로가기 정상 동작
- BottomNav 탭 전환 시 페이지 전체 리로드 없이 전환 (Next.js 클라이언트 네비게이션)
- 비로그인 상태에서 홈/카테고리/상품상세 접근 가능 (읽기 전용)
- 찜/마이페이지 접근 시 로그인 유도
- 각 상품 페이지에서 고유 title/description 메타 태그 확인
```
