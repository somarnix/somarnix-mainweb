# SOMARNIX

SOMARNIX is a Next.js 16 application for digital products, AI tools, video courses, order management, payments, support chat, and admin operations. The repository also includes Capacitor mobile packaging, Telegram payment/support workers, and a packaged flow-extension build pipeline.

## What This Project Includes

- Public website with catalog, product, course, blog, support, and policy pages
- Auth flows for login, signup, password reset, profile, and device management
- Marketplace/order flow with cart, checkout, payment verification, and order chat
- Admin interfaces for products, video courses, users, notifications, licenses, and payments
- Prompt/AI tool pages and related API routes
- Capacitor Android packaging support
- Telegram workers for PayWay/payment summary workflows
- Flow extension build and pack scripts

## Main Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- MySQL
- Capacitor Android
- Telegram MTProto / bot workflows

## Project Structure

```text
somarnix/
  app/                  Next app routes, app shell, pages, API routes, contexts, UI
  docs/                 Supporting guides for theme, platform apps, security, migration
  lib/                  Shared server/runtime utilities
  public/               Static assets, icons, service worker, payment assets
  scripts/              Build/deploy/helper scripts
  sql/                  Database schema and SQL setup files
  styles/               Additional CSS layers
  types/                Global type declarations
  workers/telegram/     Telegram payment and summary workers
  android/              Capacitor Android project
  capacitor-web/        Prepared web output for Capacitor
```

## Important Entry Points

- App shell: [`app/App.tsx`](./app/App.tsx)
- Root layout: [`app/layout.tsx`](./app/layout.tsx)
- Catch-all route: [`app/[...slug]/page.tsx`](./app/[...slug]/page.tsx)
- Proxy: [`proxy.ts`](./proxy.ts)
- App manifest: [`app/manifest.ts`](./app/manifest.ts)
- Footer: [`app/components/Footer.tsx`](./app/components/Footer.tsx)

## Environment

This project reads from local environment files such as:

- `.env.local`
- `.env.example.local`
- `.env.website`

The app currently expects values for areas such as:

- database connection
- Google auth
- SMTP mail
- payment / KHQR / ABA PayWay
- Telegram support and summary workers
- JWT / API key secrets
- app base URL

Do not commit live secrets.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build And Type Check

Production build:

```bash
npm run build
```

Type check:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

## Available Scripts

### Web

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Capacitor / Android

```bash
npm run cap:prepare
npm run cap:fix-android
npm run cap:assets
npm run cap:sync
npm run cap:android
npm run cap:open:android
```

### Flow Extension

```bash
npm run build:flow-extension
npm run pack:flow-extension
```

### Telegram / Payment Workers

```bash
npm run telegram:support-webhook
npm run payway:worker
npm run payway:summary
npm run payway:summary-bot
```

Telegram workers now live under [`workers/telegram`](./workers/telegram).

## Notes About Routing

The app uses Next App Router entry files, but much of the website is currently rendered through the custom app shell in [`app/App.tsx`](./app/App.tsx). That means:

- route files exist under `app/`
- many screens are still selected by the internal app router
- public pages like `/about`, `/privacy`, `/terms`, `/contact`, and `/faq` are real static Next routes

## SEO / Public Website Basics

The repository now includes:

- site metadata in [`app/layout.tsx`](./app/layout.tsx)
- shared metadata builder in [`app/lib/buildMetadata.ts`](./app/lib/buildMetadata.ts)
- `robots.txt` via [`app/robots.ts`](./app/robots.ts)
- `sitemap.xml` via [`app/sitemap.ts`](./app/sitemap.ts)
- custom 404 / loading / error shells

## Supporting Docs

See the [`docs`](./docs) folder for focused guides:

- [`SECURITY-GUIDE.md`](./docs/SECURITY-GUIDE.md)
- [`MIGRATION-GUIDE.md`](./docs/MIGRATION-GUIDE.md)
- [`platform-apps.md`](./docs/platform-apps.md)
- [`google-play.md`](./docs/google-play.md)
- [`microsoft-store.md`](./docs/microsoft-store.md)
- [`THEME-GUIDE.md`](./docs/THEME-GUIDE.md)
- [`THEME-SUMMARY.md`](./docs/THEME-SUMMARY.md)
- [`THEME-100-PERCENT.md`](./docs/THEME-100-PERCENT.md)
- [`ANTI-COPY-GUIDE.md`](./docs/ANTI-COPY-GUIDE.md)

## Database

Database setup files live in [`sql`](./sql). Review:

- [`sql/README.md`](./sql/README.md)
- numbered SQL files for schema/setup

## Production Notes

- Keep `proxy.ts` as the active Next 16 request interception file
- Do not recreate `middleware.ts` unless you intentionally change framework conventions
- Review all environment variables before deployment
- Review legal/policy page copy before publishing to production
- Telegram workers and support webhook configuration should be validated separately from the web app

## Current Maintenance Reality

This codebase is functional but still mid-refactor in places. Large files and a custom internal routing layer are still present. When changing structure:

- prefer small safe refactors
- avoid broad rewrites
- verify admin, auth, orders, chat, and payment flows after changes

