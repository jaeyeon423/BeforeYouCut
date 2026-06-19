# 미용사 Project Context

Last updated: 2026-06-19

Purpose: give AI agents and developers the minimum project context needed to work without re-reading the whole repository. Read this first, then inspect only the task-relevant files.

## Read Order

1. `AGENTS.md`: mandatory agent rules, especially the Next.js version warning.
2. This file: current architecture, routes, patterns, and known gaps.
3. Task-specific files from the map below.
4. `AI_REFERENCE.md`, `README.md`, `REQUIRED_INFO.md`, or `TODO.md` only when deeper context is needed.

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` because this project uses a newer Next.js version with changed conventions.

## Product

미용사 is a mobile-first marketplace for hair and beauty professionals. Buyers browse professional tools and brands. Sellers manage brand onboarding, product registration, product detail composition, orders, and settlements inside the same web app.

Current role split:

- Buyer surface: shopping, search, product detail, seller profile, cart, saved items, my page.
- Seller surface: `/seller` seller center inside the same Next.js app.
- Admin surface: `/admin` inside the same app for seller approval, product review, order status, refunds, settlement status handling, and CS overview.

## Stack

- Framework: Next.js `16.2.7` App Router.
- Frontend: React `19.2.4`, mostly vanilla CSS in `src/app/globals.css`.
- Database/Auth: Supabase PostgreSQL and Supabase Auth.
- ORM: Prisma `7.8.0` with `@prisma/adapter-pg`.
- Error monitoring: Sentry config exists, but production DSN/token values are pending.
- Deployment: GitHub `main` push triggers Vercel if the Vercel project is connected.

Common commands:

```bash
npm test
npm run lint
npm run build
npm run dev
```

Known non-blocking warnings:

- `npm run lint` currently reports a custom font warning from `src/app/layout.js`.
- `npm run build` currently reports Sentry deprecation warnings for `disableLogger` and `automaticVercelMonitors`.

## File Map

Use `rg` first. Avoid broad scans unless the task is architectural.

- `src/app/actions.js`: all main Server Actions, cached data loaders, auth-scoped mutations, seller dashboard actions.
- `prisma/schema.prisma`: authoritative data model.
- `src/site.config.js`: public business info, service metadata, seller policy, commission and legal retention settings. No secrets here.
- `src/app/layout.js`: root providers and seller map preload.
- `src/app/page.js`: home route composition.
- `src/app/seller/page.js`: seller center route.
- `src/components/screens/seller-dashboard.js`: seller onboarding, product detail editor, order and settlement dashboard.
- `src/components/screens/other.js`: search, product detail, seller profile, cart, my page, auth-related screen components.
- `src/components/screens/home.js`: home hero, rankings, brand rails.
- `src/components/screens/brands.js`: all sellers page.
- `src/components/ui.js`: cards, headers, bottom navigation, shared UI blocks.
- `src/components/providers.js`: app providers.
- `src/contexts/app-context.js`: sellers, likes, follows, toast, optimistic interactions.
- `src/contexts/auth-context.js`: Supabase auth state.
- `src/contexts/cart-context.js`: cart state.
- `src/utils/prisma.js`: Prisma singleton and Postgres pool.
- `src/utils/supabase/server.js`: server Supabase client.
- `src/utils/supabase/client.js`: browser Supabase client.
- `src/components/BusinessFooter.js`: legal/business footer.
- `src/components/IntermediaryNotice.js`: marketplace intermediary notice.

## Routes

- `/`: home.
- `/category`: category product browsing.
- `/search`: search.
- `/products/[id]`: buyer-facing product detail.
- `/sellers`: seller/brand list.
- `/sellers/[id]`: public seller profile.
- `/cart`: cart/checkout flow.
- `/checkout/success`, `/checkout/fail`: Toss Payments redirect handlers; success confirms payment server-side and creates the order.
- `/orders/[id]`: private order detail for the buyer, order-owning seller, or admin; includes shipment registration and refund request surfaces.
- `/saved`: saved products.
- `/my`: buyer account page with seller center entry point.
- `/seller`: seller center. Guest users see login guidance; non-seller users can start seller onboarding; sellers manage details/orders/settlements.
- `/admin`: admin console. Requires `User.role === "ADMIN"` or server-only `ADMIN_EMAILS` bootstrap.
- `/terms`, `/terms/privacy`, `/terms/refund`, `/terms/seller`: legal pages.

## Data Model Snapshot

Primary models:

- `User`: Supabase Auth user mirror. `role` is `BUYER | SELLER | ADMIN`.
- `Seller`: brand profile plus seller type/business fields. One seller per user via unique `userId`.
- `Product`: seller-owned product. `images` is a JSON array of public image URLs; `reviewStatus` controls admin review (`PENDING | APPROVED | REJECTED`); `isActive/deletedAt` control visibility; `spec` is JSON array used on detail pages.
- Product detail body sections are also stored in `Product.spec` as reserved key/value rows such as `상세 소개`, `핵심 포인트`, `사용/관리 팁`, `배송 안내`, `교환/반품 안내`, and `구매 전 확인사항`. Use `src/utils/product-detail.js` to parse/build this structure instead of hand-parsing it.
- `Order` and `OrderItem`: buyer orders and line items.
- `Like` and `Follow`: user-product and user-seller joins.
- `SellerBankAccount`: seller settlement account, intended for encrypted sensitive data.
- `Settlement`: seller settlement amount/status per order item.
- `RefundRequest`, `ShipmentTracking`, `CsInquiry`, `CsReply`, `AuditLog`: operational/legal models.

## Core Patterns

Auth and security:

- Do not trust client-supplied `userId`.
- Server Actions that write or read private user data must derive the active user from Supabase session via existing helpers in `src/app/actions.js`.
- Seller mutations must verify product ownership by comparing the current user's seller id with the target product's `sellerId`.

Caching:

- Public loaders use `unstable_cache` and cache tags.
- After mutations, call the relevant `revalidateTag` values such as `home`, `products`, `product-${id}`, `sellers`, or `seller-${id}`.
- User-scoped/private dashboard data should not be cached globally.

Next.js:

- `params` and `searchParams` may be async in this Next.js version. Await them in pages/metadata when applicable.
- This repo uses the Next.js 16 proxy convention, not old middleware assumptions. Check current docs before changing route/auth infrastructure.

UI:

- Preserve the existing mobile-first marketplace feel.
- Use existing components and CSS variables before adding new styling systems.
- Do not build a marketing landing page when the request is for a product workflow; implement the actual working surface.

Environment and secrets:

- `.env*` files are ignored. Never commit secrets.
- `.env.example` documents expected variables.
- Vercel production variables must be configured in the Vercel dashboard.

## Recent Decisions

- Seller and buyer screens are separated inside the same web app, not as separate apps.
- `/seller` is the seller center.
- `/my` contains an entry point to `/seller`.
- Sellers can edit buyer-facing product detail content from `src/components/screens/seller-dashboard.js`.
- Sellers can add new products from `/seller`; product creation requires core purchase-facing fields instead of creating placeholder products.
- Buyer-facing product detail pages render structured detail sections from `Product.spec`; sellers edit the same fields in `/seller`.
- Product cards, rankings, cart/order thumbnails, and detail pages render `Product.images`; sellers can upload a file to the Supabase Storage `product-images` bucket or paste an image URL in `/seller`.
- New seller-created products default to `PENDING` review and are hidden from public marketplace loaders until an admin approves them.
- `/admin` now provides a first-pass operations console: seller verify/hide, KYC review, product approve/reject/hide, order status update, refund approve/reject/complete handling, settlement confirm/pay/exclude handling, and CS reply/close handling. Admin writes create `AuditLog` records.
- Buyer-facing product and seller inquiry modals now create real `CsInquiry` rows instead of showing local-only placeholder success messages.
- `/orders/[id]` now provides a shared private order detail page. Buyers can view shipment/refund state and request refunds; sellers/admins can register shipment tracking for authorized orders.
- Checkout now uses a Toss Payments V2 payment-window flow: `prepareCheckout` stores a server-priced `Payment` session, the client opens the PG window, and `confirmCheckout` verifies `paymentKey/orderId/amount` server-side before creating `Order`, `OrderItem`, and `Settlement` rows.
- Direct order creation is disabled; orders are created only after PG confirmation.
- Order status changes now sync settlement status: `구매확정` moves pending settlements to `CONFIRMED`, while `취소`/`환불완료` moves unpaid settlements to `CANCELED`; admins can mark confirmed settlements as `PAID`.
- Seller center now captures KYC/business fields, private `seller-documents` storage paths or fallback document URLs, and encrypted settlement account data. Admin can review KYC status, open signed document URLs, mark settlement accounts verified, and see missing compliance issues.
- Supabase client helpers no longer fall back to placeholder project credentials; missing public Supabase env vars fail explicitly.
- `prisma/clear.js` no longer recreates the old `user_default` guest account and now clears operational tables such as settlements, refunds, shipments, CS, audit logs, and bank accounts.
- Public buyer-facing loaders expose only active, non-deleted sellers and products owned by those sellers; inactive temporary seller accounts can still use `/seller` but are hidden from marketplace pages.
- Home, seller profile, and my-page surfaces intentionally avoid Musinsa-scale fandom/ranking/review placeholders; prioritize specs, seller trust, shipping/returns, and purchase decisions.
- Public service name is now `미용사` with `MIYONGSA` as the wordmark style. Fake public business values must not be displayed; use `src/site.config.js` and hide unknown legal values until the user provides real ones.
- `docs/launch-gap-review.md` tracks Musinsa benchmark gaps and the remaining launch implementation order.
- Admin console lives at `/admin`; external PG refund execution, PG webhook hardening, bank payout automation, and carrier tracking automation still need follow-up implementation.
- Latest pushed commit as of 2026-06-18: `5c3a7d8 판매자 센터와 출시 체크리스트 추가`.

## Known Gaps

- Toss Payments payment-window request and server-side confirmation flow is implemented; real Toss test/live keys, production webhook handling, and operational PG dashboard verification are still required.
- Admin review and seller approval workflow has a first-pass `/admin` implementation with KYC status/private document review, but the Supabase storage policy SQL still needs to be applied and verified in production.
- Admins can record refund approval/rejection/completion and CS replies, but actual PG refund API execution is not implemented.
- Admins can record settlement confirmation/payment status, but actual bank transfer/API payout execution is not implemented.
- Real carrier tracking API integration is not implemented; sellers/admins can manually register carrier and tracking numbers.
- Supabase Storage bucket and RLS/public-read policy for `product-images` must be verified in production.
- Supabase Storage private bucket and policies for `seller-documents` are documented in `prisma/rls.sql`; production application and verification are still required.
- Business registration, mail-order registration, final service domain, legal effective dates, and customer support details still need real values in `src/site.config.js`.
- Sentry DSN/source map token values are pending.
- Production RLS and storage policies should be verified before launch.
- Legal pages are drafts and still need legal review.

## Detailed Docs

- `README.md`: broad project setup and overview. Some historical language may lag this context file.
- `AI_REFERENCE.md`: deeper AI/developer reference. Use when changing architecture, auth, data flow, or schema.
- `REQUIRED_INFO.md`: launch/legal/business inputs that humans must provide.
- `TODO.md`: small pending operational items, currently focused on Sentry setup.
- `docs/ai-human-launch-checklist.md`: AI-vs-human launch checklist from the business setup task.
- `docs/production-roadmap-prompts.md`: roadmap prompts and product planning notes.

## Standard Verification

For most code changes:

```bash
npm test
npm run lint
npm run build
```

For frontend changes, also run the app and check the affected route in a browser:

```bash
npm run dev
```
