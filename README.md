# MotionMagic AI — Phase 1 + Phase 2

Upload a photo → pick an effect → free watermarked preview → pay (mock) → GIF → secure download.

## Phase 2 effects (all produce real animated GIFs)
| Effect | How it is made | Price |
|---|---|---|
| Flying Hearts | Built-in particle animation (Sharp + FFmpeg) | $0.10 |
| Birthday Celebration | Confetti, balloons, animated name banner | $0.10 |
| Cinematic Zoom | Ken Burns zoom, film grade, letterbox, optional title | $0.10 |
| Neon Glow | Glowing edges, bloom, neon frame, light sweep | $0.10 |
| Cartoon Bounce | AI cartoonize (1 image-edit call) + squash-and-stretch bounce | $0.19 |
| AI Motion (beta, Phase 1) | AI image-to-video | $0.49 |

Only Cartoon Bounce and AI Motion call an AI provider; the other four cost nothing to render.

## Run locally
```bash
cp .env.example .env          # set DATABASE_URL to a Postgres database
npm install
npx prisma db push            # schema changed since Phase 1 (processingStartedAt)
npm run samples               # regenerates public/samples/*.gif (already included)
npm run dev                   # terminal 1: http://localhost:3000
npm run worker                # terminal 2: generation worker
npm run test:effects          # quality + size test (no DB, no AI cost)
```
Requires `ffmpeg` on PATH and the **DejaVu Sans** font (`fonts-dejavu-core` on Debian/Ubuntu) on
every machine that renders text effects. Defaults are `AI_MODE=mock`, `PAYMENT_PROVIDER=mock`, `STORAGE_DRIVER=local`.

## Storage (MVP, no paid R2)
Files live on local disk (`LOCAL_STORAGE_DIR`) and are deleted after `RETENTION_HOURS` (24h) by
`npm run cleanup`. Run the web app and the worker on ONE host with a persistent disk (a small VPS works);
serverless hosts such as Vercel cannot share local disk. The storage interface is unchanged, so R2/S3 can be added later.

## Free previews
`GET /api/generations/:id/sample` renders a 288px watermarked GIF, cached per option set, max 20 fresh renders per
photo, max 2 at once. It animates the ORIGINAL photo even for the AI effect (no AI spend before payment).

## Going live checklist
- Strong `SESSION_SECRET` / `DOWNLOAD_SECRET` (32+ chars; production refuses to start otherwise).
- `AI_MODE=live` + `FAL_KEY`; verify the fal model ids, input schemas and prices (`FAL_EDIT_MODEL`, `FAL_MOTION_MODEL`).
- Implement a real payment provider in `src/services/payment/index.ts`.
- Schedule `npm run cleanup`; keep the worker running.

## Known gaps
No crop UI, no IP-based rate limit, no admin dashboard (Phase 5+), no real payment provider, no guest history page.
The gallery samples use the mock cartoonizer; the real AI look is only visible with `AI_MODE=live`.

## Phase 3: premium AI effects + custom HTML/CSS animations

All eleven effects are now available. How each one moves (shown on every card and in the Studio):

| Effect | Motion style | Needs |
|---|---|---|
| AI Custom Animation (birthday, feast, festival, anything) | AI-designed HTML/CSS animation rendered to GIF | text AI (Gemini/Groq free keys) or free built-in templates |
| Magic Smile, Superhero | AI edit + stylized motion | image AI (`GEMINI_IMAGE_ENABLED=true`, usually paid) |
| Fire Eyes | AI finds eyes + animated flames | vision AI (Groq/Gemini free) |
| Dreamy Clouds, Cartoon Bounce | stylized; AI background/cartoon optional (basic mode, $0.10, without image AI) | none |
| Funny Dance | stylized body motion (not realistic) | none |
| AI Motion (beta) | the only realistic AI motion | `FAL_KEY` (paid) |

Setup on the web and worker hosts: `npm install`, `npx playwright install chromium`, `npx prisma db push`, install the DejaVu font.
Keys go ONLY in the server `.env` (`GEMINI_API_KEY`, `GROQ_API_KEY`, `AI_MODE=live`).

Limits: uploads up to 10 MB (phone photos are shrunk in the browser), `MAX_AI_GENERATIONS_PER_GUEST_PER_DAY`=5, `MAX_DESIGNS_PER_GENERATION`=3, daily provider caps (`GEMINI_TEXT_DAILY_LIMIT`, `GEMINI_IMAGE_DAILY_LIMIT`, `GROQ_DAILY_LIMIT`). Check `/api/status` for what is enabled.

Cost recording: every AI attempt (including failures and previews) is written to `ai_usage_logs`; each generation stores `aiCostUsd` (billed, $0 on free tiers) and `aiNotionalCostUsd` (paid-equivalent).

Safety: AI-written HTML is sanitized (allowlist, no scripts/URLs/fonts), rendered with JavaScript off in Chromium, and rejected if it has no motion.
Tests: `npm run test:html`, `npm run test:effects`, `npm run samples`.

## Phase 4: Business Animation Studio (`/business`)

20 fixed templates in 4 kinds, rendered with **no AI** (so no tokens, no AI cost):

| Kind | Templates | Starting price (USD) |
|---|---|---|
| Product ads | Spotlight, Flash sale, Fresh & bright, Neon night, Luxury shine, Pop card | $0.49 |
| Animated logos | Glow reveal, 3D flip, Pulse rings, Shine sweep, Float & sparkle | $0.29 |
| Promo banners | Big sale, Announcement, Festival offer, New arrival, Grand opening | $0.29 |
| Product showcases (2 to 4 photos) | Slide show, Soft fade, Slow zoom, Pop in | $0.79 |

- Names, prices, discounts, captions and the logo are **exactly what the customer types or uploads**. Text is escaped, the logo is only scaled down (never redrawn or recoloured; tested pixel-for-pixel).
- Sizes: square, portrait 4:5, story 9:16, landscape 16:9, wide 3:1. Six colour schemes. Text-only banners work without an image.
- Same pipeline as everything else: free watermarked preview, pay, worker renders, refund on failure, 24 h retention.
- Code: `src/features/business/{meta,build,render,service}.ts`, page `src/app/business`, API `/api/business`.

### Saving AI tokens: the design cache
Custom AI Animation designs are stored in the `design_cache` table (`src/features/generation/design-cache.ts`). The same idea typed again (any capitalisation or punctuation) is served from the cache: no AI call, no quota used. "Design another version" still asks the AI for a fresh one. Unused designs are pruned by the cleanup worker after 90 days.

### Prompt-first start (no photo)
On `/create`, "Start from a colour background" lets the customer type a prompt and get an AI-designed GIF on a plain gradient (`POST /api/generations/blank`).

### Database changes (run `npx prisma db push`, then `npm run seed`)
- `generations`: `kind` ("viral" | "prompt" | "business"), `width`, `height`.
- `animation_templates`: `category`, `tagline`, `seconds`, `sortOrder`, `config`, `updatedAt` (filled by `npm run seed`).
- New `design_cache` table.

New commands: `npm run samples:biz`, `npm run test:business`, `npm run seed`.
Not in this phase: PKR pricing and Easypaisa (Phase 5, monetization).

## Phase 5: Monetization (Pakistan, PKR, Easypaisa)

**Customer flow:** see the price in rupees (always before starting) → free watermarked preview → **Pay** → Easypaisa → back to the site → we confirm with Easypaisa server to server → GIF is created → download. Failed GIF = refund.

- Prices are kept in USD in the catalog (that is how AI cost is measured) and shown as rupees: `NEXT_PUBLIC_USD_TO_PKR` (default 280), rounded up to the next Rs. 10, never below Rs. 30. Rebuild after changing the rate.
- **One payment per creation.** Double clicks, back button, repeated callbacks and page refreshes never create a second charge or queue the job twice (guarded status updates + unique order reference).
- **We never trust the browser.** The return page only tells us *which* payment; the result always comes from asking the gateway (`verify`). Amount mismatch is not accepted (flagged for refund).
- Failed / cancelled payments leave your work saved so you can pay again. Payments not confirmed in 45 min become EXPIRED, but money that arrives late is still honoured. A background check (cleanup worker, every 10 min) finds customers who paid and closed the tab.
- Refunds: automatic when the gateway supports it; otherwise the payment becomes `REFUND_DUE` and shows on **/admin** until you refund it in the Easypaisa merchant portal and press Done.
- **/admin** (set `ADMIN_TOKEN`, 16+ characters): refunds to do, revenue, refunds, estimated gateway fees (`PAYMENT_FEE_PERCENT`), AI cost billed vs. paid-equivalent, what you kept, per-effect table.

### Providers (`PAYMENT_PROVIDER`)
| Value | Use |
|---|---|
| `mock` | instant fake payment, development only (refused in production) |
| `easypaisa-sim` | sandbox simulator page `/pay/sim` with Pay / Fail / Cancel, to test every outcome |
| `easypaisa` | the real gateway |

### Going live with Easypaisa (read this)
1. Open a merchant account: https://registerbusiness.easypaisa.com.pk/ and get the integration pack and sandbox credentials.
2. Fill `EASYPAISA_*` in `.env`, set `APP_URL` to your public https address.
3. `src/services/payment/easypaisa.ts` follows the commonly published hosted-checkout shape. **Every line marked `VERIFY` (URLs, field names, hash format, inquiry response, status values) must be checked against your pack and tested in their sandbox before any real money.** Nothing outside that one file depends on it.
4. If your pack provides a server notification, point it at `POST /api/payments/notify`. Return URL used: `/api/payments/return`.
5. Test with the simulator first, then the Easypaisa sandbox, then a real small payment you refund yourself.

### Database changes (`npx prisma db push`)
`payments`: `amountPkr`, `currency`, `providerOrderId` (unique), `rawStatus`, `failureReason`, `paidAt`, `refundedAt`; new statuses `CANCELLED`, `EXPIRED`, `REFUND_DUE`.

New commands: `npm run test:payments`.
Not in this phase (by design): credits, subscriptions, discounts, Urdu UI. Add them after real sales data.

## Personalized GIF Generator (current default mode)

The site now opens on a simple flow: **pick a category and a design → type a name → live preview → Download → pay with Easypaisa → GIF**. No login, no photo upload, no free-text prompt, no AI cost.

**Nothing is stored for personalized GIFs.** The preview is the animation itself running live in the browser (HTML/CSS in a sandboxed iframe, with the typed name, no watermark, no server call). The real GIF is drawn on the fly, at the moment of download, only after the server has verified the payment with Easypaisa, and is streamed straight to the customer. No `previews/` or `outputs/` files, no worker job.

| Design | Look |
|---|---|
| Balloons Celebration | colourful balloons rise over soft clouds |
| Birthday Cake | candles flicker on a cake under twinkling stars |
| Beautiful Flowers | blooming flowers and falling petals |
| Colourful Confetti | falling confetti, streamers, colour-shifting name |
| Golden Celebration | rotating gold rays, glitter, shimmering text |

- Template engine: `src/features/personalized/{meta,build,render,service}.ts`. A template is a CSS-only animated scene with one text slot. The name never changes the animation (tested); only the text size adapts to name length, long names wrap by word, Urdu/Arabic names stay joined correctly. Rendered by the same Chromium engine as the business templates (`renderDocumentGif`).
- The only input is the name: letters (any language), spaces, `'`, `-`, `.`, 1 to 20 characters. Everything else is stripped; pages use a strict content policy.
- UI: `src/components/personalized-studio.tsx` (mobile-first, category tabs, live iframe previews). The on-demand render is `src/features/downloads/deliver.ts`, used by `/api/download/[token]`. If drawing fails, the payment is not captured and the customer just presses Download again.

### Accounts (sign up / log in on Download)
Design and preview stay open to everyone. When a signed-out visitor presses **Download**, a popup offers **Sign up** (name, email, password) or **Log in**, plus **Continue with Google** when configured. After that the download continues straight away (payment first if `PAYMENT_REQUIRED="true"`).
- **My GIFs** (`/account`): GIFs created, GIFs not yet downloaded, and a list with Download buttons (the GIF is created again each time; only the design + name are kept, `ACCOUNT_RETENTION_DAYS`, default 365).
- `REQUIRE_LOGIN="true"` (default) enforces this on the server for payment, free download and the download link itself: the GIF only goes to its signed-in owner. `"false"` lets guests download as before.
- Passwords: scrypt hashes (Node built-in), never stored in plain text. Login sessions: random cookie token, only its hash is in the database. Login/sign-up attempts are rate limited (in memory, per server process).
- Google: create an OAuth Client (Web) in Google Cloud, add `<APP_URL>/api/auth/google/callback` as an authorized redirect URI, put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`. Without them the Google button is hidden.
- Run `npx prisma db push` once (adds the `User` and `AuthSession` tables and `Generation.userId`), then re-run `prisma/supabase-setup.sql` so the new tables are also locked.
- Not included yet: email verification and "forgot password" (needs an email service). Because emails are unverified, signing in with Google to an address that was registered with a password removes that password and its sessions (stops pre-registration takeover).

### Payment switch
In `.env`: `PAYMENT_REQUIRED="true"` (default) = Easypaisa payment before download. `PAYMENT_REQUIRED="false"` = free: Download works directly, no payment screen, no payment record. The server decides (the browser cannot force it), and switching back to `true` locks GIFs that were never paid. Restart the app after changing it.

### Adding a category or template
Categories are listed in `PERSONAL_CATEGORIES` (`src/features/personalized/meta.ts`): Birthday, Festival, Wedding, Anniversary, Love & Romance, Congratulations, Thank You, Good Morning, New Baby, Graduation. Birthday has 5 designs and Festival has 15 (Eid ×3, Ramadan, Independence Day, Diwali, New Year, Christmas, Holi, Basant, Halloween, Lunar New Year, Thanksgiving, Easter, Jumma); the other categories show "coming soon".
To add a design later:
1. Add an entry to `PERSONAL_TEMPLATES` in `meta.ts` with its `category` id, `greeting` (e.g. "Eid Mubarak") and name/tagline/emoji.
2. Write its scene function (copy one from `festival.ts` for a festival, or `build.ts` for a birthday) and register it: festival designs go in `FESTIVAL_BUILDERS` at the bottom of `festival.ts`, others in `BUILDERS` in `build.ts` (same id). Shared helpers are in `scene.ts`. It receives the name, a size (pixels or `"fluid"`) and the greeting.
To add a new category, add one line to `PERSONAL_CATEGORIES`. Nothing else changes: the UI, preview, payment and download pick it up automatically.

### Personalized-only switch
`PERSONALIZED_ONLY="true"` (default) closes photo upload, business templates, free-text AI design and the old studio, **in the pages and in the API** (403). All that code is still in the project: set `PERSONALIZED_ONLY="false"` to bring it back.

### Payment and download security
- Download opens a payment screen: price in rupees, "Pay with Easypaisa", and a notice that MotionMagic never asks for the PIN or OTP (the customer enters them only on Easypaisa's page).
- The final GIF is rendered **only after the server verifies the payment with the gateway** (server to server). The browser's word is never trusted. `/api/download/<token>` also requires the creation to be COMPLETED and its payment AUTHORIZED/CAPTURED. Links are signed, expire in 15 minutes and are `private, no-store`.
- **Easypaisa endpoints:** the Easypaisa merchant documentation is only available after merchant onboarding, so the adapter (`src/services/payment/easypaisa.ts`) is NOT confirmed against it. Every line marked `VERIFY` must be checked against your official pack and Easypaisa's sandbox before real money. Use `PAYMENT_PROVIDER=easypaisa-sim` to test the whole flow meanwhile.

### Supabase Free setup (database + storage)
1. Create a project at supabase.com. In **Project Settings > Database > Connection string**, copy the **Session pooler** string (port 5432) into `DATABASE_URL` (Prisma works with it). Run `npx prisma db push`, then `npm run seed`.
2. In the Supabase **SQL editor**, run `prisma/supabase-setup.sql` once. It turns on Row Level Security for every table (so the public "anon" key can read nothing) and creates the **private** bucket `motionmagic`.
3. In `.env` on the server: `STORAGE_DRIVER="supabase"`, `SUPABASE_URL` (Settings > API), `SUPABASE_SERVICE_ROLE_KEY` (Settings > API, keep it server-only, never `NEXT_PUBLIC_`), `SUPABASE_BUCKET="motionmagic"`.
4. Free-plan limits to watch: 500 MB database, 1 GB storage (GIFs are deleted after 24 h, which keeps you well under), projects pause after a week of inactivity.
5. Run the app and the worker on a host that can run Chromium (`npx playwright install chromium`); Supabase only stores data and files.

### Tests
`npm run test:personalized` (templates, names, animation preserved, every template x name style, full pay-then-download run on an in-memory DB), `npm run test:storage` (Supabase driver with a fake network), `npm run test:payments`, `npm run test:business`.
