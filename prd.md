# 1section — Product Requirements Document

## 1. Product Overview

Aplikasi web **"1section"** — perpustakaan mental model interaktif dengan audio narration, knowledge graph, quiz, reflection, dan action planning.

**Tagline**: *"A thinking library of mental models, audio lessons, and knowledge graphs."*

---

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 + CSS Variables (dark/light mode) |
| UI Components | Lucide icons, Framer Motion, Embla Carousel, Recharts |
| State | Zustand (store), TanStack React Query, Context API |
| Backend | Express + Prisma + PostgreSQL |
| Auth | Email/password (JWT) + Google OAuth |
| Payments | Lemon Squeezy (webhook-based) |
| AI | Google Generative AI (Gemini) |
| Caching | Redis |
| Container | Docker (docker-compose.yml) |

---

## 3. Database Schema (Prisma — PostgreSQL)

### 3.1 Core Entities

**User**
- `id` String @id @default(cuid())
- `email` String @unique
- `passwordHash` String?
- `name` String?
- `avatar` String?
- `googleId` String? @unique
- `lsCustomerId` String? @unique
- `lsSubscriptionId` String? @unique
- `subscriptionStatus` SubscriptionStatus @default(FREE)
- `subscriptionEnd` DateTime?
- `streakCount` Int @default(0)
- `lastActiveDate` DateTime?
- `preferredCategories` String[]
- Relations: progress, reflections, highlights, favorites, quizAttempts, actionPlans, payments, reviews

**Module**
- `id`, `slug` (unique), `title`, `description`, `category`, `content` (markdown)
- `isPremium` Boolean @default(true), `isDraft` Boolean @default(true)
- Relations: nodes, edges, questions, progress, reflections, highlights, favorites, quizAttempts, actionPlans, reviews

**ModuleNode** (knowledge graph nodes)
- `id`, `moduleId`, `positionX`/`positionY` Float
- `label`, `description?`, `type` @default("custom"), `style` JSON?

**ModuleEdge** (knowledge graph connections)
- `id`, `moduleId`, `source`, `target`, `label?`, `animated` @default(true)

**Question** (quiz)
- `id`, `moduleId`, `question`, `options` (JSON string[]), `correctAnswer` Int, `explanation`

### 3.2 User Content

**UserProgress** (per-module progress)
- `userId` + `moduleId` unique
- `listeningProgress` Float, `readingProgress` Float
- `scrollPosition` Float, `currentCharIndex` Int
- `audioRate` Float, `completed` Boolean

**Reflection** — userId, moduleId, title, content, timestamp

**Highlight** — userId, moduleId, text, note, timestamp

**Favorite** — userId + moduleId unique

**QuizAttempt** — userId, moduleId, score, totalQuestions, percentage, status (IN_PROGRESS/COMPLETED), answers (JSON), currentQuestion?

**ActionPlan** — userId + moduleId unique, title, content (JSON matrix rows), completed

**Review** — userId, moduleId?, rating Int, comment

### 3.3 Payments

**Payment** — userId, lsOrderId (unique), lsSubscriptionId?, amount, currency, status (PENDING/SUCCEEDED/FAILED/REFUNDED), planType

**LemonSqueezyEvent** — id, type, processed Boolean, payload JSON (raw webhook)

---

## 4. Routes & Pages

### 4.1 Public & Auth

| Route | Halaman |
|---|---|
| `/` | Landing page — hero, features, pricing (Monthly $9/Yr $49), testimonials, FAQ, email subscribe |
| `/login` | Login/Register — email/password + Google OAuth, animated toggle |
| `/preferences` | Category preferences picker (22 categories) — first-login redirect |
| `/payment/success` | Payment success callback — verifies via WebSocket |

### 4.2 Main App (require auth)

| Route | Halaman |
|---|---|
| `/models` | **Library** — search, category filter, pagination, ModuleCard (mini graph preview, progress bars, Start/Path buttons), Continue Learning section, daily free banner |
| `/models/[slug]` | **Module Detail** — markdown reader with TTS audio (word highlighting), scroll sync, highlight popup with notes, floating audio bar, progress tracking, resume prompt, TOC sidebar, mark complete, feedback form |
| `/models/[slug]/path` | **Knowledge Graph Path** — ReactFlow interactive graph, click node to highlight connections, popup (description above + Read/Audio/Quiz/Reflect/Done buttons below), gradient header |
| `/models/[slug]/path/read/[nodeId]` | **Per-Node Reading** — Embla carousel 9:16 cards, slides grouped per node, settings bar (font size, font family, line height, letter spacing, aspect ratio), container query font scaling, Prev/Next + Quiz/Reflect/Done buttons |
| `/models/[slug]/path/audio/[nodeId]` | **Per-Node Audio** — TTS playback filtered to current node |
| `/models/[slug]/path/quiz/[nodeId]` | **Per-Node Quiz** — contextualized to node label |
| `/models/[slug]/path/reflection/[nodeId]` | **Per-Node Reflection** — submit with node context |
| `/models/[slug]/quiz` | **Module Quiz** — progress auto-save, resume, multiple choice, submit, score breakdown |
| `/models/[slug]/reflection` | **Module Reflection** — textarea (5000 char limit), char counter, save, history list with delete |
| `/models/[slug]/action` | **Action Plan** — matrix generator (text/checkbox/slider/radio), AI auto-generate, manual edit, save/delete/toggle complete |

### 4.3 Dashboard & Collections

| Route | Halaman |
|---|---|
| `/dashboard` | **Dashboard** — greeting, stats grid (listened min, read min, completed, reflections, highlights, quizzes), streak bar, XP/rank system, category pie chart, recent activity, recommended modules |
| `/favorites` | **Favorites** — bookmarked ModuleCard list, search, pagination |
| `/highlights` | **Highlights** — saved highlights with inline note editing, search, pagination |
| `/reflections` | **Reflections** — journal entries list with delete, search, pagination |
| `/actions` | **Action Plans** — list with expandable matrix, toggle complete, delete |

### 4.4 Account & Admin

| Route | Halaman |
|---|---|
| `/manage` | **Subscription** — plan info (MONTHLY/YEARLY/LIFETIME), payment history table, cancel, customer portal link |
| `/dashboard` (separate app) | **Admin Dashboard** — modules CRUD + content editor, AI auto-generate (title → full module), categories, coupon codes, feedback viewer |

---

## 5. Features Detail

### 5.1 Learning Path (Knowledge Graph)
- ReactFlow-based interactive directed graph
- Node click → highlight connected nodes/edges, dim others
- Popup (transparent, backdrop-blur): description above node, buttons grid below
- Arrow indicator connecting popup to node
- Dedicated gradient background on first node
- Edge labels on connections

### 5.2 Per-Node Reading (Carousel)
- Embla Carousel with 9:16 portrait cards
- `container-type: inline-size` + `cqi` font units → font scales with container width
- Settings bar (fixed bottom): Type (font size), CaseSensitive (font family), ArrowUpDown (line height), ArrowLeftRight (letter spacing), Maximize (aspect ratio: 9:16 / 3:4)
- Arrow buttons outside card (`-left-4`/`-right-4`)
- Slide progress dots, module+node title on first slide only
- Responsive width: `max-w-[280px]` mobile → `lg:max-w-[480px]` desktop

### 5.3 TTS Audio System
- Custom `useTTS` hook — browser SpeechSynthesis API
- Word-level highlighting while playing
- Floating bar: play/pause, progress slider, voice selector, rate, volume
- Progress auto-save every 2 seconds while playing
- Resume from saved position on revisit

### 5.4 Quiz System
- Multiple choice questions per module
- Progress auto-save (saves answers + current question index)
- Resume from where left off
- Submit → score, percentage, per-question result (correct/wrong + explanation)

### 5.5 Action Plan
- Dynamic matrix form: rows with type (text, checkbox, slider, radio)
- AI generation via Google Gemini (prompt: module content → structured action items)
- Manual add/remove rows via modal picker
- Edit inline, toggle applied state, delete plan

### 5.6 XP & Gamification
- **XP Sources**: listening, reading, completing module, reflections, highlights, quizzes, streak
- **Rank system**: 15 levels (Novice → Grandmaster Thinker) with XP thresholds
- **Streak**: daily tracking, reset cron at midnight, popup celebration, 30-day goal progress bar

### 5.7 Subscription (Lemon Squeezy)
- Plans: Monthly ($9), Yearly ($49), Lifetime ($199)
- Checkout via Lemon Squeezy hosted page
- Webhook events: order_created, subscription_created/updated/cancelled
- Daily free module (deterministic hash-based) for non-subscribers
- Customer portal for self-serve cancellation
- Payment history on manage page

### 5.8 Admin Dashboard (separate app)
- Full module CRUD — create, edit content (markdown), publish/draft, set premium
- AI auto-generate: input title → Gemini generates description, content, nodes, edges, questions
- Category management with metadata
- Coupon code creation
- User feedback viewer (ratings + comments)

---

## 6. Component Architecture

| Component | File | Deskripsi |
|---|---|---|
| `MainLayout` | `components/MainLayout.tsx` | Root `h-dvh` flex container + Navbar + `overflow-y-auto` main |
| `Navbar` | `components/Navbar.tsx` | Sticky top nav with links + mobile bottom nav (6 icons) |
| `ModuleCard` | `components/ModuleCard.tsx` | Card with mini graph (ReactFlow), gradient overlay, Start/Path/Bookmark |
| `ModuleFloatingBar` | `components/ModuleFloatingBar.tsx` | Fixed bottom audio player (play, progress, voice, rate, volume, favorite) |
| `TableOfContents` | `components/TableOfContents.tsx` | Slide-in sidebar TOC with heading links |
| `ReadingSettingsPopup` | `components/ReadingSettingsPopup.tsx` | Font/size/spacing settings (legacy, replaced by inline settings bar) |
| `PageHeader` | `components/PageHeader.tsx` | Reusable header with search input |
| `Pagination` | `components/Pagination.tsx` | Reusable pagination with prev/next |
| `UserPopup` | `components/UserPopup.tsx` | User dropdown: subscription badge, Manage, Logout |
| `GoogleLoginButton` | `components/GoogleLoginButton.tsx` | Google OAuth one-tap + button |

---

## 7. Design System

- **Dark-first**: default `bg: #0a0a0a`, `text: #fff`
- **CSS Variables**: `--bg`, `--bg-card`, `--bg-elevated`, `--bg-input`, `--text`, `--text-secondary`, `--muted`, `--muted-light`, `--muted-dark`, `--border`, `--border-light`, `--border-subtle`
- **Light mode**: `[data-theme="light"]` swaps all variables
- **Category colors**: `--color-c-{category}` — 40+ unique colors for badges and accents
- **Typography**: Inter (body 14px mobile / 16px desktop), Outfit (headings)
- **Card ratio**: 9:16 portrait for reading carousel, 3:4 alt option
- **Effects**: glassmorphism (`backdrop-blur-md`, `bg-*/10`), subtle borders, smooth transitions
- **Spacing**: Tailwind default scale, rounded-2xl/3xl for cards

---

## 8. Backend API Architecture

Modular Express app at `backend/`:

| Module | Endpoints | Purpose |
|---|---|---|
| `auth` | POST register, login, google; GET me; PATCH preferences | Authentication & user management |
| `modules` | GET list, bySlug, dailyFreeSlug, categories | Module content delivery |
| `progress` | GET byModule, POST upsert; GET history | Per-module user progress |
| `quiz` | GET questions; POST submit; GET progress | Quiz engine |
| `reflections` | GET list, POST create, DELETE | User reflections CRUD |
| `highlights` | GET list, POST create, PATCH update, DELETE | Text highlights with notes |
| `favorites` | GET list, POST add, DELETE remove, GET check | Module bookmarking |
| `actions` | GET list, GET byModule, POST create, PATCH update, DELETE | Action plans |
| `reviews` | POST create, GET byModule, GET dashboard | Ratings & feedback |
| `payments` | POST checkout; GET subscription/history; POST webhook/portal/cancel | Lemon Squeezy integration |
| `admin` | CRUD modules, POST ai-generate, manage categories/coupons, GET feedback | Admin dashboard API |
| `ai` | POST generate-module | Google Gemini content generation |

**Middleware**: JWT auth, role-based admin, error handler, request validation (Zod)

---

## 9. Data Flow

```
User → Browser → Next.js (App Router) → TanStack Query → Axios → Express API → Prisma → PostgreSQL
                                                ↓
                                           Redis Cache (modules list, daily free)
                                                ↓
                                        WebSocket (payment verification)
```

- **Auth**: JWT token stored in localStorage, sent via Authorization header
- **Caching**: Redis caches module lists, categories, daily free slug (TTL 24h)
- **Payments**: Lemon Squeezy webhooks → Express → update user subscription + create Payment record
- **Progress**: Auto-save via debounced (2s listen / 1s scroll) POST requests
- **Admin**: Separate Next.js app (`dashboard/`) hitting same Express API

---

## 10. Current Status

### ✅ Done
- Landing page, auth (email + Google), preferences onboarding
- Module library with search/filter/pagination/category colors
- Module detail with markdown reader + TTS (word highlighting)
- Knowledge graph path with node interaction/popups
- Per-node read (Embla carousel, 9:16 card, settings bar, aspect ratio)
- Per-node audio (TTS filtered per node)
- Per-node quiz & reflection pages
- Module-level quiz (progress save, resume, submit)
- Module-level reflection (textarea, history, delete)
- Action plan (matrix, AI generate, edit, delete)
- Dashboard (stats, XP, streak, rank, chart, recommendations)
- Favorites, highlights, reflections, actions list pages
- Subscription (Lemon Squeezy checkout, webhooks, manage, cancel)
- Admin dashboard (CRUD modules, AI generate, categories, feedback)
- Redis caching, Docker setup

### 🔴 Blocked
- Backend returns empty `content` for premium modules when unauthenticated → dummy content used as fallback

### 🔜 Next
- Verify scroll behavior on all pages (path, model detail, library)
- Mobile responsive refinements
- Better loading states

---

## 11. Key Design Decisions

- `h-dvh` on MainLayout for definite flex container height → `flex-1` + `h-full` on children works correctly
- `cqi` font units for carousel → text scales proportionally with card width
- Module-level quiz questions (API doesn't support per-node questions), contextualized by node label
- Deterministic daily free module (date-based hash) for consistent UX without backend state
- Separate admin dashboard app for security isolation
- WebSocket for real-time payment verification instead of polling
