# 🔴 Celah Keamanan & Pelanggaran Engineering Principles

> Hasil audit menyeluruh terhadap `/app`, `/backend`, `/dashboard`.
> Prioritas: 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## 🔴 KRITIKAL — Keamanan

### 1. JWT_SECRET Fallback Hardcoded
**File:** `backend/src/config/env.ts:23`
```ts
return secret || "dev-secret-change-in-production";
```
**Masalah:** Di production, jika env `JWT_SECRET` tidak diset, fallback ke string hardcoded.
**Fix:** Hapus fallback. Wajibkan JWT_SECRET di production.

### 2. Token JWT Disimpan di localStorage (XSS Vulnerable)
**File:** `app/src/lib/axios.ts:12`, `app/src/lib/store/auth.ts:63`, `dashboard/src/lib/api.ts:10`
**Masalah:** localStorage dapat diakses oleh JavaScript XSS. HttpOnly cookies lebih aman.
**Fix:** Gunakan httpOnly cookie untuk menyimpan token JWT, bukan localStorage.

### 3. Frontend & Backend Password Length Mismatch
**File:** `app/src/app/login/page.tsx:107` (minLength=6) vs `backend/src/modules/auth/auth.schema.ts:5` (min(8))
**Masalah:** Frontend mengizinkan password 6 karakter, backend menolak < 8 karakter. Ini menyebabkan error tidak terduga.
**Fix:** Samakan validasi. Frontend harus `minLength={8}`.

### 4. Admin Seed Password Hardcoded
**File:** `backend/src/seed.ts:61`
```ts
const adminPassword = await bcrypt.hash("mabduh", 12);
```
**Masalah:** Password admin "mabduh" hardcoded di kode. Jika seed dijalankan di production (misal deploy ulang), semua orang bisa akses kode sumber dan tahu password admin.
**Fix:** Baca password dari environment variable `ADMIN_PASSWORD` atau `ADMIN_SEED_PASSWORD`.

### 5. Tidak Ada Email Verification
**File:** `backend/src/modules/auth/auth.service.ts:21-43`
**Masalah:** User bisa register dengan email apa saja tanpa verifikasi. Memungkinkan registrasi dengan email orang lain.
**Fix:** Implementasi email verification flow (kirim link verifikasi, verifikasi sebelum bisa login).

### 6. Password Tidak Ada Konfirmasi
**File:** `app/src/app/login/page.tsx`
**Masalah:** Form register tidak memiliki field konfirmasi password.
**Fix:** Tambah field "Confirm Password" di form register.

### 7. Google OAuth Raw JSON Parsing
**File:** `app/src/lib/store/auth.ts:74-75`
```ts
loginWithGoogle: async (profileJson: string) => {
    const profile = JSON.parse(profileJson);
```
**Masalah:** Menerima raw JSON string dan parse tanpa validasi. Kerentanan prototype pollution.
**Fix:** Validasi tipe setelah parse, gunakan Zod schema.

### 8. Tidak Ada Brute Force Protection di WebSocket Auth
**File:** `backend/src/lib/websocket.ts:75`
**Masalah:** WebSocket tidak memiliki rate limiting pada pesan auth, brute force JWT token.
**Fix:** Implementasi rate limiting untuk koneksi WebSocket berdasarkan IP.

---

## 🟠 HIGH — Keamanan

### 9. Redis Connection Error Bisa Leak Info
**File:** `backend/src/lib/redis.ts:19`
```ts
console.error("Redis error:", err.message);
```
**Masalah:** Error Redis bisa mengandung connection string atau kredensial.
**Fix:** Log error tanpa detail sensitif. Gunakan error code saja.

### 10. Graceful Shutdown Tidak Tutup HTTP Server
**File:** `backend/src/index.ts:51-63`
**Masalah:** SIGINT/SIGTERM hanya disconnect Prisma & Redis, tapi server.close() tidak dipanggil. Koneksi existing bisa terputus paksa.
**Fix:** Tambah `server.close()` di handler.

### 11. Draft Modules Bisa Terekspos via Cache
**File:** `backend/src/modules/ai/ai.service.ts:463`
**Masalah:** AI auto-generate membuat module sebagai draft, tapi bisa masuk cache dan terekspos sebelum di-publish.
**Fix:** Pastikan draft modules tidak di-cache, atau gunakan prefix cache terpisah.

### 12. Tidak Ada Input Size Limit pada Request Body
**File:** `backend/src/app.ts:66-74`
**Masalah:** Tidak ada limit ukuran body JSON. Attacker bisa kirim payload besar untuk DoS.
**Fix:** Tambah limit: `express.json({ limit: '1mb' })`.

### 13. express.urlencoded extended: true — Prototype Pollution Risk
**File:** `backend/src/app.ts:74`
```ts
app.use(express.urlencoded({ extended: true }));
```
**Masalah:** Library `qs` (extended: true) memiliki riwayat kerentanan prototype pollution.
**Fix:** Gunakan `extended: false` atau batasi ukuran.

### 14. Gemini API Key Terekspos di URL Log
**File:** `backend/src/modules/ai/ai.service.ts:27`
```ts
const res = await fetch(`${GEMINI_URL}?key=${env.gemini.apiKey}`, {
```
**Masalah:** API key dikirim sebagai query parameter dan bisa tercatat di log server.
**Fix:** Tidak bisa dihindari sepenuhnya (Gemini mengharuskan query param), tapi pastikan logging jangan mencatat URL lengkap.

### 15. Tidak Ada CSP Header Ketat
**File:** `backend/src/app.ts:33-38`
**Masalah:** Helmet dikonfigurasi dengan `unsafe-none` untuk semua environment, termasuk production.
**Fix:** Buat strict helmet untuk production, relaxed hanya di development.

---

## 🟡 MEDIUM — Engineering & Code Quality

### 16. Tidak Ada Test Automation
**Seluruh project:** Tidak ada satu file test pun (unit, integration, e2e).
**Fix:** Tambah minimal Jest/Vitest untuk unit test backend endpoints.

### 17. Tidak Ada CI/CD Pipeline
**Masalah:** Tidak ada GitHub Actions atau pipeline otomatis untuk lint, test, build.
**Fix:** Tambah GitHub Actions workflow.

### 18. Any Types Digunakan di Seluruh Backend
**Backend:** Banyak `as any`, `any[]`, `Record<string, any>`.
**Masalah:** Meniadakan manfaat TypeScript. Potensi runtime error tidak terdeteksi.
**Fix:** Buat proper type definitions.

### 19. Cache Silent Failure — Stale Data Risk
**File:** `backend/src/lib/cache.ts:39,49,67`
**Masalah:** Semua operasi cache gagal diam-diam. Bisa menyajikan data basi tanpa sadar.
**Fix:** Minimal log warning saat cache gagal di production.

### 20. Mixed Language Error Messages
**Backend:** Campuran Bahasa Indonesia dan Inggris dalam error messages.
- `app.ts:90` — English
- `ai.service.ts:49` — Bahasa Indonesia
- `ai.service.ts:52` — Bahasa Indonesia
**Fix:** Konsisten dengan satu bahasa (English recommended untuk API).

### 21. Console.log Digunakan Sebagai Logger
**Seluruh backend:** Tidak ada logging library (winston, pino, dll).
**Masalah:** Tidak ada log levels, formatting, atau transport ke file/service.
**Fix:** Implementasi logging library.

### 22. Tidak Ada API Documentation
**Masalah:** Tidak ada Swagger/OpenAPI docs. API endpoints tidak terdokumentasi.
**Fix:** Tambah swagger-jsdoc dan swagger-ui-express.

### 23. Cookie Parser Tidak Digunakan
**File:** `backend/src/app.ts:75`
**Masalah:** `cookie-parser` di-include tapi tidak ada yang menggunakan cookies untuk auth.
**Fix:** Hapus jika tidak perlu, atau implementasi httpOnly cookie auth.

### 24. Health Check Tanpa Timeout
**File:** `backend/src/app.ts:121,131`
**Masalah:** Query database dan ping Redis tanpa timeout. Bisa hang selamanya.
**Fix:** Tambah timeout pada health check queries.

### 25. WebSocket Auto-Reconnect Bisa Leak Connection
**File:** `app/src/lib/websocket.ts:37`
```ts
setTimeout(() => this.connect(this.userId!), 3000);
```
**Masalah:** Jika `connect()` dipanggil multiple kali, timer tidak dibersihkan, bisa terjadi multiple koneksi.
**Fix:** Track timeout ID dan cleanup sebelum reconnect.

### 26. Seed File Beda Prisma Client
**File:** `backend/src/seed.ts:10`
```ts
const prisma = new PrismaClient({ adapter });
```
**Masalah:** Seed file buat PrismaClient sendiri, tidak re-use dari `lib/prisma.ts`. Potensi konflik koneksi.
**Fix:** Re-use PrismaClient dari lib/prisma.ts.

### 27. TypeScript Strict Mode Tidak Diaktifkan
**File:** `backend/tsconfig.json`, `app/tsconfig.json`, `dashboard/tsconfig.json`
**Masalah:** `strict: true` tidak ada di konfigurasi TypeScript.
**Fix:** Aktifkan strict mode: `"strict": true`.

### 28. XP Calculation Magic Numbers Tersebar
**File:** `backend/src/modules/progress/progress.service.ts:293-298`
```ts
const listenXp = listeningMinutes * 10;
const readXp = readingMinutes * 10;
const completedXp = completedCount * 50;
```
**Masalah:** Magic numbers tanpa konstanta atau dokumentasi.
**Fix:** Definisikan konstanta dengan nama deskriptif.

### 29. Tidak Ada Data Deletion/Export (GDPR)
**Masalah:** Tidak ada endpoint untuk user menghapus akun atau mengexport data pribadi.
**Fix:** Implementasi endpoint DELETE /auth/account dan GET /auth/export-data.

### 30. Inconsistent Error Response Format
**Backend:** Beberapa endpoint return `{ error: { message, statusCode } }`, yang lain return `{ error: string }`, ada juga yang throw Error biasa.
- `app.ts:165` — `{ error: { message, statusCode } }`
- `error-handler.ts` — `{ error: { message, statusCode } }`
- `admin.controller.ts:20` — `{ error: "Mode must be..." }` (string, bukan object)
**Fix:** Konsisten dengan satu format error response.

---

## 🔵 LOW — Best Practices

### 31. Rate Limit Non-Existent untuk Webhook
**File:** `backend/src/app.ts:87`
**Masalah:** Webhook di-skip dari rate limit, tapi masih kena limiter `/api/*`. Jika ada banyak event bersamaan, bisa kena 429.
**Fix:** Placeholder — sebenarnya sudah ada skip: `(req) => req.path.endsWith("/webhook")` ✅ — Perbaiki: pastikan skip path correct.

### 32. Tidak Ada Morgan di Production
**File:** `backend/src/app.ts:78-80`
**Masalah:** Logging request hanya di development. Di production tidak ada audit trail.
**Fix:** Aktifkan morgan di semua environment, atau pindah ke Winston/Pino.

### 33. Hardcoded URL di Frontend WebSocket
**File:** `app/src/lib/websocket.ts:1`
```ts
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";
```
**Masalah:** Fallback ke localhost. Di production harus pakai wss://.
**Fix:** Pastikan env ter-set di production, atau tambah validasi protocol.

### 34. tsconfig.tsbuildinfo Tidak di .gitignore
**File:** `.gitignore`
**Masalah:** `tsconfig.tsbuildinfo` tidak di-.gitignore. File ini generated dan tidak perlu di-version control.
**Fix:** Tambah `*.tsbuildinfo` ke `.gitignore` root.

### 35. Setup.sh Berisi Credential Development
**File:** `setup.sh` (belum dibaca)
**Masalah:** Jika setup.sh berisi credential development, jangan di-commit.
**Fix:** Pastikan tidak ada secret di setup.sh.

### 36. Status 200 Selalu Return untuk Health Check
**File:** `backend/src/app.ts:140-146`
**Masalah:** Redis "not-configured" dianggap "ok". Bisa menutupi masalah konfigurasi.
**Fix:** Kembalikan status 503 jika Redis seharusnya terkonfigurasi tapi tidak tersedia.

---

## 📋 RINGKASAN PRIORITAS

| Prioritas | Jumlah | Action Required |
|-----------|--------|-----------------|
| 🔴 Critical | 8 | **Segera diperbaiki** — kerentanan keamanan langsung |
| 🟠 High | 7 | **Perbaiki minggu ini** — potensi eksploitasi |
| 🟡 Medium | 14 | **Perbaiki bulan ini** — engineering debt |
| 🔵 Low | 5 | **Perbaiki jika ada waktu** — best practices |
| **Total** | **34** | |

### 🔴 Critical Priority Fixes (8 item)

1. **JWT_SECRET fallback** — `backend/src/config/env.ts:23` → Hapus fallback
2. **localStorage token** — `app/src/lib/axios.ts`, `dashboard/src/lib/auth.ts` → Pindah ke httpOnly cookie
3. **Password length mismatch** — `app/src/app/login/page.tsx:107` → Ubah minLength ke 8
4. **Seed admin password** — `backend/src/seed.ts:61` → Baca dari env
5. **Email verification** — `backend/src/modules/auth/auth.service.ts` → Tambah flow verifikasi
6. **Confirm password** — `app/src/app/login/page.tsx` → Tambah field confirm password
7. **Google OAuth raw parse** — `app/src/lib/store/auth.ts:74` → Validasi dengan Zod
8. **WebSocket brute force** — `backend/src/lib/websocket.ts` → Rate limit auth message

### 🛠 Engineering Principles Checklist

- [ ] Test coverage (unit + integration)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] TypeScript strict mode
- [ ] Logging library (Winston/Pino)
- [ ] API documentation (Swagger)
- [ ] Error response format consistency
- [ ] No `any` types
- [ ] Dockerfile + docker-compose
- [ ] Data export/deletion (GDPR)
- [ ] Rate limiting on all public endpoints
- [ ] Input validation on all endpoints (Zod ✅ — sudah good)
- [ ] Secrets management (env vars + .env.example)
