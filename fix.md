# Full Code Audit — Security & Engineering Findings

## 🔴 Critical

### 1. `app/src/lib/websocket.ts:14` — WebSocket token still reads from localStorage
```
const token = localStorage.getItem("token");
```
**Problem:** After migrating to httpOnly cookies, the WebSocket client still reads JWT from `localStorage` to authenticate the WS connection.
**Fix:** Use the auth cookie instead. Since WS can't read httpOnly cookies from JS, the server-side WS auth should extract token from `req.headers.cookie` on upgrade. Then the client just connects without sending a token manually.

---

### 2. `app/src/lib/store/auth.ts:7` — `token` field in state is unused
```ts
interface AuthState {
  token: string | null;  // ← stored in memory after login but never read
```
**Problem:** After removing `zustand/persist`, the `token` is stored in React state memory but never used by any consumer. Calls to `login/register/googleAuth` still store `res.token` in state. This is dead code that could confuse developers.
**Fix:** Remove `token` from `AuthState` and all `set({ token: res.token })` calls.

---

## 🟠 High

### 3. `backend/src/lib/websocket.ts:129` — Direct `jwt.verify` bypasses central `verifyToken`
```ts
const payload = jwt.verify(msg.token, env.jwt.secret) as { userId: string };
```
**Problem:** WebSocket auth bypasses the centralized `verifyToken` from `lib/jwt.ts`. If JWT verification logic changes (e.g., algorithm enforcement, audience check), WS won't pick up the change.
**Fix:** Import and use `verifyToken` from `src/lib/jwt` instead of raw `jwt.verify`.

---

### 4. `dashboard/src/app/login/page.tsx` — No client-side password minLength
**Problem:** The login page password input has no `minLength` constraint. Backend enforces 8 chars on register but there's no UX feedback until the server rejects.
**Fix:** Add `minLength={8}` on the password input, matching `auth.schema.ts`.

---

### 5. `backend/src/seed.ts` (1372 lines) — Massively bloated
**Problem:** The seed file is 1372 lines. It contains the full AI generation prompt (400+ lines) duplicated from `ai.service.ts`. This DRY violation makes prompt changes require two edits.
**Fix:** Export the prompt from `ai.service.ts` or move it to a shared file. Seed should import, not duplicate.

---

### 6. `backend/src/lib/transform.ts:39` — Unsafe `JSON.parse`
```ts
content: JSON.parse(node.content) as string[]
```
**Problem:** If `node.content` is already a parsed array (e.g., after a programmatic update via API), `JSON.parse` will throw. The database schema stores content as `String?` (text), but the service sometimes passes already-parsed data.
**Fix:** Wrap in try-catch or check `typeof node.content === 'string'` before parsing. Consider using `Prisma.Json` type instead.

---

### 7. `backend/src/modules/quiz/quiz.service.ts:70,119` — `JSON.parse(JSON.stringify(...))` hack
```ts
answers: JSON.parse(JSON.stringify(input.answers))
```
**Problem:** Used as a deep-clone workaround. This loses `undefined` values, throws on circular references, and is wasteful.
**Fix:** Use `structuredClone(input.answers)` (Node 17+).

---

### 8. `backend/src/modules/categories/categories.service.ts` — No real DB table for categories
**Problem:** Categories are derived from `Module.groupBy({ by: ["category"] })`. The CRUD endpoints (`create`, `update`, `remove`) manipulate the `category` field on `Module` records. Creating a category without any module using it is a no-op. Updating a category renames it across all modules. This is fragile — if a category rename fails partway, modules may have mixed category names.
**Fix:** Create a proper `Category` model in Prisma schema with a foreign key from `Module`.

---

### 9. `backend/src/modules/progress/progress.service.ts` — Duplicated grouping logic
**Problem:** `getAll()` (lines 19-24) and `getContinueLearning()` (lines 132-137) have identical code for grouping progress entries by `moduleId`.
**Fix:** Extract `groupProgressByModule(entries)` helper.

---

### 10. `dashboard/src/hooks/useAdmin.ts` — Extensive `any` types
**Problem:** All functions use `any` implicitly via return types from `api.get()`. No TypeScript safety on API responses. Examples: `res.data.data`, `paymentsRes.data`, `res.data.modules`.
**Fix:** Define proper TypeScript interfaces for each API response type.

---

## 🟡 Medium

### 11. `backend/src/modules/categories/categories.routes.ts:13` — `GET /:id` auth-only, not admin
```
router.get("/:id", authenticate, CategoriesController.getById);
```
**Problem:** Any authenticated user can view category details (including the list of modules in that category). May be intentional but should be documented or locked to admin.

---

### 12. `backend/src/modules/payments/payments.routes.ts:7` — Webhook endpoint has no auth
```
router.post("/webhook", PaymentsController.handleWebhook);
```
**Problem:** The webhook is correctly public (no auth) because LS sends the signature header. However, there's no IP whitelist for LS webhook IPs. The HMAC verification protects against tampering, but an attacker could still cause processing overhead.
**Fix:** Add optional IP whitelist check for LemonSqueezy webhook IPs (documented at https://docs.lemonsqueezy.com/help/webhooks#ip-addresses).

---

### 13. `backend/src/modules/payments/payments.service.ts:6` — `resolvePlanType` is fragile
```ts
if (name.includes("lifetime")) return "LIFETIME";
```
**Problem:** Relies on string matching against variant names. If a variant is renamed in LemonSqueezy, the plan type resolution silently defaults to "MONTHLY".
**Fix:** Use LS variant `payments` or `interval` field from the webhook payload instead of name parsing.

---

### 14. `backend/src/app.ts` — No HSTS in production
```ts
helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  ...
})
```
**Problem:** Helmet is configured but HSTS is not enabled. Production should enforce HTTPS via Strict-Transport-Security header.
**Fix:** Add `hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }` to helmet config.

---

### 15. No CSRF protection
**Problem:** The app relies on `sameSite: "lax"` + CORS whitelist + httpOnly cookies for CSRF protection. While this covers most scenarios, there's no CSRF token for state-changing requests.
**Fix:** For higher sensitivity (payment endpoints), implement CSRF token pattern or use `sameSite: "strict"`.

---

### 16. `backend/src/modules/modules/modules.routes.ts` — No validation on create/update
**Problem:** `validate(createModuleSchema)` is not applied on POST/PATCH routes. The controller passes `req.body` directly to the service.
**Fix:** Apply Zod validation middleware on admin create/update routes.

---

### 17. `app/src/lib/progress.ts` — localStorage for progress
**Problem:** Module progress is synced to server AND cached in localStorage (`1section_progress_v3`). The local cache can become stale if the user uses multiple devices.
**Fix:** Add a sync check — compare `lastReadAt` with server on app load and prefer server data.

---

### 18. `backend/src/modules/ai/ai.service.ts` — API key in URL query string
```ts
fetch(`${GEMINI_URL}?key=${env.gemini.apiKey}`, ...)
```
**Problem:** While this is how Google Gemini API works (API key in query string), it could be logged by proxies/CDNs. Acceptable for Gemini but should be noted.
**Fix:** Use `X-Goog-Api-Key` header if supported, or add a log scrubber.

---

### 19. `backend/src/index.ts:9-22` — `validateEnv` only runs in production
**Problem:** `env.ts` already throws on missing `JWT_SECRET` regardless of environment. But `validateEnv` checks other vars only in production. Developers might miss missing `GOOGLE_CLIENT_ID` in dev until they try Google login.
**Fix:** Run `validateEnv` always (or at least warn in dev).

---

### 20. `app/src/lib/api/auth.ts` — No type safety on API responses
**Problem:** All `authApi` functions return `Promise<any>` via axios. No TypeScript type safety.
**Fix:** Add typed interfaces for all auth API responses.

---

## 🟢 Low

### 21. `backend/src/seed.ts:62` — Admin password printed to console
```ts
console.log(`Admin password: ${adminSeedPassword}`);
```
**Problem:** The seed script logs the admin password to stdout. In CI/CD or shared terminal, this leaks the password.
**Fix:** Only log if `NODE_ENV === "development"` and mask the password.

---

### 22. `dashboard/src/lib/auth.ts` — No token field in state (good) but login still depends on cookie
**Problem:** The dashboard login depends entirely on httpOnly cookies. If the cookie doesn't set properly (e.g., different domain), login succeeds but subsequent requests fail with 401. The error handling redirects to `/login` on 401 which is acceptable.

---

### 23. `backend/src/modules/reflections/reflections.service.ts` — Uses `prisma.reflection.findFirst` without ordering
**Problem:** `findFirst` without `orderBy` returns an unpredictable record (depends on DB). Should always specify order.

---

### 24. `backend/src/modules/notebooks/notebooks.service.ts` — Same `findFirst` issue
**Problem:** Same pattern — `findFirst` without `orderBy` in some queries.

---

### 25. `backend/src/modules/actions/actions.service.ts` — Same pattern
**Problem:** Same issue with `findFirst` without ordering.

---

### 26. `three@^0.128.0` — Very old dependency in app
**Problem:** `three` is pinned to a very old version (0.128.0 from 2021). Used by `vanta`. Consider upgrading or removing unused Vanta dependency.

---

### 27. `dashboard/src/components/ModuleForm.tsx` — Missing aria labels
**Problem:** Toggle buttons, input fields, and interactive elements lack `aria-label` attributes. Accessibility concern.

---

### 28. No `dashboard/.env.example` file
**Problem:** Dashboard has no `.env.example` showing `NEXT_PUBLIC_API_URL` is required. Developers have to read the code to know.

---

### 29. `backend/src/modules/modules/modules.service.ts` — `list()` cache key includes `userId`
**Problem:** `listCacheParams` includes `userId` in cache key parameters (line 46), but `shouldCache` is false when `userId` is present (line 137). The unused `userId` param in `listCacheParams` is dead code.

---

### 30. `app/src/lib/progress.ts` — Local storage key is `1section_progress_v3` with no migration plan
**Problem:** If the data format changes (`v4`), old data will be parsed but fields may be missing. No migration handling for local cache format.
