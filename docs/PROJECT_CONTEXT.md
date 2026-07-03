# 미용사 Project Context

Last updated: 2026-07-01

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
- `npm run build` currently reports the Next.js workspace-root warning when multiple lockfiles exist under `/Users/jaeyeon423/wc`.

## File Map

Use `rg` first. Avoid broad scans unless the task is architectural.

- `src/app/actions.js`: all main Server Actions, cached public loader wrappers, auth-scoped mutations, seller dashboard actions.
- `src/server/services/catalog-service.js`: public catalog query conditions, product/seller formatters, and marketplace read services shared by web loaders and future app-facing APIs.
- `prisma/schema.prisma`: authoritative data model.
- `src/site.config.js`: public business info, service metadata, seller policy, commission and legal retention settings. No secrets here.
- `src/app/layout.js`: root providers and seller map preload.
- `src/app/page.js`: home route composition.
- `src/app/seller/page.js`: seller center route.
- `src/app/seller/_SellerRoutePage.js`: shared seller subpage route wrapper.
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
- `scripts/bootstrap-test-seller.js`: idempotently creates/updates a Supabase Auth + DB seller test account from CLI email/password args.

## Routes

- `/`: home.
- `/category`: category product browsing.
- `/search`: search.
- `/products/[id]`: buyer-facing product detail.
- `/sellers`: seller/brand list.
- `/sellers/[id]`: public seller profile.
- `/cart`: cart/checkout flow.
- `/checkout/confirm`: Toss Payments success redirect handler; confirms payment server-side, creates the order, then redirects to the display page.
- `/checkout/success`, `/checkout/fail`: checkout result display pages. `success` is display-only and keeps legacy Toss query redirects compatible with `/checkout/confirm`.
- `/orders/[id]`: private order detail for the buyer, order-owning seller, or admin; includes shipment registration and refund request surfaces.
- `/saved`: saved products.
- `/my`: buyer account page with seller center entry point.
- `/seller`: seller center overview. Guest users see login guidance; non-seller users can start seller onboarding; sellers see daily next actions and role navigation.
- `/seller/products`: seller product list and product status overview.
- `/seller/products/new`: seller product registration flow.
- `/seller/products/[productId]`: seller-owned product detail editor for buyer-facing detail content.
- `/seller/orders`: seller order handling list.
- `/seller/settlements`: seller settlement status list.
- `/seller/settings`: seller compliance, KYC documents, and settlement account settings.
- `/admin`: admin console. Requires `User.role === "ADMIN"` or server-only `ADMIN_EMAILS` bootstrap.
- `/terms`, `/terms/privacy`, `/terms/refund`, `/terms/seller`: legal pages.

## Data Model Snapshot

Primary models:

- `User`: Supabase Auth user mirror. `role` is `BUYER | SELLER | ADMIN`; `phone` plus default shipping fields are used to prefill buyer checkout, with `defaultShippingAddressDetail` storing unit/floor/detail address separately.
- `PhoneVerification`: pre-signup SMS OTP sessions. Stores hashed codes, expiry, attempts, verified/consumed timestamps, and is consumed by buyer registration.
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
- Keep role surfaces distinct: buyer pages prioritize shopping confidence, order/shipping/account state; seller pages prioritize daily product/order/settlement operations; admin pages prioritize review, KYC, refund, settlement, and CS queues.

Environment and secrets:

- `.env*` files are ignored. Never commit secrets.
- `.env.example` documents expected variables.
- Vercel production variables must be configured in the Vercel dashboard.
- Database TLS certificate verification defaults on for `VERCEL_ENV=production`; local/non-production builds can override with `DATABASE_TLS_REJECT_UNAUTHORIZED`.

## Recent Decisions

- Seller and buyer screens are separated inside the same web app, not as separate apps.
- `/seller` is the seller center.
- `/my` contains an entry point to `/seller`.
- Sellers can edit buyer-facing product detail content from `src/components/screens/seller-dashboard.js`.
- Sellers can add new products from `/seller`; product creation requires core purchase-facing fields instead of creating placeholder products.
- Buyer-facing product detail pages render structured detail sections from `Product.spec`; sellers edit the same fields in `/seller`.
- Buyer-facing product detail now has a dedicated `상세 내용` section composed from the same seller-editable detail fields: intro, highlights, usage/care, shipping, returns, and purchase notices.
- Product cards, rankings, cart/order thumbnails, and detail pages render `Product.images`; sellers can upload a file to the Supabase Storage `product-images` bucket or paste an image URL in `/seller`.
- New seller-created products default to `PENDING` review and are hidden from public marketplace loaders until an admin approves them.
- Pending products stay hidden from public users, but the owning seller or an admin can open `/products/[id]` as a private preview with purchase and inquiry actions disabled.
- `/admin` now provides a first-pass operations console: seller verify/hide, KYC review, product approve/reject/hide, order status update, refund approve/reject/complete handling, settlement confirm/pay/exclude handling, and CS reply/close handling. Admin writes create `AuditLog` records.
- Buyer-facing product and seller inquiry modals now create real `CsInquiry` rows instead of showing local-only placeholder success messages.
- `/orders/[id]` now provides a shared private order detail page. Buyers can view shipment/refund state and request refunds; sellers/admins can register shipment tracking for authorized orders.
- Checkout now uses a Toss Payments V2 payment-window flow: `prepareCheckout` stores a server-priced `Payment` session, the client opens the PG window, and `/checkout/confirm` verifies `paymentKey/orderId/amount` server-side before creating `Order`, `OrderItem`, and `Settlement` rows.
- Checkout success redirects can arrive without a server-readable browser auth session, so `/checkout/confirm` authorizes by the saved `Payment.providerOrderId` row plus Toss confirm API validation and then settles the order for `Payment.userId`.
- `/checkout/success` is display-only. Do not call payment confirmation or `revalidateTag` from its render path; order history/detail loaders are private uncached DB reads, and Next.js rejects tag revalidation during render.
- Toss payment status webhooks are accepted at `/api/webhooks/toss`; configure the Toss developer-center webhook URL with `?token=$TOSS_WEBHOOK_SECRET`. The webhook reuses the same paid-payment settlement path as success redirects and can recover a `DONE` payment into an order idempotently.
- Toss cancellation is wired for admin full-refund completion: `updateAdminRefundStatus({ status: "COMPLETED" })` calls the Toss cancel API, records the cancel response on `Payment.rawResponse`, marks the order `환불완료`, and cancels unpaid settlements. Partial refunds are intentionally blocked until the order/refund/settlement state model supports them.
- Product detail has a buyer-facing direct order flow: `replaceCart([product])` then `/cart?checkout=1`, where cart auto-opens checkout or sends guests to `/my?auth=signin&returnTo=/cart?checkout=1`.
- Buyers can save a default shipping profile from `/my` settings or checkout; address search uses the Kakao Postcode browser widget, and unit/floor details are captured in a separate detail-address field before being composed into the final order address.
- Signup uses a shopping-mall style flow in `/my`: buyer name/phone, SMS OTP verification, email/password, required terms. `registerBuyer` performs final server-side signup only after `PhoneVerification` is verified.
- SMS OTP uses NAVER Cloud SENS when `NAVER_SENS_*` env vars are configured; local/test environments return/log a debug code instead.
- Future mobile expansion is planned as a Flutter buyer-only app that calls `/api/v1/*`; keep seller/admin web-only for now and move shared business logic into `src/server/services/*` before exposing API routes.
- Public catalog read logic has started moving into `src/server/services/*`: `actions.js` keeps the Next.js cache/action boundary, while `src/server/services/catalog-service.js` owns product/seller public query rules and formatting.
- Role-specific UI composition is the product direction: buyer home/my-page surface shopping trust and account state first, seller center starts with daily operation queues, and admin console starts with risk/review queues before detailed lists.
- Buyer purchase screens now emphasize shopping-mall decision structure: product detail has a purchase decision panel, cart has an order summary, checkout confirms line items and payment agreement text, and order detail shows fulfillment progress.
- Buyer discovery screens now provide catalog context, filter/sort controls, search suggestions, product rails, and seller trust indicators so browsing feels like a shopping workflow rather than a static list.
- `/category` now works as a marketplace directory with `카테고리` and `브랜드` tabs, a dense left-side category rail, top filter tabs, constrained desktop width, and right-side icon grids before optional product listing.
- Seller/admin role screens now emphasize operating cadence: seller center is split into URL-backed subpages for overview, products, product registration/detail editing, orders, settlements, and compliance/settings, while admin console starts with a review/KYC/refund/CS runbook before the detailed queues.
- `/my` is the role-switching account hub: buyer stats stay focused on orders/saved items/shipping address, while seller/admin entry cards are separated and driven by server-loaded DB role/account summary.
- `/my` does not assume logged-in users are buyers while account summary is missing; it shows a neutral account-sync state, then renders buyer/seller/admin cards from `User.role` and linked `Seller`.
- `/orders/[id]` is shared by buyer/seller/admin but now frames the same order differently per role: buyer sees order/shipping/refund confidence, seller sees shipment and settlement-relevant handling, admin sees operational risk checks.
- Direct order creation is disabled; orders are created only after PG confirmation.
- Order status changes now sync settlement status: `구매확정` moves pending settlements to `CONFIRMED`, while `취소`/`환불완료` moves unpaid settlements to `CANCELED`; admins can mark confirmed settlements as `PAID`.
- Seller center now captures KYC/business fields, private `seller-documents` storage paths or fallback document URLs, and encrypted settlement account data. Admin can review KYC status, open signed document URLs, mark settlement accounts verified, and see missing compliance issues.
- Supabase client helpers no longer fall back to placeholder project credentials; missing public Supabase env vars fail explicitly.
- `prisma/clear.js` no longer recreates the old `user_default` guest account and now clears operational tables such as settlements, refunds, shipments, CS, audit logs, phone verifications, and bank accounts.
- Public buyer-facing loaders expose only active, non-deleted sellers and products owned by those sellers; inactive temporary seller accounts can still use `/seller` but are hidden from marketplace pages.
- Home, seller profile, and my-page surfaces intentionally avoid Musinsa-scale fandom/ranking/review placeholders; prioritize specs, seller trust, shipping/returns, and purchase decisions.
- Public service name is now `미용사` with `MIYONGSA` as the wordmark style. Fake public business values must not be displayed; use `src/site.config.js` and hide unknown legal values until the user provides real ones.
- Public business info is partially filled in `src/site.config.js` for representative/contact/privacy officer. Business registration number and mail-order registration number are still blank.
- `docs/launch-gap-review.md` tracks Musinsa benchmark gaps and the remaining launch implementation order.
- Admin console lives at `/admin`; partial refunds, bank payout automation, and carrier tracking automation still need follow-up implementation.
- `docs/vercel-production-checklist.md` plus `npm run verify:production-env`, `npm run verify:storage`, and `npm run bootstrap:admin` provide the current production preflight path.
- Check the current pushed commit with `git log -1 --oneline`; this file intentionally avoids hardcoding a moving commit hash.

## Known Gaps

- Toss Payments payment-window request, server-side confirmation flow, payment/cancel webhook route, and full-refund cancel API path are implemented; real Toss live keys, webhook secret registration, and operational PG dashboard verification are still required.
- Admin review and seller approval workflow has a first-pass `/admin` implementation with KYC status/private document review, but the Supabase storage policy SQL still needs to be applied and verified in production.
- Admins can record refund approval/rejection/completion and CS replies. Full refunds call the Toss cancel API; partial refunds are not implemented.
- Admins can record settlement confirmation/payment status, but actual bank transfer/API payout execution is not implemented.
- Real carrier tracking API integration is not implemented; sellers/admins can manually register carrier and tracking numbers.
- Supabase Storage bucket and RLS/public-read policy for `product-images` must be verified in production.
- Supabase Storage private bucket and policies for `seller-documents` are documented in `prisma/rls.sql`; production application and verification are still required.
- Business registration, mail-order registration, final service domain, legal effective dates, and customer support details still need real values in `src/site.config.js`.
- Sentry config files exist; production DSN/source map token values are pending and checked by `npm run verify:production-env -- --production`.
- Production RLS and storage policies should be verified before launch.
- Legal pages are drafts and still need legal review.

## Detailed Docs

- `README.md`: broad project setup and overview. Some historical language may lag this context file.
- `AI_REFERENCE.md`: deeper AI/developer reference. Use when changing architecture, auth, data flow, or schema.
- `REQUIRED_INFO.md`: launch/legal/business inputs that humans must provide.
- `TODO.md`: small pending operational items, currently focused on Sentry setup.
- `docs/ai-human-launch-checklist.md`: AI-vs-human launch checklist from the business setup task.
- `docs/production-roadmap-prompts.md`: roadmap prompts and product planning notes.
- `docs/flutter-buyer-app-api-design.md`: Flutter buyer app and `/api/v1` API layer design. Use before adding app-facing APIs or mobile-specific service extraction.
- `docs/vercel-production-checklist.md`: Production env, Toss webhook, Sentry, admin bootstrap, and storage verification checklist.
- `docs/remaining-launch-tasks.md`: current launch-blocking checklist after the latest business-info update.

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
