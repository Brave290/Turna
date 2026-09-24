# Project State — Turna

**Last Updated**: 2026-09-24
**Current Phase**: Phase 46 — Solo Ledger audit fixes, UX OTP locks, email spam tip, store roadmap
**Overall Status**: 🟡 In Progress — **not store-release ready** (see PROJECT_CONTINUITY.md roadmap)

## Production

| Item | Value |
|------|-------|
| **Production URL** | https://turnaapp.vercel.app |
| **Vercel Project** | prj_8VPRC7xoqlKomwV4PHzSr2TRTgbJ |
| **Supabase Project** | dhedoxczmbwrgetibvmy (eu-west-1) |
| **GitHub Repo** | https://github.com/Brave290/Turna (private) |
| **Custom Domain** | turna.name.ng (pending DNS) |
| **Keep-Alive Cron** | /api/health (Vercel cron) + cron-job.org backup |
| **Silent APK** | `/api/download/apk` (first-party proxy) |
| **App Version API** | `/api/app/version` (build 2 / v1.0.1) |
| **Email palette** | Rebrand v2 `#007A65` / `#0A1628` + spam-folder tip in all templates |
| **Store readiness** | ⚠️ Not ready — signing, assets, secrets, compliance (see continuity) |

## Design System (Master Prompt v1.0)

- **Fonts**: Playfair Display (display) + Plus Jakarta Sans (body), max 97px
- **Palette**: Forest #03251B · Primary #00A878 · Mint #35D6A0 · Cream #F7F7F0
- **Logo**: Single source `src/components/logo.tsx` + static exports in `public/` (SVG, PNG, WEBP, JPG — logo, logo-dark, logo-primary, logo-white, logo-on-dark, favicon)
- **Rules**: No emojis anywhere (SVG icons only). No phone/SMS/OTP. Email-only auth. Glassmorphism + scroll animations + 3D tilt. No Expo.

---

## Phase Progress

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1. Project Initialization | ✅ Complete | 2025-01-19 | 2025-01-19 | Monorepo, pnpm workspace, TypeScript configs, all package.json |
| 2. Supabase Configuration | ✅ Complete | 2025-01-19 | 2025-01-19 | config.toml, local dev ready |
| 3. Database Schema & Migrations | ✅ Complete | 2025-01-19 | 2025-01-19 | 12 tables, 10 enums, 25+ indexes |
| 4. RLS & Security Policies | ✅ Complete | 2025-01-19 | 2026-09-22 | Full per-table policies + helpers reapplied via Supabase CLI |
| 5. Authentication | ✅ Complete | 2025-01-19 | 2026-09-22 | Real signIn/signUp/reset server actions + OAuth callback |
| 6. Core Domain Logic | ✅ Complete | 2025-01-19 | 2025-01-19 | Services: circles, members, contributions, payouts, cycles, ledger, notifications, realtime |
| 7. Circle Lifecycle | ✅ Complete | 2025-01-19 | 2025-01-19 | CRUD + state machine |
| 8. Member Invitations | ✅ Complete | 2025-01-19 | 2025-01-19 | Token-based, email deep link |
| 9. Contribution Lifecycle | ✅ Complete | 2025-01-19 | 2025-01-19 | Report → Confirm → Track |
| 10. Two-Party Confirmation | ✅ Complete | 2025-01-19 | 2025-01-19 | Independent verification |
| 11. Payout Lifecycle | ✅ Complete | 2025-01-19 | 2025-01-19 | Initiate → Send → Receive |
| 12. Append-Only Ledger | ✅ Complete | 2025-01-19 | 2025-01-19 | Immutable event store with hash chaining |
| 13. Realtime Infrastructure | ✅ Complete | 2025-01-19 | 2025-01-19 | Supabase Realtime subscriptions |
| 14. Notifications Abstraction | ✅ Complete | 2025-01-19 | 2025-01-19 | Multi-channel ready |
| 15. Tests | ⏳ Pending | — | — | Security-focused test suite |
| 16. Seed Data | ✅ Complete | 2025-01-19 | 2025-01-19 | 6 users, 1 active circle, 6 cycles |
| 17. Documentation | ✅ Complete | 2025-01-19 | 2026-09-22 | Architecture, DB, Security, API docs, Master Prompt v1.0 |
| 18. Integration Verification | ⏳ Pending | — | — | End-to-end smoke tests |
| 19. Android Build Config | ✅ Complete | 2025-01-19 | 2025-01-19 | Gradle, signing, release workflow |
| 20. GitHub Actions CI/CD | ✅ Complete | 2025-01-19 | 2026-09-22 | CI + release; lint/typecheck/test fixed with --if-present |
| 21. Email Service (Gmail SMTP) | ✅ Complete | 2025-01-19 | 2026-09-23 | nodemailer; support.turna@gmail.com; 5-min OTP; real logo; custom password reset; no Supabase emails |
| 22. SEO Optimization | ✅ Complete | 2025-01-19 | 2025-01-19 | Sitemap, robots.txt, metadata, structured data |
| 23. UI Teardown | ✅ Complete | 2026-09-22 | 2026-09-22 | Old UI stripped per Master Prompt |
| 24. Design System Foundation | ✅ Complete | 2026-09-22 | 2026-09-22 | Palette, fonts, glassmorphism, animation hooks |
| 25. Unified Logo Assets | ✅ Complete | 2026-09-22 | 2026-09-22 | SVG component + PNG/WEBP/JPG exports in public/ |
| 26. Landing Page (Premium) | ✅ Complete | 2026-09-22 | 2026-09-22 | Phone mockup, scroll reveals, 3D tilt, counters |
| 27. Auth Screens | ✅ Complete | 2026-09-22 | 2026-09-22 | Splash, Sign Up, Login, Email OTP, Welcome, Forgot password |
| 27b. Auth wiring (real) | ✅ Complete | 2026-09-22 | 2026-09-22 | Server actions, spinners, errors, profile trigger, callback |
| 28. Dashboard Shell | ✅ Complete | 2026-09-22 | 2026-09-22 | Sidebar + mobile bottom nav + auth guard |
| 29. Circles (List/Create/Overview) | ✅ Complete | 2026-09-22 | 2026-09-22 | Live list, create form, detail page |
| 30. Members + Invite | ✅ Complete | 2026-09-22 | 2026-09-22 | Members list + email invite action (UI) |
| 31. Contributions + Statuses | ✅ Complete | 2026-09-22 | 2026-09-22 | Live table from DB |
| 32. Payouts + Receipt | ⏳ Partial | 2026-09-22 | — | Live list; confirm receipt actions still needed |
| 33. Ledger | ✅ Complete | 2026-09-22 | 2026-09-22 | Live append-only feed |
| 34. Insights + Goals | ⏳ Partial | 2026-09-22 | — | Live stats; goals not built |
| 35. Chat + Notifications + Reminders | ⏳ Partial | 2026-09-22 | — | Notifications list live; chat/reminders pending |
| 36. Health + Streaks + Disputes + Corrections | ⏳ Pending | — | — | |
| 37. Profile + Settings + Security | ✅ Complete | 2026-09-22 | 2026-09-23 | Profile form + delete account + theme toggle on settings |
| 38. App Download Popup (Web) | ✅ Complete | 2026-09-24 | 2026-09-24 | Get-our-app modal; Play coming soon; APK from Turna-Downloads |
| 39. UI/UX Polish (Theme, Modal, Join, Settings) | ✅ Complete | 2026-09-23 | 2026-09-23 | App-wide theme, notification modal, join accept page, branded select, no Supabase UI branding |
| 40. Invite Auto-Join + Circle Delete + Notifications | ✅ Complete | 2026-09-23 | 2026-09-23 | Token tracked through signup/verify/login; auto-join on return; owner delete circle; bell events; join RLS case fix |
| 41. Auth terms + remember, avatar, OTP password, circle duration, release ZIP | ✅ Complete | 2026-09-24 | 2026-09-24 | Login/signup terms gate + remember email; profile avatar upload; OTP password change; month-range circle creation + payout/payment modes; full release ZIP on private + Turna-Downloads; 4 migrations applied |
| 42. KYC UI, reminders cron, autopay charge, payments history, admin dashboard, digests, insights, payout receipt notify | ✅ Complete | 2026-09-24 | 2026-09-24 | KYC form on settings; `/api/cron/{reminders,autopay,digest}` + vercel crons; payments history nav page; admin ops (`ADMIN_EMAILS`); on-time % + next payout insights; webhook saves Paystack auth + payout receipt notify/email |
| 43. Solo Ledger + update popup + silent APK + multi-admin approvals + audit log | ✅ Complete | 2026-09-24 | 2026-09-24 | Personal offline-first ajo ledger (web+mobile) with branded PDF/CSV export, share/remind; `/api/app/version` + update prompt (Later×2 then force); `/api/download/apk` proxy; ApprovalPanel on circle detail; audit-log page; rolling android-latest release in CI |
| 44. UX polish: nav loading, OTP locks, settings tiles, compact circles, email spam tip | ✅ Complete | 2026-09-24 | 2026-09-24 | dashboard loading.tsx skeletons; bank+profile lock with email OTP unlock; settings multi-choice tile grid; compact circle cards; email templates Rebrand v2 + Spam/Junk tip; color tokens only (no hardcoded nav hex) |
| 45. Branded selects, owner member control, Android packaging, store roadmap, email palette | ✅ Complete | 2026-09-24 | 2026-09-24 | From prior commits (16f6fe2/a0f45ff); continuity store-release 14-section roadmap; all emails use `#007A65`/`#0A1628` + spam hint |
| 46. Solo Ledger audit fixes + UX locks complete + docs | ✅ Complete | 2026-09-24 | 2026-09-24 | typecheck-oriented fixes (Set-Cookie, imports, offline UUID); bank/profile OTP gates live; settings/circles/loading done; Phase 46 in continuity |

---

## Architecture Decisions Made

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Monorepo with pnpm workspaces | Accepted | 2025-01-19 |
| ADR-002 | Supabase (PostgreSQL + Auth + Realtime) | Accepted | 2025-01-19 |
| ADR-003 | Next.js App Router for web | Accepted | 2025-01-19 |
| ADR-004 | React Native CLI (no Expo) for mobile | Accepted | 2025-01-19 |
| ADR-005 | Integer minor units for money (kobo) | Accepted | 2025-01-19 |
| ADR-006 | Append-only ledger with hash chaining | Accepted | 2025-01-19 |
| ADR-007 | Zod for validation, shared in packages | Accepted | 2025-01-19 |
| ADR-008 | Server Actions for mutations, RLS for authz | Accepted | 2025-01-19 |
| ADR-009 | Gmail SMTP (nodemailer) for transactional email — Resend removed | Accepted | 2025-01-19 |
| ADR-010 | turna.name.ng as production domain | Accepted | 2025-01-19 |

---

## Current Blockers

- Need to run `supabase start` and `pnpm db:seed` to verify data
- Google OAuth credentials needed for production
- Need to test mobile build on actual device/emulator
- Vercel build may fail on Google Fonts fetch — fallback fonts configured

---

## Next Actions

1. Live-test signup → OTP → login → dashboard flow (after Phase 32 deploy)
2. Live-test forgot-password → reset → new password → login
3. Admin dashboard for editing legal pages
4. Begin Phase 15: Write security-focused tests
5. Begin Phase 18: Integration verification

---

## Phase 29 (2026-09-23) — Rebrand v2 + Standard Features

- **Toast notifications**: `toast.success/error/info/warning` API, framer-motion animated, mounted in root layout via `AppProviders`
- **Legal pages**: `/legal` index + `/terms` `/privacy` `/legal/[slug]` (cookies, acceptable-use, refund, contact) — admin-editable later
- **Notification bell**: Desktop sidebar + mobile top bar with unread badge, dropdown panel, links to `/dashboard/notifications`
- **Cookie consent**: Bottom banner with Accept/Essential only, localStorage persistence, links to Cookie Policy
- **Rebrand v2 palette**: Forest `#0A1628`, Primary `#00C2A8`, Violet `#7C5CFF`, Sky `#38BDF8`, Cream `#F4F7FB`
- **Font scale**: 90% base + `zoom: 0.95` on html, Tailwind fontSize rewritten ~90%
- **framer-motion**: Installed manually (pnpm add hangs), `motion.tsx` primitives, `page-enter.tsx`, `otp-input.tsx` animated OTP
- **App background**: `/bg-app.svg` on dashboard/auth (not landing), `.app-bg` utility
- **Bottom nav**: Locked `translate3d(0,0,0)`, no sway, badge on notifications item
- **Fonts**: Removed `next/font/google` (build fails offline) — CSS system font stacks with Playfair Display + Plus Jakarta Sans preferred
- **Landing footer**: Big-company style columns (Product, Company, Legal)
- **Sitemap**: Added legal pages URLs
- **Middleware**: `/legal` paths public

---

## Phase 32 (2026-09-23) — Auth Session Fix + Brand Assets + Resend Removal

- **Middleware relocated**: `apps/web/middleware.ts` → `apps/web/src/middleware.ts` (Next resolves middleware relative to `src/app`; root file was never bundled → unauthenticated `/dashboard` streamed Loading instead of 307)
- **Cookie API fix**: `@supabase/ssr@0.3` expects `get`/`set`/`remove`, not `getAll`/`setAll` — sessions were never read/written → login redirected back to login. Fixed in `supabase-server.ts` + middleware.
- **Login redirect param**: login page reads `?redirect=` and posts it through `signIn`
- **Logo component**: switched from hand-drawn SVG to real brand PNGs (`logo.png` / `logo-dark.png` / `logo-on-dark.png`) via `next/image` — used on landing, auth, legal, dashboard nav
- **Email logo**: already absolute `/logo.png` in templates (updated asset from remote commits)
- **Resend removed**: package + lockfile entries gone; only Gmail SMTP/nodemailer remains; `RESEND_API_KEY` removed from `.env.local`
- **Spam reduction**: OTP subject no longer embeds the code (`Your Turna verification code`); stable `Message-ID`, `replyTo`, `X-Entity-Ref-ID`; transactional (no bulk headers)
- **Remote sync**: pulled 6 commits (`2608595`…`c0ee9fb`) — no password sessionStorage, OTP race fixes, enhanced logo assets, theme toggle

---

## Phase 33 (2026-09-23) — UI/UX Polish Batch

- **App-wide theme**: `ThemeProvider` in `AppProviders`; dark mode CSS now applies to body/cards/inputs/nav (not only `.landing-page`); light-mode `--muted` darkened (`#4A5D73`) for subtext contrast; Tailwind `muted` color aligned
- **Dashboard theme toggle**: mounted in sidebar (dark variant) + mobile top bar + settings page header
- **Notification bell → centered modal**: portal + backdrop + Escape + scroll lock; no sticky full-screen overlay that blocked clicks (double-click fix)
- **Invitation accept page**: `/circles/join?token=` (public in middleware); `acceptInvitation` server action validates token/expiry/email match, assigns free `payout_position`, joins circle, ledger `MEMBER_JOINED`
- **Self-invite block**: `inviteMember` rejects invitee_email === owner email
- **Signup/verify redirect chain**: `?redirect=` flows signup → verify → login → target (needed for join links)
- **Settings redesign**: Profile + Account + Appearance + Delete Account panel (email confirm modal); anonymize profile + admin auth delete (FK RESTRICT on ledger.actor_id)
- **Branded select**: `BrandSelect` in `components/ui.tsx`; native `<select>` removed from circles/new frequency
- **Supabase branding removed from UI**: profile form helper text + legal privacy processors line
- **Full security audit deferred** until project foundation complete (user request)

---

## Phase 34 (2026-09-23) — Invite Auto-Join, Circle Delete, Notifications, Fixes

- **Invite → signup auto-join**: token stored in `sessionStorage.turna_pending_invite` on join/signup/verify/login when redirect contains `/circles/join`; join page recovers token if URL loses it; when session exists, auto-submits `acceptInvitation` once; unauthenticated accept redirects to login **with full join URL + token**
- **Unverified login keeps invite redirect**: `signIn` needsVerify now appends `&redirect=` to verify URL (was dropping it)
- **RLS migration applied** (`20260923230000`): case-insensitive invitee email match on invitations SELECT/UPDATE; notifications INSERT allows circle members/owner to notify each other
- **Delete circle (owner)**: `deleteCircle` server action (owner-only, any status) + confirm dialog on circle detail; hard delete cascades members/invites/cycles/ledger via FK
- **Notifications**: `notify` + `notifyCircleMembers` helpers — circle created, invite sent, member joined (self + other members)
- **Join errors surfaced**: unique payout slot / RLS / generic messages instead of bare "Could not join"
- **Dashboard overview hardening**: stats queries try/catch; `formatCurrency` NaN-safe; `dashboard/error.tsx` boundary
- **Email deliverability**: multipart text always present; List-Unsubscribe one-click; X-MSMail-Priority; invite emails send `text` part
- **OTP inputs**: solid white bg, teal borders (no muddy grey fill on forest auth pages)
- **Bottom nav active icon**: explicit `#00C2A8` color/stroke (was rendering black)
- **Border softness**: `#D0DBE8` (slightly lighter grey)

---

## Metrics

- **Packages**: 5 (database, types, validation, core, config)
- **Apps**: 2 (web, mobile)
- **Migrations**: 1 (initial schema)
- **Lines of SQL**: ~450
- **Tables**: 12
- **Enums**: 10
- **Indexes**: 25+
- **API Routes**: 5 (signup, google, signout, reset-password, update-password)
- **Web Pages**: 7 (landing, login, signup, callback, reset-password, update-password, dashboard)
- **Email Templates**: 5 (confirmation, password reset, circle invitation, contribution reminder, payout notification)