# 1Section — Code Audit & Fix

> Audit: 2026-07-09 | Scope: `/app`, `/backend`, `/dashboard` (147 issues fixed)

## 🔴 HIGH (35 issues)

### Backend
1. `modules.routes.ts` — Route `/:slug/recommended` unreachable (after `/:slug`)
2. `categories.routes.ts` — Route `/admin/list` unreachable (after `/:id`)
3. `middleware/auth.ts` — Sync throws crash process → `try/catch` + `next(err)`
4. `lib/websocket.ts` — Duplicate close handler → extracted `registerClient/removeClient`
5. `config/lemon-squeezy.ts` — Redis lookup per req → local cache; N+1 → parallel; null guards added
6. `auth/auth.service.ts` — TOCTOU race → `upsert`
7. `lib/cache.ts` — Silent error swallows → added logging
8. `slugify()` duplicated 3x → shared from `lib/transform.ts`

### App
1. `GoogleLoginButton.tsx` — OAuth broken: `access_token` sent as `idToken` → auth code flow
2. `query-hooks/index.ts` — Wrong query key: `["progress"]` → `["progress", slug]`
3. `ModuleCard.tsx` — Nested `ReactFlowProvider`
4. `manage/page.tsx` — `window.open` without `noopener`
5. `lib/websocket.ts` — Infinite reconnect → max 5 retries
6. `ALL_CATEGORIES` duplicated 3x → `lib/constants.ts`
7. 3 error pages duplicated → shared `ErrorPage` component

### Dashboard
1. `ModuleContent.tsx` — `JSON.parse` without try/catch
2. `ModuleGraphEditor.tsx` — `useState` from props without sync effect
3. `lib/api.ts` — 401 interceptor conflicts with auth.ts

### Config
- `.gitignore` — `*.mjs` ignored eslint configs
- `backend/.gitignore` — missing `!.env.example`

## 🟡 MEDIUM (58 issues)
- `asyncHandler` utility created for controller boilerplate
- Removed redundant `findUniqueOrThrow` after `prisma.create`
- `slugify` unicode normalization, `buildAuthResponse` extracted
- ESLint `no-explicit-any`, `no-unused-vars` rules enabled
- Google Fonts `@import` → `next/font`
- Weekly chart date logic fixed (`Math.abs` → modulo)
- `useEffect` deps, `useMemo` for calculations, try/catch for mutations

## 🟢 LOW (54 issues)
- Duplicate favicon `<link>`, dead code cleanup, CSS variables consistency
- `aria-label`, `:hover` CSS, structured logger recommendation
- Magic numbers documented, empty catch blocks

## ✅ Verification
- Backend: `tsc --noEmit` — 0 errors
- App: `tsc --noEmit` — 0 errors
- Dashboard: `tsc --noEmit` — 0 errors

## Files Changed (38 files)
```
 .gitignore                              |  2 +-
 app/eslint.config.mjs                   |  7 +-
 app/src/app/dashboard/page.tsx          |  4 +-
 app/src/app/error.tsx                   | 47 +----------
 app/src/app/layout.tsx                  | 10 +--
 app/src/app/manage/page.tsx             |  2 +-
 app/src/app/models/error.tsx            | 47 +----------
 app/src/app/page.tsx                    |  2 +-
 app/src/app/preferences/page.tsx        | 17 +---
 app/src/components/ErrorPage.tsx        | 46 +++++++++++
 app/src/components/GoogleLoginButton.tsx| 55 +++----------
 app/src/components/LemonScript.tsx      |  2 +-
 app/src/components/ModuleCard.tsx       | 82 +++++++++----------
 app/src/components/UserPopup.tsx        | 19 +----
 app/src/lib/constants.ts                | 59 +++++++++++++
 app/src/lib/query-hooks/index.ts        |  2 +-
 app/src/lib/store/auth.ts               | 12 +--
 app/src/lib/websocket.ts                | 11 ++-
 backend/.gitignore                      |  3 +-
 backend/src/app.ts                      | 23 +++---
 backend/src/config/lemon-squeezy.ts     | 45 +++++++----
 backend/src/lib/async-handler.ts        |  7 ++
 backend/src/lib/cache.ts                | 15 ++--
 backend/src/lib/prisma.ts               |  6 +-
 backend/src/lib/transform.ts            |  4 +-
 backend/src/lib/websocket.ts            | 82 ++++++++------------
 backend/src/middleware/auth.ts          | 22 +++---
 backend/src/modules/ai/ai.service.ts    | 12 +--
 backend/src/modules/auth/auth.service.ts| 70 ++++++-----------
 backend/src/modules/categories/...      |  9 +--
 backend/src/modules/modules/...         |  4 +-
 backend/src/seed.ts                     | 10 +--
 dashboard/eslint.config.mjs             |  7 +-
 dashboard/src/components/ModuleContent  | 17 +++--
 dashboard/src/components/ModuleGraph... | 10 ++-
 dashboard/src/lib/api.ts                |  8 +-
```
