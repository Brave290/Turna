# Project State — Turna

**Last Updated**: 2026-09-23
**Current Phase**: Phase 31 — 5-min OTP, Mandatory Verify, Custom Password Reset, Logo Emails
**Overall Status**: 🟡 In Progress

## Production

| Item | Value |
|------|-------|
| **Production URL** | https://turnaapp.vercel.app |
| **Vercel Project** | prj_8VPRC7xoqlKomwV4PHzSr2TRTgbJ |
| **Supabase Project** | dhedoxczmbwrgetibvmy (eu-west-1) |
| **GitHub Repo** | https://github.com/Brave290/Turna (private) |
| **Custom Domain** | turna.name.ng (pending DNS) |
| **Keep-Alive Cron** | /api/health (Vercel cron) + cron-job.org backup |

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
| 37. Profile + Settings + Security | ✅ Complete | 2026-09-22 | 2026-09-22 | Profile form + sign out |
| 38. App Download Popup (Web) | ⏳ Pending | — | — | |

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
| ADR-009 | Resend for transactional email | Accepted | 2025-01-19 |
| ADR-010 | turna.name.ng as production domain | Accepted | 2025-01-19 |

---

## Current Blockers

- Need to run `supabase start` and `pnpm db:seed` to verify data
- Google OAuth credentials needed for production
- Resend API key needed for production email (or switch to Gmail SMTP)
- Need to test mobile build on actual device/emulator
- Vercel build may fail on Google Fonts fetch — fallback fonts configured

---

## Next Actions

1. Set RESEND_API_KEY (or SMTP) in Vercel env for real OTP emails
2. Live-test signup → OTP → login → dashboard flow
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