# Project State — Turna

**Last Updated**: 2025-09-19
**Current Phase**: Phase 19 — Deployment
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

---

## Phase Progress

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1. Project Initialization | ✅ Complete | 2025-01-19 | 2025-01-19 | Monorepo, pnpm workspace, TypeScript configs, all package.json |
| 2. Supabase Configuration | ✅ Complete | 2025-01-19 | 2025-01-19 | config.toml, local dev ready |
| 3. Database Schema & Migrations | ✅ Complete | 2025-01-19 | 2025-01-19 | 12 tables, 10 enums, 25+ indexes |
| 4. RLS & Security Policies | ✅ Complete | 2025-01-19 | 2025-01-19 | All tables have RLS policies |
| 5. Authentication | ✅ Complete | 2025-01-19 | 2025-01-19 | Email/Password + Google OAuth |
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
| 17. Documentation | 🟡 In Progress | 2025-01-19 | — | Architecture, DB, Security, API docs |
| 18. Integration Verification | ⏳ Pending | — | — | End-to-end smoke tests |
| 19. Android Build Config | ✅ Complete | 2025-01-19 | 2025-01-19 | Gradle, signing, release workflow |
| 20. GitHub Actions CI/CD | ✅ Complete | 2025-01-19 | 2025-01-19 | CI + release automation |
| 21. Email Service (Resend) | ✅ Complete | 2025-01-19 | 2025-01-19 | Email templates for auth, invitations, notifications |
| 22. SEO Optimization | ✅ Complete | 2025-01-19 | 2025-01-19 | Sitemap, robots.txt, metadata, structured data |
| 23. Web App Pages | ✅ Complete | 2025-01-19 | 2025-01-19 | Landing, auth, dashboard pages |

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
- Resend API key needed for production email
- Need to test mobile build on actual device/emulator

---

## Next Actions

1. Complete Phase 17: Finalize documentation
2. Begin Phase 15: Write security-focused tests
3. Begin Phase 18: Integration verification
4. Set up GitHub repo and push code

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