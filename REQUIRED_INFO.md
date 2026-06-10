# 운영 전 필수 입력 항목

서비스 출시 전 아래 항목을 모두 채워야 합니다.
각 항목이 어느 파일에 있는지, 어디서 값을 받는지 명시합니다.

---

## 1. 공개 표시 정보 (`src/site.config.ts`)

| 항목명 | 현재 임시값 | 용도 | 어디서 받는지 |
|--------|-------------|------|--------------|
| `business.name` | 주식회사 OOO | 푸터·약관 표시 | 법인등기부등본 또는 사업자등록증 상호 |
| `business.ceo` | 홍길동 | 푸터·약관 표시 | 사업자등록증 대표자 성명 |
| `business.address` | 서울특별시 OO구 OO로 00 | 푸터·통신판매업 신고 | 사업장 실소재지 주소 |
| `business.phone` | 02-0000-0000 | 고객센터 전화번호 표시 | 실제 운영 전화번호 |
| `business.email` | help@beforeyoucut.com | 고객센터 이메일 | 실제 운영 이메일 |
| `business.businessRegNo` | 000-00-00000 | 푸터 공시 (법적 의무) | 세무서 발급 사업자등록증 |
| `business.mailOrderRegNo` | 제0000-서울OO-0000호 | 푸터 공시 (법적 의무) | 관할 지자체(시·군·구청) 통신판매업 신고 후 수령 |
| `business.hostingLocation` | Amazon Web Services, 서울 (ap-northeast-2) | 푸터 공시 | Supabase 인프라 기준. 변경 시 업데이트 |
| `business.privacyOfficer.name` | 홍길동 | 개인정보처리방침 표시 | 내부 지정 개인정보보호책임자 |
| `business.privacyOfficer.email` | privacy@beforeyoucut.com | 개인정보처리방침 표시 | 내부 지정 이메일 |
| `service.url` | https://beforeyoucut.com | 약관·메타태그 | 실서비스 도메인 확정 후 |
| `commission.rate` | 0.05 (5%) | 정산 수수료 계산 | 입점계약서 기준 확정 후 |
| `commission.settlementCycleDays` | 7 | 정산 주기 | 운영 정책 확정 후 |
| `commission.purchaseConfirmDays` | 7 | 자동 구매확정 기간 | 운영 정책 확정 후 |
| `seller.allowedType` | BOTH | 입점 판매자 유형 | 운영 정책 확정 후 (BUSINESS/INDIVIDUAL/BOTH) |
| `seller.requireBusinessReg` | false | 사업자등록 필수 여부 | 운영 정책 확정 후 |
| `terms.*.effectiveAt` | 2026-01-01 | 약관 시행일 | 법무 검토 완료 후 실제 시행일로 변경 |

---

## 2. 서버 전용 환경변수 (`.env.local` / Vercel 환경변수)

> ⚠️ 아래 값은 절대 `site.config.ts`나 클라이언트 코드에 노출 금지.
> `NEXT_PUBLIC_` 접두어 사용 금지. 서버 전용.

| 환경변수명 | 현재 임시값 | 용도 | 어디서 받는지 |
|-----------|-------------|------|--------------|
| `PG_MERCHANT_ID` | your-merchant-id | PG사 가맹점 ID | PG사(토스페이먼츠·KCP 등) 계약 후 |
| `PG_SECRET_KEY` | your-pg-secret-key | PG 결제 승인 API 인증 | PG사 계약 후 대시보드에서 발급 |
| `PG_CLIENT_KEY` | your-pg-client-key | PG 결제창 초기화 (서버에서 클라이언트에 전달) | PG사 대시보드 |
| `ENCRYPTION_KEY` | 32바이트 랜덤 hex | 계좌번호 등 민감 데이터 AES-256 암호화 | `openssl rand -hex 32` 로 생성 |
| `ENCRYPTION_IV` | 16바이트 랜덤 hex | AES 암호화 IV | `openssl rand -hex 16` 로 생성 |
| `SENTRY_AUTH_TOKEN` | your-auth-token | Sentry source map 업로드 | sentry.io → Settings → Auth Tokens |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry 에러 수집 엔드포인트 | sentry.io → Project → Settings → Client Keys |

---

## 3. 법적 절차 TODO

| 항목 | 상태 | 담당 | 메모 |
|------|------|------|------|
| 사업자등록 | ⬜ 미완료 | 운영사 | 세무서 또는 국세청 홈택스 |
| 통신판매업 신고 | ⬜ 미완료 | 운영사 | 사업자등록 후 관할 지자체 신고. 연 매출 4800만원 미만 면제 가능(확인 필요) |
| 개인정보처리방침 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms/privacy` 초안 → 법무 검토 후 시행일 확정 |
| 이용약관 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms` 초안 → 법무 검토 후 시행일 확정 |
| 판매자 약관 법무 검토 | ⬜ 미완료 | 법무팀 | `/terms/seller` 초안 → 법무 검토 후 시행일 확정 |
| PG사 계약 | ⬜ 미완료 | 운영사 | 토스페이먼츠·KCP·이니시스 등 선택 후 계약 |
| 전자금융거래법 준수 검토 | ⬜ 미완료 | 법무팀 | 정산 대행 구조 적법성 확인 |
| 개인정보 처리 위탁 계약 | ⬜ 미완료 | 법무팀 | Supabase(AWS), PG사 등 위탁업체 목록 정리 |

---

## 4. 판매자 유형 미확정 분기

`site.config.ts > seller.allowedType` 값에 따라 아래 처리가 달라집니다.

| 항목 | BUSINESS (사업자) | INDIVIDUAL (개인) | 비고 |
|------|-------------------|-------------------|------|
| 입점 신청 시 필요 정보 | 사업자등록번호, 상호, 대표자 | 성명, 연락처, 신분증 | 현재 코드: 최소 정보만 수집 |
| 세금계산서 | 발급 의무 있음 | 원천징수 가능 | PG 정산 구조에 따라 상이 |
| 개인정보 처리 | 법인정보 | 주민등록번호 일부 수집 가능 | 별도 법무 검토 필요 |
| 소득세 신고 | 법인세 | 종합소득세 | PG사 정산대행 여부에 따라 달라짐 |
