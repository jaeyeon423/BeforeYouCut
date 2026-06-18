# BEFORE YOU CUT Project Context

Last updated: 2026-06-18

Purpose: give AI agents and developers the minimum project context needed to work without re-reading the whole repository. Read this first, then inspect only the task-relevant files.

## Read Order

1. `AGENTS.md`: mandatory agent rules, especially the Next.js version warning.
2. This file: current architecture, routes, patterns, and known gaps.
3. Task-specific files from the map below.
4. `AI_REFERENCE.md`, `README.md`, `REQUIRED_INFO.md`, or `TODO.md` only when deeper context is needed.

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` because this project uses a newer Next.js version with changed conventions.

## Product

BEFORE YOU CUT is a mobile-first marketplace for hair and beauty professionals. Buyers browse premium tools and brands. Sellers manage brand onboarding, product detail composition, orders, and settlements inside the same web app.

Current role split:

- Buyer surface: shopping, search, product detail, seller profile, cart, saved items, my page.
- Seller surface: `/seller` seller center inside the same Next.js app.
- Admin surface: not implemented yet. Add `/admin` later for seller review, legal checks, reports, and settlement operations.

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
- `/saved`: saved products.
- `/my`: buyer account page with seller center entry point.
- `/seller`: seller center. Guest users see login guidance; non-seller users can start seller onboarding; sellers manage details/orders/settlements.
- `/terms`, `/terms/privacy`, `/terms/refund`, `/terms/seller`: legal pages.

## Data Model Snapshot

Primary models:

- `User`: Supabase Auth user mirror. `role` is `BUYER | SELLER | ADMIN`.
- `Seller`: brand profile plus seller type/business fields. One seller per user via unique `userId`.
- `Product`: seller-owned product. `spec` is JSON array used on detail pages.
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
- Buyer-facing product detail pages render structured detail sections from `Product.spec`; sellers edit the same fields in `/seller`.
- Home, seller profile, and my-page surfaces intentionally avoid Musinsa-scale fandom/ranking/review placeholders; prioritize specs, seller trust, shipping/returns, and purchase decisions.
- Admin should become `/admin` later when seller approval, KYC/business verification, disputes, and settlement operations need operator workflows.
- Latest pushed commit as of 2026-06-18: `5c3a7d8 판매자 센터와 출시 체크리스트 추가`.

## Known Gaps

- Real payment/PG integration is not implemented.
- Admin review and seller approval workflow is not implemented.
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
