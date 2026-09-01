# DwellSync — Phase 2 Diagnostic Report

## Environment & Dependency Overview

| Component | Detected Version | Notes / Status |
| :--- | :--- | :--- |
| **Next.js** | `15.1.7` (App Router) | Compatible with React 19 |
| **React / React DOM** | `19.0.0` | Latest React 19 stable |
| **TypeScript** | `5.7.3` | Strict mode enabled |
| **Tailwind CSS** | `3.4.17` (v3) | Uses `@tailwind base; components; utilities;` |
| **PostCSS** | `8.5.2` | Requires `tailwindcss` + `autoprefixer` plugins |
| **Autoprefixer** | `10.4.20` | Installed |
| **Supabase SSR** | `@supabase/ssr@0.5.2` | Cookie-based session management |
| **Supabase Client** | `@supabase/supabase-js@2.48.1` | Base client library |
| **Package Manager** | `npm` (`package-lock.json`) | Standard npm lockfile |
| **Build Command** | `npm run build` (`next build`) | Production bundle generator |
| **Dev Command** | `npm run dev` (`next dev`) | Local hot-reloading dev server |

---

## Detected Errors & Symptoms

1. **Browser 404 on `_next/static` Assets**:
   - `GET /_next/static/css/app/layout.css?v=... 404 Not Found`
   - `GET /_next/static/chunks/main-app.js?v=... 404 Not Found`
   - `GET /_next/static/chunks/app/page.js 404 Not Found`
   - `GET /_next/static/chunks/app/layout.js 404 Not Found`
   - `GET /_next/static/chunks/app-pages-internals.js 404 Not Found`
2. **Unstyled HTML**:
   - CSS styles not applying because `layout.css` failed to compile and load.
3. **Database / Supabase Connectivity**:
   - `.env.local` was 0 bytes (empty), leaving Supabase URLs and keys undefined in runtime environments.
4. **Stale Port 3000 Process**:
   - A background Node process was listening on port 3000 serving a previous build state with conflicting manifest hashes.

---

## Root Cause Analysis

### 1. Empty `postcss.config.mjs` (0 Bytes)
`postcss.config.mjs` in the project root was completely empty.
Next.js relies on PostCSS to compile `globals.css` (which contains `@tailwind base`, `@tailwind components`, `@tailwind utilities`). Without the PostCSS configuration mapping `tailwindcss` and `autoprefixer`, Next.js cannot compile the CSS bundle, causing `layout.css` to fail to generate or return 404.

### 2. Empty `tailwind.config.ts` (0 Bytes)
`tailwind.config.ts` in the project root was 0 bytes.
Without content scanning paths (`./src/pages/**/*.{js,ts,jsx,tsx,mdx}`, `./src/components/**/*.{js,ts,jsx,tsx,mdx}`, `./src/app/**/*.{js,ts,jsx,tsx,mdx}`) and theme extensions (colors, borders, animations), Tailwind utility classes cannot be parsed.

### 3. Empty `.env.local` (0 Bytes)
`.env.local` was empty. When client-side or server-side Supabase utilities initialized, they lacked `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, causing Supabase auth and queries to fail.

### 4. Stale / Mixed `.next` Artifact State
When `next build` runs, Next.js generates production-hashed assets (e.g., `.next/static/css/0720faa979e2c0b7.css`). When a dev server (`next dev`) is started or a client requests unhashed development chunk names (`main-app.js`, `app/page.js`, `app/layout.css?v=...`), if stale build manifests or port conflicts exist, the static asset router cannot locate the requested chunk and responds with 404.

### 5. Middleware Matcher Whitelisting
`src/middleware.ts` matcher did not explicitly whitelist `.css` and `.js` extensions alongside image formats, risking unwanted auth interception of asset requests.

### 6. Zero-Byte Placeholder Files
13 placeholder files created in early phases were 0 bytes:
- `src/app/api/auth/switch-society/route.ts`
- `src/app/api/society/[societyId]/buildings/route.ts`
- `src/app/api/society/[societyId]/floors/route.ts`
- `src/app/api/society/[societyId]/profile/route.ts`
- `src/app/api/society/[societyId]/units/route.ts`
- `src/app/api/society/[societyId]/wings/route.ts`
- `src/app/dashboard/page.tsx`
- `src/app/society/page.tsx`
- `src/app/society/[societyId]/buildings/page.tsx`
- `src/app/society/[societyId]/people/page.tsx`
- `src/app/society/[societyId]/units/page.tsx`
- `src/app/superadmin/audit/page.tsx`
- `vitest.config.ts`

---

## Stabilization & Correction Plan

1. **Configure PostCSS**: Write valid `postcss.config.mjs` with `tailwindcss` and `autoprefixer`.
2. **Configure Tailwind v3**: Write complete `tailwind.config.ts` with content paths and color variable mappings.
3. **Configure Environment Variables**: Set up `.env.local` and `.env.example` with valid Supabase URL, anon key, and service role key.
4. **Fix Middleware**: Update `src/middleware.ts` with robust static asset bypass.
5. **Populate 0-byte Route & Component Files**: Implement proper Next.js 15 App Router handlers.
6. **Implement `/api/health`**: Diagnostic endpoint validating Application, Database, and Supabase connectivity.
7. **Clean Build & Process Lifecycle**:
   - Terminate stale node processes on port 3000.
   - Clean `.next` build cache.
   - Run production build (`next build`).
   - Run and verify production server (`next start`).
   - Run and verify development server (`next dev`).
   - Run full automated test suite (`npm run test`).

