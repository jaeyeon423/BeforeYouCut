# Vercel Production 배포 체크리스트

이 문서는 미용사 Production 배포 전에 반드시 확인할 환경변수, 외부 콘솔 설정, 검증 명령을 정리한다.

## 1. Vercel 환경변수

Vercel Project Settings > Environment Variables에서 `Production` 범위로 설정한다. 비밀 값은 Git에 커밋하지 않는다.

### Supabase / DB

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` 또는 `POSTGRES_PRISMA_URL`
- 필요 시 `POSTGRES_URL_NON_POOLING`, `DIRECT_URL`

### Toss Payments

- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: Production 출시 시 `live_ck_...`
- `TOSS_SECRET_KEY`: Production 출시 시 `live_sk_...`
- `TOSS_WEBHOOK_SECRET`: `openssl rand -hex 32` 등으로 생성한 공유 secret
- `PG_MERCHANT_ID`: 토스페이먼츠 상점 ID

토스 개발자센터 웹훅 URL:

```text
https://before-you-cut.vercel.app/api/webhooks/toss?token=$TOSS_WEBHOOK_SECRET
```

등록 이벤트:

- `PAYMENT_STATUS_CHANGED`
- `CANCEL_STATUS_CHANGED`

## 2. 인증 / SMS / 암호화

- `ADMIN_EMAILS`: 콤마로 구분한 관리자 이메일
- `ENCRYPTION_KEY`: 64자 hex, 생성 예시 `openssl rand -hex 32`
- `ENCRYPTION_IV`: 32자 hex, 생성 예시 `openssl rand -hex 16`
- `PHONE_VERIFICATION_SECRET`: 64자 이상 랜덤 secret 권장
- `NAVER_SENS_SERVICE_ID`
- `NAVER_SENS_ACCESS_KEY`
- `NAVER_SENS_SECRET_KEY`
- `NAVER_SENS_SMS_FROM`

## 3. Sentry

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

확인 사항:

- Sentry 프로젝트 생성
- Vercel Production env에 위 값 입력
- 배포 후 의도적으로 테스트 에러를 발생시키는 전용 route는 아직 없음. 출시 전 별도 테스트 route 또는 Sentry 대시보드 수동 확인 필요

## 4. Supabase Storage

`prisma/rls.sql`의 Storage SQL을 Supabase SQL Editor에 적용한다.

필수 버킷:

- `product-images`: 공개, 상품 이미지
- `seller-documents`: 비공개, 판매자 KYC/정산 서류

검증:

```bash
npm run verify:storage
```

## 5. Admin Bootstrap

1. 관리자 이메일로 실제 회원가입 또는 로그인 완료
2. Vercel/Supabase 환경변수에 `ADMIN_EMAILS` 설정
3. 로컬 또는 배포 환경에서 관리자 role 적용

```bash
npm run bootstrap:admin -- admin@example.com
```

주의: Supabase Auth에 사용자가 없으면 DB `User` row를 만들 수 없다. 먼저 해당 이메일로 가입해야 한다.

## 6. 배포 전 검증 명령

```bash
npm test
npm run lint
npm run build
npm run verify:production-env -- --production
npm run verify:storage
```

배포된 Production URL까지 확인하려면:

```bash
npm run verify:production-env -- --production --url https://before-you-cut.vercel.app
```

## 7. 출시 전 사람이 확정해야 할 항목

- `src/site.config.js`의 대표자명, 사업장 주소, 고객센터 전화, 사업자등록번호, 통신판매업 신고번호
- 개인정보보호책임자 이름과 수신 가능한 이메일
- 토스페이먼츠 live 계약 및 live API 키 전환
- NAVER SENS 발신번호 사전 등록
- 판매자 입점 정책: 사업자만 허용할지, 개인 판매자도 허용할지
- 수수료율, 정산 주기, 자동 구매확정 기준
- 약관/개인정보처리방침 법무 검토
