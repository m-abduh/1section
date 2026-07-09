# Security Audit — Semua Temuan

## 🔴🔴🔴 KRITIS — WebSocket token di URL query string

**Lokasi:** `backend/src/lib/websocket.ts:63`, `app/src/lib/websocket.ts:18`

WebSocket menerima JWT token via query string `?token=xxx`. Ini berbahaya karena:
- Query string dicatat (logged) oleh几乎所有 reverse proxy (Nginx, Caddy, HAProxy, ELB)
- Muncul di `req.url` yang mungkin masuk ke access log server
- Muncul di `Referer` header jika ada redirect

**Perbaikan:** Gunakan protocol WebSocket dengan header Authorization (tidak semua WS library support), atau kirim token sebagai message pertama setelah koneksi terbuka (challenge-response), atau gunakan cookie httpOnly yang dikirim otomatis oleh browser.

---

## 🔴 KRITIS — QuizAttempt upsert dengan empty string ID

**Lokasi:** `backend/src/modules/quiz/quiz.service.ts:66`

```ts
where: { id: existing?.id ?? "" },
```

Jika `existing` null (tidak ada attempt IN_PROGRESS), `upsert` akan mencari ID `""` (pasti tidak ditemukan), lalu **create** dengan ID kosong. Ini bisa menyebabkan:
- Duplikasi quiz attempt
- Error `P2002` / unique constraint violation
- Data corruption di skor kuis

**Perbaikan:** Pisahkan logic menjadi `if (existing) update else create` atau pakai `findFirst` + `create` manual.

---

## 🔴 — progress.service.ts JSON.parse tanpa try/catch bisa crash stats

**Lokasi:** `backend/src/modules/progress/progress.service.ts:220`

```ts
const content = n.content ? (JSON.parse(n.content) as string[]).join(" ") : "";
```

Jika `n.content` bukan JSON valid (misal karena data corruption atau migration), endpoint `GET /api/progress/stats` akan throw unhandled exception dan return 500.

**Perbaikan:** Bungkus dalam try/catch, return `""` jika parse gagal.

---

## 🟠 — Client ID Google ada di `lib/axios.ts` sebagai env variable publik

Bukan masalah sebenarnya (client ID memang publik by design), tapi perlu dipastikan tidak ada secret lain yang ter-expose.

**Status:** ✅ Tidak ada secret lain yang bocor ke `NEXT_PUBLIC_*`.

---

## 🟠 — JWT disimpan di localStorage (app & dashboard)

**Lokasi:**
- `app/src/lib/axios.ts:12` — `localStorage.getItem("token")`
- `app/src/lib/store/auth.ts` — persist middleware zustand
- `dashboard/src/lib/auth.ts:27` — `localStorage.setItem("admin_token", token)`
- `dashboard/src/lib/api.ts:10` — `localStorage.getItem("admin_token")`

Ini sudah disebut di audit sebelumnya. Untuk "super stable production", migrasi ke httpOnly cookie yang di-set oleh backend diperlukan. Tapi ini refactor besar yang menyentuh frontend login flow, axios interceptor, dan backend response.

---

## 🟠 — Categories `getById` tanpa authorize("ADMIN")

**Lokasi:** `backend/src/modules/categories/categories.routes.ts:13`

```ts
router.get("/:id", authenticate, CategoriesController.getById);
```

Endpoint ini bisa dipanggil user biasa untuk melihat daftar module dalam suatu kategori. Dampak: info disclosure minor (user bisa lihat judul & slug module dalam kategori apapun).

**Perbaikan:** Tidak urgent karena categories bersifat publik, tapi jika ingin strict, tambahkan `authorize("ADMIN")` atau pastikan hanya return data publik.

---

## 🟠 — Partial unique index di QuizAttempt tidak didefinisikan di Prisma schema

**Lokasi:** `backend/prisma/schema.prisma:192-193`

Hanya ada comment, tidak ada definisi index sebenarnya di migration SQL. Kalau migration fresh dijalankan, index ini tidak akan dibuat.

```prisma
// Note: Partial unique index "QuizAttempt_userId_moduleId_in_progress_key" exists via raw SQL:
// CREATE UNIQUE INDEX ON "QuizAttempt"("userId","moduleId") WHERE "status"='IN_PROGRESS'
```

Ini harus dikonversi jadi Prisma migration resmi.

---

## 🟡 — LemonSqueezyEvent.processed tanpa index

Untuk query `findUnique` di webhook handler, hanya `id` yang di-index. Kalau ada ribuan event, lookup by `processed` di cron cleanup akan lambat.

**Severity:** Rendah — webhook lookup pakai `id` yang di-index.

---

## 🟡 — Hitung node content wordCount tidak konsisten

Di `modules.service.ts`, `calculateWordCount` menggunakan `JSON.parse` untuk array of strings. Tapi di seed dan AI service, content disimpan sebagai JSON string. Di progress stats, juga diparse ulang. Overall konsisten — tapi rawan error jika format content berubah.

---

## ✅ SUDAH DI-FIX (dari commit sebelumnya)

| Temuan | Status |
|--------|--------|
| Paywall bypass `?admin=true` | ✅ Fixed — admin flag dari `req.user.role` |
| Google OAuth tanpa verifikasi | ✅ Fixed — `verifyIdToken` via google-auth-library |
| Webhook signature bypass | ✅ Fixed — `!signature || !verify()` |
| Seed.ts tidak idempotent | ✅ Fixed — `upsert` + `deleteMany` |
| `/auth/users` tanpa authorize | ✅ Fixed — added `authorize("ADMIN")` |
| `/payments/history?all=true` | ✅ Fixed — derived dari `req.user.role` |
| `/reviews?all=true` | ✅ Fixed — derived dari `req.user.role` |
| `/ai/*` tanpa authorize | ✅ Fixed — added `authorize("ADMIN")` |
| `/admin/ls-mode` GET tanpa authorize | ✅ Fixed — added `authorize("ADMIN")` |
| timingSafeEqual webhook | ✅ Fixed — `crypto.timingSafeEqual` |
| Dashboard role check | ✅ Fixed — `checkAuth` rejects non-ADMIN |
| Dashboard wrong endpoints | ✅ Fixed — `/auth/users` bukan `/auth/me` |
| Rate limit login | ✅ Fixed — 10 req/menit khusus `/login` |
| `.env.example` | ✅ Fixed — dibuat |
| Env validation production | ✅ Fixed — fail-fast di startup |
| Prisma pool size | ✅ Fixed — `max: 10` eksplisit |
| setup.sh `apt upgrade -y` | ✅ Fixed — dihapus |
| setup.sh `db push --accept-data-loss` | ✅ Fixed — prefer `migrate deploy` |
| Unused deps | ✅ Fixed — `@prisma/client`, `@google/generative-ai`, `react-markdown` dihapus |
| Duplicate postcss config | ✅ Fixed — `postcss.config.js` dihapus |
| `test-ls.mjs` | ✅ Fixed — dihapus + gitignore |
| Indentasi app.ts | ✅ Fixed — rapi |

---

## Ringkasan prioritas sisa

1. **WebSocket token di URL** — paling kritis yang tersisa
2. **QuizAttempt upsert dengan ID kosong** — bisa corrupt data kuis
3. **Progress stats JSON.parse crash** — bisa bikin endpoint stats error 500
4. Categories `getById` tanpa admin check — minor
5. Partial unique index di QuizAttempt tidak terdefinisi di schema — housekeeping
6. Migrasi JWT dari localStorage ke httpOnly cookie — refactor besar, untuk produksi skala besar
