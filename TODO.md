# TODO

## 보류 중인 작업

### Sentry DSN 설정

`sentry.client.config.js`, `sentry.server.config.js`, `next.config.mjs`에 Sentry 연동 코드는 이미 준비되어 있음.
DSN 발급 후 아래 환경변수만 등록하면 즉시 활성화됨.

**등록할 환경변수**

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 프로젝트 DSN (클라이언트/서버 공용) |
| `SENTRY_ORG` | Sentry 조직 slug (source map 업로드용) |
| `SENTRY_PROJECT` | Sentry 프로젝트 slug |
| `SENTRY_AUTH_TOKEN` | Sentry CLI 인증 토큰 |

**등록 위치**
- 로컬: `.env.local`
- 프로덕션: Vercel 대시보드 → Project → Settings → Environment Variables

**DSN 발급 절차**
1. [sentry.io](https://sentry.io) 로그인 (또는 신규 가입)
2. 상단 **+ Create Project** 클릭
3. 플랫폼 목록에서 **Next.js** 선택
4. 프로젝트 이름 입력 후 생성
5. **Settings → Client Keys (DSN)** 에서 DSN 복사
6. `.env.local`과 Vercel 환경변수에 `NEXT_PUBLIC_SENTRY_DSN` 값으로 붙여넣기

`SENTRY_AUTH_TOKEN`은 **Settings → Auth Tokens → Create New Token**에서 발급.
