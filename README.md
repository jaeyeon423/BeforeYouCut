# 미용사 — 미용인 전문 도구 마켓플레이스

**미용사(MIYONGSA)**는 헤어 디자이너, 바버 등 미용 전문가들을 위한 단조 수제 가위, 디자이너 앞치마, 바버 클리퍼 등 전문 도구 및 브랜드를 거래하는 **모바일 퍼스트 반응형 웹 마켓플레이스**입니다.

이 프로젝트는 로컬 시뮬레이터 프로토타입에서 출발하여, **Supabase PostgreSQL 데이터베이스** 및 **Prisma ORM**을 백엔드로 연동하고 Vercel에 배포할 수 있도록 설계된 실서비스 가능한 프로덕션급 웹 애플리케이션입니다.

> AI 에이전트와 신규 개발자는 전체 파일을 훑기 전에 [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)를 먼저 읽으십시오. 현재 route/file map, 최근 의사결정, 검증 명령어를 짧게 정리해 두었습니다.

---

## 🛠️ 기술 스택 (Technical Stack)

| 구분 | 기술 기술 | 용도 및 특이사항 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | 풀스택 웹 서버 프레임워크 (Next.js 16 Proxy Convention 적용) |
| **Frontend** | **React 19**, **Vanilla CSS** | 미니멀 매거진 감성의 Mono 테마 UI 구현, 모바일 safe-area 및 dynamic viewport (`100dvh`) 최적화 |
| **ORM** | **Prisma 7.8** | 스키마 관계 정의 및 데이터 쿼리용 ORM (Prisma 7 CLI 전용 Config 분리) |
| **Database** | **Supabase (PostgreSQL)** | 실시간 관계형 데이터베이스 및 트랜잭션/세션 커넥션 풀링 관리 |
| **Auth** | **Supabase Auth** | 이메일/비밀번호 인증 연동. 비로그인 사용자는 읽기 중심으로 탐색하고 쓰기 동작 시 로그인 유도 |
| **Driver** | **pg (node-postgres)** | Node.js 환경에서 Prisma의 PostgreSQL 통신을 위한 드라이버 어댑터 (`@prisma/adapter-pg`) 적용 |
| **Deployment** | **Vercel** / **GitHub** | GitHub 커밋 자동 빌드 및 실시간 Vercel 서버리스 환경 배포 |

---

## 📐 서비스 아키텍처 및 폴더 구조

### 시스템 아키텍처
```mermaid
graph TD
    User([사용자 브라우저]) <--> |HTTPS| CDN[Vercel Edge Network / CDN]
    CDN <--> NextApp[Next.js App Server / App Router]
    
    subgraph Third_Party [인증 및 외부 API]
        Auth[Supabase Auth SDK]
    end

    subgraph Database_Layer [데이터베이스 레이어]
        Prisma[Prisma Client + pg Adapter] <--> DB[(Supabase PostgreSQL)]
    end

    NextApp <--> Auth
    NextApp <--> Prisma
```

### 디렉토리 구조
*   `prisma/`
    *   `schema.prisma`: 데이터베이스 테이블 설계 스키마 (User, Seller, Product, Order, OrderItem, Like, Follow)
    *   `seed.js`: 초기 연동 테스트를 위해 샘플 셀러와 상품들을 데이터베이스에 적재하는 스크립트
    *   `clear.js`: 데이터베이스의 모든 운영/테스트 데이터를 비우는 초기화 스크립트 (Clean Slate)
    *   `test_conn.js`: 로컬/서버 데이터베이스 TLS/SSL 연결 진단 스크립트
*   `prisma.config.js`: Prisma 7 스키마 및 데이터소스 드라이버 로드 설정 파일
*   `src/app/`
    *   `actions.js`: 데이터베이스 조작을 처리하는 **Next.js Server Actions** (조회, 찜/팔로우 토글, 주문 처리, 입점 신청)
    *   `page.js`: 홈/검색/장바구니/마이페이지 탭 전환 및 클라이언트 상태 관리 로직
    *   `layout.js`: Pretendard & Newsreader 웹 폰트 로드 및 루트 레이아웃 바인딩
    *   `proxy.js`: Supabase 인증 쿠키 세션을 자동으로 리프레시해주는 Next.js 16 규격 미들웨어 프록시
    *   `seller/page.js`: 입점 신청, 상품 상세 구성, 주문·정산 요약을 제공하는 판매자 센터
*   `src/components/`
    *   `icons.js`: SVG 기반의 미니멀 아이콘 팩 컴포넌트
    *   `ui.js`: 탑바, 바텀 네비게이션, 상품 카드, 브랜드 전용 카드 등 공용 레이아웃 컴포넌트
    *   `screens/`
        *   `home.js`: 매거진 레이아웃 및 브랜드 링 레일이 배치된 메인 화면
        *   `other.js`: 검색, 상품 상세, 셀러 공개 페이지, 장바구니/결제, 마이페이지 및 Auth 기능이 포함된 스크린 컴포넌트 모음
        *   `seller-dashboard.js`: 판매자 입점 시작, 상품 상세 구성, 주문·정산 관리 화면
*   `src/utils/`
    *   `prisma.js`: Node-Postgres 어댑터 풀링 및 TLS 자가서명 인증서 검증 우회 설정을 담은 **Prisma Client 싱글톤**
    *   `supabase/`: 쿠키 상태 및 브라우저 세션을 연동하기 위한 Supabase SSR 클라이언트 팩토리 (`client.js`, `server.js`)

---

## 🔑 환경 변수 설정 (`.env.local`)

로컬 개발 및 Vercel 배포를 위해 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 변수들을 구성해야 합니다:

```env
# Supabase API 설정 (클라이언트 브라우저용)
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Supabase Auth JWT 시크릿 및 서비스 권한 키 (서버용)
SUPABASE_JWT_SECRET="your-jwt-secret"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Supabase PostgreSQL 연결 설정
# 1. 트랜잭션 연결 URL (포트 6543, 커넥션 풀러 사용) - 서버 런타임 쿼리용
POSTGRES_PRISMA_URL="postgres://postgres.ref:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_URL="postgres://postgres.ref:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"

# 2. 직접 연결 URL (포트 5432, 풀러 미사용) - 마이그레이션 및 CLI 명령어용
POSTGRES_URL_NON_POOLING="postgres://postgres.ref:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
```

---

## 🚀 시작하기 (How to Run)

### 1. 패키지 설치
```bash
npm install
```

### 2. 데이터베이스 스키마 동기화 (Supabase DB에 테이블 생성)
Prisma CLI는 환경변수 중 direct 연결인 `POSTGRES_URL_NON_POOLING` 포트(5432)를 최우선으로 사용하여 스키마를 싱크합니다.
```bash
npx prisma db push
```

### 3. Prisma Client 자바스크립트 코드 생성
개발 서버 기동 및 런타임 사용을 위해 내부 클라이언트 모듈을 빌드합니다 (Vercel 배포 시 빌드 스크립트에 자동화되어 있습니다).
```bash
npx prisma generate
```

### 4. 로컬 개발 서버 시작
```bash
npm run dev
```

---

## 🛠️ 유틸리티 명령어 (Utility Scripts)

### 초기 테스트 데이터 세딩 (Populate database)
프로토타입 디자인에 포함된 기본 6개 브랜드와 14개 미용 상품 데이터를 Supabase DB에 적재합니다.
```bash
node prisma/seed.js
```

### 데이터베이스 전체 데이터 초기화 (Clean Slate)
실서버 오픈 혹은 신규 상품 등록 테스트를 위해 데이터베이스 내의 상품, 셀러, 주문, 정산, 배송, 환불, CS, 좋아요, 팔로우, 사용자 데이터를 깨끗하게 삭제합니다.
```bash
node prisma/clear.js
```

### 데이터베이스 연결 검증 테스트
로컬 개발 환경 및 서버에서 Supabase DB로의 TLS/SSL 안전 악수 및 쿼리 도달 여부를 진단합니다.
```bash
node prisma/test_conn.js
```
