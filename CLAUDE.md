# BEFORE YOU CUT — AI & Developer Reference Guide (CLAUDE.md)

이 문서는 프로젝트 개발을 위한 빠른 실행 명령어 및 코딩 규칙을 안내합니다. 상세한 프로젝트 아키텍처, 데이터 모델, Next.js 16 비동기 가이드는 [AI_REFERENCE.md](file:///Users/jaeyeon423/wc/BeforeYouCut/AI_REFERENCE.md)를 참조하십시오.

---

## 🚀 주요 명령어 (Commands)

### 1. 개발 및 빌드
- **패키지 설치**: `npm install`
- **로컬 개발 서버**: `npm run dev`
- **프로덕션 빌드**: `npm run build`
- **코드 린트**: `npm run lint`

### 2. 데이터베이스 & Prisma CLI
- **Prisma 스키마 동기화 (Push)**: `npx prisma db push`
- **Prisma Client 빌드 (Generate)**: `npx prisma generate`
- **테스트 데이터 적재 (Seed)**: `node prisma/seed.js`
- **데이터베이스 전체 비우기 (Clear)**: `node prisma/clear.js`
- **데이터베이스 연결 검증 (Diagnostic)**: `node prisma/test_conn.js`

---

## 📐 개발 및 코딩 가이드라인 (Guidelines)

### 1. Next.js 16 App Router 규칙
- **비동기 Params**: 페이지 및 메타데이터의 `params`와 `searchParams`는 비동기 객체이므로 반드시 사용 전에 **`await params`** 처리를 해주어야 합니다.
- **쿠키 및 헤더**: `cookies()`, `headers()`도 비동기이므로 **`await cookies()`** 형태로 작성합니다.

### 2. Server Actions & 인증 보안
- 클라이언트에서 보내는 `userId` 파라미터를 그대로 신뢰하지 마십시오.
- 모든 쓰기 및 민감 데이터 조회 Server Action은 내부에서 **`getAuthUserId()`**를 호출하여 현재 세션의 실제 사용자 정보를 획득하고 검증해야 합니다.

### 3. 스타일링 및 CSS
- 미니멀 매거진 테마(Mono) 레이아웃을 따르며, UI 정의는 주로 Vanilla CSS(`src/app/globals.css` 등)로 구성되어 있습니다. 
- 신규 컴포넌트 추가 시 기존의 미니멀 모노톤 테마와 모바일 safe-area, dynamic viewport(`100dvh`) 스타일 가이드를 준수하십시오.

---

### 🔗 관련 문서 링크
- 전체 상세 아키텍처 및 DB 스키마: [AI_REFERENCE.md](file:///Users/jaeyeon423/wc/BeforeYouCut/AI_REFERENCE.md)
- Next.js 에이전트 전용 규칙: [AGENTS.md](file:///Users/jaeyeon423/wc/BeforeYouCut/AGENTS.md)
