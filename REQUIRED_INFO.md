# 운영 전 필수 입력 항목

서비스 출시 전 아래 항목을 모두 채워야 합니다.
각 항목이 어느 파일에 있는지, 어디서 값을 받는지 명시합니다.

---

## 1. 공개 표시 정보 (`src/site.config.js`)

| 항목명 | 현재 임시값 | 용도 | 어디서 받는지 |
|--------|-------------|------|--------------|
| `business.name` | 미용사 | 푸터·약관 표시 | 사업자등록증 상호와 다르면 실제 상호로 교체 |
| `business.ceo` | 미입력 | 푸터·약관 표시 | 사업자등록증 대표자 성명 |
| `business.address` | 미입력 | 푸터·통신판매업 신고 | 사업장 실소재지 주소 |
| `business.phone` | 미입력 | 고객센터 전화번호 표시 | 실제 운영 전화번호 |
| `business.email` | help@miyongsa.kr | 고객센터 이메일 | 실제 수신 가능한 이메일로 교체 |
| `business.businessRegNo` | 미입력 | 푸터 공시 (법적 의무) | 세무서 발급 사업자등록증 |
| `business.mailOrderRegNo` | 미입력 | 푸터 공시 (법적 의무) | 관할 지자체(시·군·구청) 통신판매업 신고 후 수령 |
| `business.hostingLocation` | Amazon Web Services, 서울 (ap-northeast-2) | 푸터 공시 | Supabase 인프라 기준. 변경 시 업데이트 |
| `business.privacyOfficer.name` | 미입력 | 개인정보처리방침 표시 | 내부 지정 개인정보보호책임자 |
| `business.privacyOfficer.email` | privacy@miyongsa.kr | 개인정보처리방침 표시 | 실제 수신 가능한 이메일로 교체 |
| `service.url` | https://miyongsa.kr | 약관·메타태그 | 실서비스 도메인 확정 후 |
| `commission.rate` | 0.05 (5%) | 정산 수수료 계산 | 입점계약서 기준 확정 후 |
| `commission.settlementCycleDays` | 7 | 정산 주기 | 운영 정책 확정 후 |
| `commission.purchaseConfirmDays` | 7 | 자동 구매확정 기간 | 운영 정책 확정 후 |
| `seller.allowedType` | BOTH | 입점 판매자 유형 | 운영 정책 확정 후 (BUSINESS/INDIVIDUAL/BOTH) |
| `seller.requireBusinessReg` | false | 사업자등록 필수 여부 | 운영 정책 확정 후 |
| `terms.*.effectiveAt` | 2026-01-01 | 약관 시행일 | 법무 검토 완료 후 실제 시행일로 변경 |

---

## 2. 환경변수 (`.env.local` / Vercel 환경변수)

> ⚠️ `TOSS_SECRET_KEY`, `ENCRYPTION_KEY`, `ENCRYPTION_IV`, `SENTRY_AUTH_TOKEN`은 절대 클라이언트 코드에 노출 금지.
> 토스 클라이언트 키는 결제창 초기화에 필요한 공개 키이므로 `NEXT_PUBLIC_TOSS_CLIENT_KEY`로만 사용합니다.

| 환경변수명 | 현재 임시값 | 용도 | 어디서 받는지 |
|-----------|-------------|------|--------------|
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | test_ck_your-toss-client-key | 토스페이먼츠 결제창 초기화 공개 키 | 토스페이먼츠 개발자센터 API 키 |
| `TOSS_SECRET_KEY` | test_sk_your-toss-secret-key | 토스페이먼츠 결제 승인·취소 API 인증 | 토스페이먼츠 개발자센터 API 키. 서버 전용 |
| `TOSS_WEBHOOK_SECRET` | replace-with-long-random-token | 토스페이먼츠 웹훅 공유 secret | `openssl rand -hex 32` 등으로 생성 후 토스 웹훅 URL token에 사용 |
| `PG_MERCHANT_ID` | your-merchant-id | PG사 가맹점 ID | PG사(토스페이먼츠 등) 계약 후 |
| `ENCRYPTION_KEY` | 32바이트 랜덤 hex | 계좌번호 등 민감 데이터 AES-256 암호화 | `openssl rand -hex 32` 로 생성 |
| `ENCRYPTION_IV` | 16바이트 랜덤 hex | AES 암호화 IV | `openssl rand -hex 16` 로 생성 |
| `SENTRY_AUTH_TOKEN` | your-auth-token | Sentry source map 업로드 | sentry.io → Settings → Auth Tokens |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry 에러 수집 엔드포인트 | sentry.io → Project → Settings → Client Keys |
| `SENTRY_ORG` | your-org-slug | Sentry release/source map 업로드 | sentry.io 조직 slug |
| `SENTRY_PROJECT` | your-project-slug | Sentry release/source map 업로드 | sentry.io 프로젝트 slug |
| `PHONE_VERIFICATION_SECRET` | 32바이트 이상 랜덤 secret | 휴대폰 인증번호 HMAC | `openssl rand -hex 32` 로 생성 |
| `NAVER_SENS_SERVICE_ID` | — | SMS 인증번호 발송 | NAVER Cloud SENS |
| `NAVER_SENS_ACCESS_KEY` | — | SMS 인증번호 발송 인증 | NAVER Cloud API 인증키 |
| `NAVER_SENS_SECRET_KEY` | — | SMS 인증번호 발송 서명 | NAVER Cloud API secret |
| `NAVER_SENS_SMS_FROM` | — | SMS 발신번호 | NAVER Cloud 사전 등록 발신번호 |

---

## 3. Supabase Storage 정책

| 버킷 | 공개 여부 | 용도 | 출시 전 확인 |
|------|-----------|------|--------------|
| `product-images` | 공개 | 상품 이미지 | `prisma/rls.sql`의 버킷/정책 SQL 적용, 공개 읽기 확인 |
| `seller-documents` | 비공개 | 사업자등록증, 통신판매업 신고증 등 KYC 서류 | `prisma/rls.sql`의 버킷/정책 SQL 적용, 판매자 본인 업로드와 관리자 서명 URL 열람 확인 |

---

## 4. 법적 절차 TODO

| 항목 | 상태 | 담당 | 메모 |
|------|------|------|------|
| 사업자등록 | ✅ 완료 | 운영사 | 개인사업자. 업태: 정보통신업/도매 및 소매업/전문, 과학 및 기술서비스업. 종목: 응용 소프트웨어 개발 및 공급업/전자상거래 소매업/광고 대행업 |
| 통신판매업 신고 | ⬜ 미완료 | 운영사 | 사업자등록 후 관할 지자체 신고. 연 매출 4800만원 미만 면제 가능(확인 필요) |
| 개인정보처리방침 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms/privacy` 초안 → 법무 검토 후 시행일 확정 |
| 이용약관 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms` 초안 → 법무 검토 후 시행일 확정 |
| 판매자 약관 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms/seller` 초안 → 법무 검토 후 시행일 확정 |
| PG사 계약 | ⬜ 미완료 | 운영사 | 토스페이먼츠·KCP·이니시스 등 선택 후 계약 |
| 전자금융거래법 준수 검토 | ⬜ 미완료 | 법무팀 | 정산 대행 구조 적법성 확인 |
| 개인정보 처리 위탁 계약 | ⬜ 미완료 | 법무팀 | Supabase(AWS), PG사 등 위탁업체 목록 정리 |

---

## 5. 판매자 유형 미확정 분기

`src/site.config.js > seller.allowedType` 값에 따라 아래 처리가 달라집니다.

| 항목 | BUSINESS (사업자) | INDIVIDUAL (개인) | 비고 |
|------|-------------------|-------------------|------|
| 입점 신청/운영 정보 제출 시 필요 정보 | 사업자등록번호, 상호, 대표자, 사업자등록증 URL, 정산 계좌 | 성명, 정산 계좌, 필요 시 신분 증빙 URL | 현재 코드: 판매자 센터에서 KYC/정산 정보 제출, 관리자 콘솔에서 승인/반려 |
| 세금계산서 | 발급 의무 있음 | 원천징수 가능 | PG 정산 구조에 따라 상이 |
| 개인정보 처리 | 법인정보 | 주민등록번호 일부 수집 가능 | 별도 법무 검토 필요 |
| 소득세 신고 | 법인세 | 종합소득세 | PG사 정산대행 여부에 따라 달라짐 |
