# Flutter Buyer App API Design

Last updated: 2026-06-22

## Decision

미용사 앱 확장은 다음 구조로 진행한다.

- Flutter 앱은 우선 구매자 전용 앱으로 만든다.
- 현재 Next.js 프로젝트는 웹 구매자 화면, 판매자 센터, 관리자 콘솔, API 백엔드 역할을 계속 맡는다.
- 앱은 Next.js Server Action을 직접 호출하지 않고 `/api/v1/*` JSON API를 호출한다.
- 웹 Server Action과 앱 API는 같은 service layer를 호출하도록 점진적으로 분리한다.
- 판매자 센터와 관리자 콘솔은 당분간 웹 전용으로 유지한다.

## Why

현재 웹 구조는 출시 속도에 유리하다. 이미 구매자, 판매자, 관리자 화면과 Supabase Auth, Prisma, Toss 결제, SMS 인증 흐름이 같은 Next.js 앱 안에 구현되어 있다.

다만 Flutter 앱은 Next.js Server Action을 직접 호출하기 어렵다. Flutter 앱에는 HTTP API가 필요하다. 따라서 전체 프로젝트를 크게 갈아엎기보다, 서버 로직을 service layer로 분리하고 `/api/v1` Route Handler를 추가하는 방식이 가장 낮은 위험이다.

## Target Architecture

```txt
Flutter buyer app
  -> HTTPS /api/v1/*
  -> Next.js Route Handlers
  -> src/server/services/*
  -> Prisma / Supabase / Toss / SMS

Next.js buyer web
  -> Server Actions
  -> src/server/services/*
  -> Prisma / Supabase / Toss / SMS

Next.js seller/admin web
  -> Server Actions
  -> src/server/services/*
  -> Prisma / Supabase / Toss / SMS
```

The important rule: business logic should live in services, not directly inside route handlers or UI components.

## Non-Goals

- Do not move the whole repository to a monorepo immediately.
- Do not build seller/admin Flutter screens in the first app phase.
- Do not duplicate checkout, signup, product pricing, or order creation logic separately for web and app.
- Do not trust `userId` from any client request.
- Do not expose admin or seller APIs under the buyer app API scope.

## Buyer App MVP Scope

The first Flutter app should support:

- Home/catalog browsing
- Search and category product list
- Product detail
- Seller profile read-only view
- Signup/login
- SMS OTP signup verification
- Saved products and followed sellers
- Cart
- Default shipping profile
- Checkout/payment
- Order list and order detail
- Refund request

Explicitly out of first Flutter app scope:

- Seller onboarding
- Product registration/editing
- Settlement/account management
- Admin review workflows
- CS operations console

## API Principles

### Versioning

All mobile-facing APIs should start with:

```txt
/api/v1
```

Breaking response changes should use a later version, for example `/api/v2`.

### Response Shape

Use one consistent envelope.

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "휴대폰 번호를 확인해 주세요."
  }
}
```

Recommended HTTP status mapping:

- `200`: success
- `201`: created
- `400`: invalid request
- `401`: missing or invalid auth token
- `403`: authenticated but not allowed
- `404`: resource not found
- `409`: conflict, duplicate, already processed
- `429`: rate limited
- `500`: unexpected server failure

### Pagination

For the first API version, keep pagination close to the current web model:

```txt
?page=0&limit=20
```

Response:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "page": 0,
    "limit": 20,
    "total": 120,
    "hasMore": true
  }
}
```

Cursor pagination can be added later for feeds where item ordering changes frequently.

### Authentication

Flutter should use Supabase Auth for sessions.

Authenticated API requests must send:

```txt
Authorization: Bearer <supabase_access_token>
```

The API server must verify the token and derive the active user from Supabase. It must never accept `userId` from the request body.

Recommended helper:

```txt
src/server/http/api-auth.js
  requireApiUser(request)
  getOptionalApiUser(request)
```

The helper should:

- Parse the bearer token.
- Verify it with Supabase Auth.
- Return `{ id, email, metadata }`.
- Throw a consistent `401` API error when invalid.

### Service Layer

Do not import Server Actions into API routes. Server Actions are web-facing orchestration functions and may rely on cookies, cache revalidation, or route-specific behavior.

Instead:

```txt
Server Action -> service
API Route     -> service
```

Recommended service layout:

```txt
src/server/
  http/
    api-auth.js
    api-response.js
    api-errors.js
  services/
    catalog-service.js
    product-service.js
    seller-service.js
    phone-verification-service.js
    buyer-auth-service.js
    profile-service.js
    interaction-service.js
    checkout-service.js
    order-service.js
```

Service functions should receive explicit dependencies or explicit user identity:

```txt
registerBuyer({ name, phone, email, password, consentedTypes })
getBuyerOrders({ userId })
prepareBuyerCheckout({ userId, input })
```

## API Surface

### Catalog

#### `GET /api/v1/home`

Returns app home data.

Maps from current `getHomeData`.

Response data:

```json
{
  "ranking": [],
  "newItems": [],
  "spotlightSellers": [],
  "mainBanner": null
}
```

#### `GET /api/v1/products`

Returns paginated public products.

Query:

```txt
category=전체
page=0
limit=20
filter=new|best
query=
```

Maps from current `getCategoryProducts`, with search added or routed to a search service.

#### `GET /api/v1/products/:productId`

Returns product detail, seller, and related products.

Maps from current `getProductDetail`.

#### `GET /api/v1/sellers/:sellerId`

Returns public seller profile and seller products.

Maps from current `getSellerProfile`.

### Auth and Signup

#### `POST /api/v1/auth/phone/request`

Requests SMS OTP for signup.

Body:

```json
{
  "phone": "01012345678"
}
```

Maps from current `requestSignupPhoneVerification`.

Production response must not include `debugCode`. Local development may include it only when SMS provider is not configured.

#### `POST /api/v1/auth/phone/verify`

Verifies SMS OTP.

Body:

```json
{
  "phone": "01012345678",
  "code": "123456"
}
```

Maps from current `verifySignupPhoneCode`.

#### `POST /api/v1/auth/signup`

Creates a buyer account after phone verification and required terms consent.

Body:

```json
{
  "name": "홍길동",
  "phone": "01012345678",
  "email": "buyer@example.com",
  "password": "password1",
  "consentedTypes": ["USER_TERMS", "PRIVACY_POLICY"]
}
```

Maps from current `registerBuyer`.

Open decision:

- Keep server-mediated signup in `/api/v1/auth/signup` for the first version.
- Flutter can use Supabase SDK for login/session persistence after signup.
- If strict signup enforcement becomes required, review Supabase Auth settings to reduce direct public bypass paths.

### Me and Profile

#### `GET /api/v1/me`

Requires bearer token.

Returns current buyer account mirror, role, shipping profile, and basic counts.

#### `GET /api/v1/me/shipping-profile`

Requires bearer token.

Maps from current `getMyShippingProfile`.

#### `PATCH /api/v1/me/shipping-profile`

Requires bearer token.

Body:

```json
{
  "name": "홍길동",
  "phone": "01012345678",
  "address": "서울시 강남구 ...",
  "addressDetail": "101동 202호"
}
```

Maps from current `updateMyShippingProfile`.

Address search note:

- Current web uses the Kakao Postcode browser widget.
- Flutter should not depend on the browser widget long-term.
- MVP can use a WebView bridge or manual address input.
- Production app should use a mobile-suitable address search provider or Kakao address flow that works reliably in app context.

### Interactions

#### `GET /api/v1/me/interactions`

Requires bearer token.

Returns liked product IDs and followed seller IDs.

Maps from current `getUserInteractions`.

#### `PUT /api/v1/me/likes/:productId`

Requires bearer token.

Adds a product like.

#### `DELETE /api/v1/me/likes/:productId`

Requires bearer token.

Removes a product like.

Current `toggleLike` should be split into explicit add/remove service functions for API clarity.

#### `PUT /api/v1/me/follows/:sellerId`

Requires bearer token.

Follows a seller.

#### `DELETE /api/v1/me/follows/:sellerId`

Requires bearer token.

Unfollows a seller.

Current `toggleFollow` should be split into explicit add/remove service functions for API clarity.

### Checkout and Payment

#### `POST /api/v1/checkout/prepare`

Requires bearer token.

Creates a server-priced payment session.

Body:

```json
{
  "name": "홍길동",
  "phone": "01012345678",
  "address": "서울시 강남구 ... 101동 202호",
  "items": [
    {
      "productId": "product-id",
      "quantity": 1
    }
  ]
}
```

Important change from current web call:

- The app should send product IDs and quantities.
- The server should compute all prices.
- The app should not send trusted `total`.

Maps from current `prepareCheckout`, but the service should harden input so totals are always server-derived.

Response data:

```json
{
  "provider": "TOSS",
  "clientKey": "...",
  "customerKey": "supabase-user-id",
  "providerOrderId": "...",
  "amount": 49000,
  "orderName": "상품명 외 1건",
  "customerName": "홍길동",
  "customerEmail": "buyer@example.com",
  "customerMobilePhone": "01012345678"
}
```

Flutter integration options:

- Prefer Toss mobile SDK if available for the selected app build path.
- If using a payment WebView, define app deep links for success/fail.
- Keep server confirmation mandatory in all cases.

#### `POST /api/v1/checkout/confirm`

Requires bearer token.

Body:

```json
{
  "paymentKey": "...",
  "providerOrderId": "...",
  "amount": 49000
}
```

Maps from current `confirmCheckout`.

The server must:

- Verify the payment belongs to the authenticated user.
- Verify the amount matches the stored payment amount.
- Confirm with Toss server-side.
- Create `Order`, `OrderItem`, and `Settlement` records.
- Return the created `orderId`.

### Orders

#### `GET /api/v1/orders`

Requires bearer token.

Returns current buyer's orders.

Maps from current `getUserOrders`.

#### `GET /api/v1/orders/:orderId`

Requires bearer token.

Returns buyer order detail only when the order belongs to the user.

Maps from current `getOrderDetail`, but app API should expose only buyer role data.

#### `POST /api/v1/orders/:orderId/refund`

Requires bearer token.

Body:

```json
{
  "reason": "CHANGE_OF_MIND",
  "reasonDetail": "단순 변심"
}
```

Maps from current `requestRefund`.

## Security Requirements

- All authenticated APIs must derive user identity from the bearer token.
- API routes must not accept client-supplied `userId`.
- Seller/admin-only data must not be exposed in buyer API responses.
- Phone verification request should be rate limited by phone number and optionally IP/device.
- OTP should remain hashed at rest.
- Checkout must be server-priced.
- Payment confirmation must verify payment ownership and amount.
- Refund requests must verify order ownership.
- API errors should not expose stack traces, raw provider secrets, or internal SQL details.
- Production CORS should be explicit if browser clients outside the main web origin are introduced.

## Implementation Plan

### Phase 1: API Foundation

- Add `src/server/http/api-response.js`.
- Add `src/server/http/api-errors.js`.
- Add `src/server/http/api-auth.js`.
- Add route handler test pattern for `/api/v1`.
- Add `GET /api/v1/health`.

### Phase 2: Public Catalog APIs

- Extract catalog/product/seller read logic into services.
- Add:
  - `GET /api/v1/home`
  - `GET /api/v1/products`
  - `GET /api/v1/products/:productId`
  - `GET /api/v1/sellers/:sellerId`

This lets Flutter start building home, list, search, and product detail screens without auth.

### Phase 3: Buyer Auth and Profile APIs

- Extract phone verification and buyer signup services.
- Add:
  - `POST /api/v1/auth/phone/request`
  - `POST /api/v1/auth/phone/verify`
  - `POST /api/v1/auth/signup`
  - `GET /api/v1/me`
  - `GET /api/v1/me/shipping-profile`
  - `PATCH /api/v1/me/shipping-profile`

### Phase 4: Saved and Follow APIs

- Split toggle services into explicit add/remove operations.
- Add like/follow APIs.

### Phase 5: Checkout and Orders

- Harden checkout prepare so app sends product IDs/quantities and server computes totals.
- Add checkout prepare/confirm APIs.
- Add order list/detail/refund APIs.
- Confirm Toss mobile flow and app deep link behavior.

### Phase 6: Flutter Buyer MVP

Create a separate Flutter app repository or sibling workspace only after public catalog APIs are stable.

Recommended Flutter app modules:

```txt
lib/
  core/
    api/
    auth/
    routing/
    theme/
  features/
    home/
    catalog/
    product_detail/
    seller_profile/
    auth/
    cart/
    checkout/
    orders/
    profile/
```

State management can start with Riverpod or Provider. For a new Flutter app, Riverpod is the cleaner default unless there is a strong reason to reuse Provider.

## Testing Strategy

For the Next.js API layer:

- Unit test services without HTTP.
- Test API route handlers for success and error response shape.
- Keep existing Server Action tests passing.
- Add contract fixtures for API responses that Flutter can consume.
- Run:

```bash
npm test
npm run lint
npm run build
```

For Flutter:

- Use mocked API clients for UI tests.
- Add integration tests for auth, product detail, and checkout happy path after APIs stabilize.
- Keep API model parsing tests strict so backend response drift is caught early.

## First PR Recommendation

The first implementation PR should not touch checkout or auth yet.

Recommended first PR:

- Create API response/error helpers.
- Create catalog service from current public product loaders.
- Add:
  - `GET /api/v1/health`
  - `GET /api/v1/products`
  - `GET /api/v1/products/:productId`
- Add tests for response shape.

This gives Flutter enough data to start UI work while keeping risk low.

## Open Questions

- Will Flutter live in a separate repository or inside this repository later?
- Will the first app release use Toss mobile SDK or payment WebView?
- Which address search provider will be used in Flutter?
- Should push notifications be added in MVP or after first release?
- Should Supabase direct signup be restricted further once server-mediated signup is stable?
