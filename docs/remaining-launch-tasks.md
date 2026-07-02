# 남은 출시 작업

Last updated: 2026-07-01

현재 커밋 기준으로 코드 구현은 결제 승인, 전체 환불, 웹훅, 운영 검증 스크립트까지 반영되어 있다. 아래는 실제 출시 전 남은 작업이다.

## 0. 결제 테스트용 임시 상품

현재 운영 DB에 결제 테스트용 공개 상품을 1개 추가했다.

- 상품 ID: `test-payment-product-1000`
- URL: `/products/test-payment-product-1000`
- 가격: 1,000원
- 판매자: `comblab`

운영 오픈 전에는 실제 판매 상품으로 교체하거나 비공개 처리해야 한다.

## 1. 사업자 공개 정보

완료:

- 대표자명: 김재연
- 사업장 주소: 수노을1로 191
- 고객센터 전화번호: 010-6375-9204
- 고객센터 이메일: jaeyeon423@gmail.com
- 개인정보보호책임자: 김재연
- 개인정보 문의 이메일: jaeyeon423@gmail.com

남음:

- 사업자등록번호 입력
- 통신판매업 신고번호 입력
- 약관 시행일 실제 출시일로 조정

## 2. Vercel Production 환경변수

남음:

- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: live 키
- `TOSS_SECRET_KEY`: live 키
- `TOSS_WEBHOOK_SECRET`
- `PG_MERCHANT_ID`
- `ADMIN_EMAILS`
- `ENCRYPTION_KEY`
- `ENCRYPTION_IV`
- `PHONE_VERIFICATION_SECRET`
- `NAVER_SENS_SERVICE_ID`
- `NAVER_SENS_ACCESS_KEY`
- `NAVER_SENS_SECRET_KEY`
- `NAVER_SENS_SMS_FROM`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

검증:

```bash
npm run verify:production-env -- --production
```

## 3. Supabase Storage

남음:

- Supabase SQL Editor에서 `prisma/rls.sql` 실행
- `product-images` 공개 버킷 확인
- `seller-documents` 비공개 버킷 확인
- 공개 이미지 읽기, 판매자 서류 비공개 접근 검증

검증:

```bash
npm run verify:storage
```

## 4. Toss Payments

남음:

- live 결제 키 발급 및 Vercel Production env 반영
- 토스 개발자센터 웹훅 등록
- 결제 성공, 결제 실패, 결제 취소, 관리자 전체 환불 테스트

웹훅 URL:

```text
https://before-you-cut.vercel.app/api/webhooks/toss?token=$TOSS_WEBHOOK_SECRET
```

등록 이벤트:

- `PAYMENT_STATUS_CHANGED`
- `CANCEL_STATUS_CHANGED`

## 5. 관리자 계정

남음:

- 관리자 이메일로 실제 회원가입 또는 로그인
- `ADMIN_EMAILS` Vercel Production env 입력
- 관리자 role bootstrap
- `/admin` 접속 확인

실행:

```bash
npm run bootstrap:admin -- admin@example.com
```

## 6. 운영 E2E 테스트

남음:

- 회원가입
- SMS 인증
- 기본 배송지 저장
- `/products/test-payment-product-1000` 상세에서 바로 주문하기
- Toss 결제 성공 후 주문 생성
- 결제 실패/취소 처리
- 관리자 전체 환불 완료 처리
- Toss 결제 취소 확인
- 판매자 상품 이미지 업로드
- 판매자 KYC 서류 업로드
- 관리자 서류 열람

## 7. 출시 후 후속 구현

출시 차단은 아니지만 후속 작업이 필요하다.

- 부분 환불
- 정산 자동 이체 또는 지급 API
- 택배사 배송 추적 API
- 리뷰/평점 고도화
- 쿠폰/적립금
- 검색/추천/랭킹 고도화
- Flutter 구매자 앱 API 확장
