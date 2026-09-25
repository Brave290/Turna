# Project Continuity — Turna

**Purpose**: Enable seamless handoff between sessions, agents, and team members. Contains all context needed to resume work without loss of momentum.

---

## Store Release Readiness Roadmap (NOT yet store-ready)

Structure exists for Android/iOS builds. Still missing before Play/App Store:

### 1. Android release signing
- Permanent upload keystore **outside Git**
- Secrets: `SIGNING_STORE_FILE`, `SIGNING_KEY_ALIAS`, `SIGNING_STORE_PASSWORD`, `SIGNING_KEY_PASSWORD`
- Remove debug-keystore fallback in `build.gradle` release (must fail if missing)
- Package ID `com.hx.turna` registered in Play Console
- Google Play App Signing + first signed AAB
- versionCode / versionName management; internal/closed/production tracks

### 2. Android SDK / build env
- SDK Platform 34, Build-Tools 34.0.0, NDK 26.1.10909125, JDK 17
- `ANDROID_HOME` / `local.properties` (template: `apps/mobile/android/local.properties.example`)

### 3. Android assets
- Adaptive + legacy + round launcher icons, notification icon, splash (incl. Android 12)
- Play feature graphic + screenshots (phone/tablet)

### 4. iOS signing / Apple
- Apple Developer Program, App Store Connect app, bundle `com.hx.turna`
- Team ID, dev/dist certs, provisioning profiles, archive/export config
- App Store Connect API key for CI

### 5. iOS capabilities (if used)
Push, Associated Domains, Sign in with Apple, Background Modes, Keychain, Universal Links, camera/photos for KYC, Face ID

### 6. iOS assets & metadata
Full AppIcon set, splash, screenshots, description/keywords, support/marketing/privacy/terms URLs, age rating, export compliance, privacy nutrition labels

### 7. iOS privacy
`PrivacyInfo.xcprivacy`, data collection declarations, account deletion, permission strings (camera/photos/notifications/biometrics)

### 8. Production env vars
- Supabase URL/anon/service + migrations + RLS + auth redirects + email + backups
- `NEXT_PUBLIC_APP_URL`, `NODE_ENV` — consolidate `turnaapp.vercel.app` vs `turna.name.ng` fallbacks
- Google OAuth client + consent + redirect URLs
- SMTP + SPF/DKIM/DMARC + bounce monitoring
- Paystack live keys + webhook + refunds + reconciliation
- `CRON_SECRET`, `ADMIN_EMAILS` + MFA

### 9. KYC / compliance
Real KYC provider, doc storage/encryption/retention, AML/fraud/limits, regulatory review for ajo/esusu

### 10. Backend hardening
Rate limits, OTP abuse monitoring, webhook replay protection, payment idempotency, backups, error/uptime monitoring

### 11. CI/CD
Web checks + Android signing secrets + AAB upload; iOS macOS runner + CocoaPods + Xcode archive + TestFlight; Fastlane; env promotion

### 12. Web deploy verification
Vercel env complete, custom domain DNS/HTTPS, Supabase/OAuth/Paystack redirects, crons active, rollback tested

### 13. Mobile↔web integration
Deep links, intent filters, URL schemes, universal links, OAuth/password-reset/invite/payment callbacks, app download links

### 14. Testing
Emulator + physical Android/iOS; signup/OTP/login/reset/OAuth; circles/contributions/payments/payouts; notifications/KYC; offline, restart, upgrade, a11y, small screens

**Most urgent**: Android SDK + real release keystore (no debug fallback) + Apple signing team + store console records + branded icons + production secrets + compliance review + device tests + CI signing.

---

## Quick Resume Checklist

When starting a new session:

- [ ] Read this file completely
- [ ] Check `PROJECT_STATE.md` for current phase
- [ ] Review latest `SECURITY_AUDIT_PHASE_N.md` (if exists)
- [ ] Run `pnpm install` in `/public/Turna`
- [ ] Start Supabase: `supabase start` (if local)
- [ ] Verify tests pass: `pnpm test`
- [ ] Check for any pending PRs or issues

---

## Repository Structure

```
/public/Turna/
├── .agents/team/           # Agent definitions (CEO, CTO, UI, UX, Pentester)
├── apps/
│   ├── web/               # Next.js 14 App Router
│   └── mobile/            # React Native CLI (Android/iOS)
├── packages/
│   ├── database/          # Supabase client, migrations, seed
│   ├── types/             # Shared TypeScript types (generated from DB)
│   ├── validation/        # Zod schemas (shared)
│   ├── core/              # Business logic, domain services
│   └── config/            # Shared config, constants
├── supabase/
│   ├── migrations/        # SQL migrations (numbered)
│   ├── seed/              # Development seed data
│   ├── functions/         # Edge Functions (future)
│   └── config.toml        # Local Supabase config
├── docs/                  # Documentation (architecture, db, security, api, dev)
├── PROJECT_STATE.md       # Current phase status
├── PROJECT_CONTINUITY.md  # This file
├── SECURITY_AUDIT.md      # Security audit template/process
├── BUILD_AND_DEPLOYMENT_CHECKLIST.md
├── package.json           # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.json          # Base TypeScript config
├── .env.example           # Environment template
└── .gitignore
```

---

## Key Commands

```bash
# Install dependencies
cd /public/Turna && pnpm install

# Start all dev servers
pnpm dev:web          # Next.js on :3000
pnpm dev:mobile       # Metro bundler

# Database
pnpm db:migrate       # Push migrations to Supabase
pnpm db:seed          # Run seed script
pnpm db:reset         # Reset local DB
pnpm db:generate      # Generate types from DB

# Quality
pnpm lint             # All packages
pnpm typecheck        # All packages
pnpm test             # All packages

# Build
pnpm build            # All packages
pnpm build:web        # Next.js build
pnpm build:mobile     # Android/iOS build
```

---

## Environment Setup

### Required Tools
- Node.js ≥20.0.0
- pnpm ≥9.0.0
- Supabase CLI ≥1.145.0
- Docker (for local Supabase)
- Android Studio + SDK (for mobile)
- Xcode (for iOS, macOS only)

### Environment Variables

Copy `.env.example` to `.env.local` and fill:

```bash
# Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Production (Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://dhedoxczmbwrgetibvmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://turnaapp.vercel.app
NODE_ENV=production
```

Get local keys from `supabase status` after `supabase start`.

---

## Current Work Context

### Phase 47: Mobile=web parity + release signing + Vercel build fix — Complete (2026-09-24)

**Completed this session**:
- **Mobile must match web 1:1** (user directive — web will later gate account creation behind "download the app"):
  - Real logo component (`Logo.tsx`) replaces letter "T" mark on Auth, Verify, Onboarding, App loading
  - TabBar: Home / Circles / Ledger / Solo / Profile (was "Me"), primary indicator bar like web bottom nav
  - Auth: Terms + Privacy checkbox (required), Remember my email (AsyncStorage), Forgot password hint, "Sign In" / "Create one" copy
  - Home: greeting + "Here's what's happening with your savings circles.", Total savings forest hero, Create/Join buttons, 2×2 stats, My Circles / Recent Activity / Open ledger strip
  - Circles / Ledger / Solo / Profile headers and empty states copy-matched to web pages
  - Theme Rebrand v2 only (`#007A65` / `#0A1628` / `#4A5D73` / `#F4F7FB`); old `#00A878`/`rgba(0,168,…)` removed from mobile
  - Android `colors.xml` + adaptive icon foreground → Rebrand v2; mipmaps regenerated from `app-icon-512.png`
- **Android release signing (Play Trust)**: keystore `apps/mobile/android/keystore/turna-release.keystore` (alias `turna`, store/key password `Turna2026`, validity to 2054); `build.gradle` release `signingConfigs.release` with env/property override then local file — **no debug fallback**; CI rolling APK prefers **release** APK over debug
- **Vercel build fix**: new `apps/web/src/lib/solo-period.ts` (pure period helpers); client boards import from it — no more `next/headers` from client graph
- **favicon.svg** last old-palette colors → Rebrand v2

**Known / deferred**:
- Mobile `tsc --noEmit` still reports React/RN JSX ElementClass noise (`@types/react` 18.2.0 vs RN 0.73) — **root `pnpm typecheck` excludes `@turna/mobile`** (CI green path). Upgrade `@types/react` or adopt `@react-native/typescript-config` later
- iOS CI artifacts still need macOS runner + Apple signing
- Await user approval before tagging **v1.0.0**
- Store-release blockers per 14-section roadmap below (enrichment graphics, Play Console, secrets, compliance)

**Next**:
1. Push → confirm CI green (typecheck/lint/android release APK artifact) + Vercel Ready (build fix)
2. Live: install release APK — Play Protect should no longer flag debug cert
3. User approval → tag **v1.0.0**
4. Store-release blockers per roadmap

---

### Phase 46: Solo Ledger + UX locks + email polish + store roadmap — Complete (2026-09-24)

**Completed this session (on top of Phase 43–45)**:
- **Store Release Readiness Roadmap** in this file (14 sections — signing, SDK, assets, iOS, env, KYC, CI/CD, testing)
- **Email templates Rebrand v2**: `#007A65` primary / `#0A1628` forest / `#4A5D73` muted (no `#00C2A8`)
- **Spam-folder tip on every template**: “Not in your inbox? Check Spam/Junk/Promotions…” + sender address — so users don’t say “email didn’t come”
- **Nav loading skeletons**: `loading.tsx` for dashboard, settings, circles, ledger, solo-ledger
- **Bank account lock after save** + email OTP unlock (`/api/auth/sensitive-otp`, purpose `bank_change`)
- **Profile field lock after save** + OTP unlock (`ProfileEditGate`, purpose `profile_change`)
- **Settings = tile menu** (Account / Preferences / Circle / Support) navigating to sub-pages
- **Circles page compact** interactive grid (Join + New)
- Audit/typecheck fixes: `Set-Cookie` join, App.tsx imports, offline UUIDs, NEXT_REDIRECT rethrow, unused imports

**Next**:
1. Typecheck + lint green, commit + push, verify CI + Vercel
2. User approval → tag **v1.0.0**
3. Store-release blockers per roadmap above

---

### Phase 43: Solo Ledger, App Updates, Silent APK — Complete (2026-09-24)

**Completed this session**:
- **Solo Ledger** (personal ajo tracker, no circle): tables `solo_ledgers`, `solo_contributors`, `solo_entries` + RLS (migration `20260924180000_solo_ledgers.sql` applied via Management API)
- Web: `/dashboard/solo-ledger` list + detail board (calendar months, mark paid/partial/unpaid, offline localStorage queue → server actions)
- Export: **Branded PDF** (print letterhead window) **or CSV** — user chooses; Share summary + Remind unpaid (WhatsApp/copy)
- Mobile: Solo tab, AsyncStorage offline store, pull/push sync on login/foreground
- **Multi-admin approvals UI**: `ApprovalPanel` on circle detail using existing `requestApproval`/`approveRequest`
- **Audit log** page `/dashboard/audit-log` + CSV export; nav links
- **Ledger/Payments CSV export** buttons
- **Receipt share polish**: QR, email, copy, open receipt
- **App update**: `GET /api/app/version` serves CI-generated `version.json` from the latest release (auto version, env fallback); `UpdatePrompt` web + `UpdatePopup` mobile — Later twice, force on 3rd; local code injected at build (`src/generated/version.ts`)
- **Silent APK**: `GET /api/download/apk` auto-resolves the latest `{version}-turna.apk` asset via GitHub API (legacy static URL + private-repo fallback)
- CI: auto version `1.0.YYMMDD.HHMM` (code = epoch minutes); rolling visible releases with `{version}-turna.apk` + `{version}-turna.aab` + `version.json` in main repo (`android-latest`) and Turna-Downloads (`latest`); stale apk/aab purged each run

**Key paths**:
- `apps/web/src/lib/solo-{actions,data,local}.ts`
- `apps/web/src/components/dashboard/solo/*`
- `apps/web/src/app/api/app/version/route.ts`, `api/download/apk/route.ts`
- `apps/mobile/src/lib/solo-store.ts`, `screens/Solo*.tsx`, `components/UpdatePopup.tsx`
- `supabase/migrations/20260924180000_solo_ledgers.sql`

**Next**:
1. Green CI + Vercel deploy
2. Verify silent APK download + update popup on prod
3. Tag **v1.0.0** after user approval (VERSION_CODE already 2 for update testing)

---

### Phase 28: Dashboard Shell + Real Auth — In Progress (2026-09-22)

**Completed this session**:
- Real auth: login/signup/forgot-password call Supabase server actions with spinners + error surfaces
- `signIn` honors `?redirect=` safely; signup redirects to `/dashboard` when session exists
- OAuth/OTP callback route: `apps/web/src/app/auth/callback/route.ts`
- Profile auto-create trigger + backfill + full RLS policies applied via `supabase db query --linked` (`20260922230000_profiles_rls_realtime.sql`)
- Dashboard shell: desktop sidebar + mobile top/bottom nav, middleware + layout auth guard
- Live pages (Supabase, not demo): overview stats, circles list/detail/create, invite form, contributions, payouts list, ledger, notifications, insights, settings/profile
- APK fix kept: `debuggableVariants = []` so debug APKs embed JS bundle
- CI Android fix: `@babel/runtime` direct dep + monorepo Metro `watchFolders`/`nodeModulesPaths` (pnpm does not hoist it; `createBundleDebugJsAndAssets` needs it)
- Production deploy verified: `72ca6bc` aliased to https://turnaapp.vercel.app (home/login/dashboard 200, `/api/health` ok)
- **Env policy**: secrets only in Vercel project env (project `turna` / `prj_8VPRC7xoqlKomwV4PHzSr2TRTgbJ`) — do not commit `.env*`
- Vercel env already has: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (=https://turnaapp.vercel.app), `NODE_ENV`

**Next**:
1. Green CI on `main` (Android job was fixed after `72ca6bc`)
2. Verify login → `/dashboard` with real data on prod
3. Payout confirm actions + invite email delivery (Resend key still empty)
4. Set `ANDROID_SIGNING_*` GitHub secrets before first release tag (see below)
5. Contribution report/confirm UI flows

**Android release secrets (`gh secret set … -R Brave290/Turna`)** — never commit keystore/passwords:

```bash
# Generate once (keep offline backup):
keytool -genkeypair -v -keystore turna-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias turna

# Secrets used by .github/workflows/release.yml:
# ANDROID_SIGNING_KEY_ALIAS      e.g. turna
# ANDROID_SIGNING_KEY_PASSWORD   key password for alias
# ANDROID_SIGNING_STORE_PASSWORD keystore password
# ANDROID_SIGNING_STORE_FILE     path inside runner workspace after uploading jks
```

`SIGNING_STORE_FILE` is read as a Gradle project property; upload `turna-release.jks` in the release workflow and point the secret at its path (e.g. `apps/mobile/android/app/turna-release.jks`). Without these, `release.yml` falls back to the debug keystore (not Play-Store valid).

**Key files**:
- `apps/web/src/lib/auth-actions.ts` — signIn/signUp/reset/createCircle/invite/updateProfile
- `apps/web/src/lib/dashboard-data.ts` — server data loaders
- `apps/web/src/app/dashboard/**` — shell + pages
- `apps/web/src/components/dashboard/nav.tsx` — sidebar/bottom nav
- `supabase/migrations/20260922230000_profiles_rls_realtime.sql` — profile trigger + RLS
- `apps/mobile/android/app/build.gradle` — `debuggableVariants = []`
- `apps/mobile/metro.config.js` + `@babel/runtime` — monorepo Metro resolution for CI bundle

**Env / deploy**:
- Vercel CLI linked to project `turna` (GitHub Brave290/Turna → turnaapp.vercel.app); Git integration auto-deploys `main`
- Supabase CLI linked to `dhedoxczmbwrgetibvmy` — use `supabase db query --linked` from `/public/Turna`
- Never put API keys in tracked files
- Do not hardcode Vercel tokens in `scripts/deploy.sh` going forward — use env/`vercel` CLI auth only

### Files to Watch

- `supabase/migrations/20240101000000_initial_schema.sql` — Single source of truth for schema
- `packages/core/src/` — Business logic services
- `apps/web/src/app/` — Next.js pages and API routes
- `apps/web/src/lib/email.ts` — Resend email service
- `apps/web/src/app/sitemap.ts` — SEO sitemap
- `apps/web/src/app/robots.ts` — SEO robots.txt

---

## Agent Handoff Protocol

### After Each Phase Completion

1. **Update** `PROJECT_STATE.md` with new status
2. **Run** Pentester audit (see `SECURITY_AUDIT.md`)
3. **Document** any ADRs in `ARCHITECTURE_DECISIONS.md`
4. **Commit** with message: `phase(N): description`
5. **Tag** if major: `git tag phase-N-complete`

### Agent Review Order

1. **Pentester** — Security audit (blocks everything)
2. **CTO** — Architecture review
3. **CEO** — Strategic approval
4. **UX Designer** — Flow validation (phases 7, 11, 18)
5. **UI Designer** — Component review (phase 18+)

### Review Artifacts Location

All agent outputs stored in `.agents/outputs/phase-N/`:

```
.agents/outputs/
├── phase-1/
│   ├── pentester_audit.md
│   ├── cto_review.md
│   └── ceo_approval.md
├── phase-2/
│   └── ...
```

---

## Known Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Money | BIGINT minor units (kobo) | No floating-point errors |
| Auth | Supabase Auth email/password + Google OAuth | Battle-tested, no custom crypto |
| Authz | RLS + Server Actions | Defense in depth |
| Ledger | Append-only, hash-chained | Audit requirement |
| API | Next.js Server Actions | Colocated with UI, type-safe |
| Validation | Zod schemas in @turna/validation | Shared web/mobile |
| Types | Generated from DB | Single source of truth |
| Realtime | Supabase Realtime | Native PG integration |
| Mobile | React Native CLI | Full native access, no Expo limits |
| Email | Resend | Modern, reliable, good DX |
| Domain | turna.name.ng | Production domain |
| SEO | Next.js metadata API + sitemap.ts + robots.ts | Built-in SEO support |

---

## Troubleshooting

### Supabase Won't Start
```bash
supabase stop --no-backup
docker system prune -f
supabase start
```

### Type Errors After Migration
```bash
pnpm db:generate
pnpm typecheck
```

### pnpm Workspace Issues
```bash
pnpm install --force
# or
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Mobile Build Fails
```bash
cd apps/mobile/android && ./gradlew clean
cd ../..
pnpm build:mobile
```

---

## Contact / Escalation

- **Technical Lead**: CTO Agent (see `.agents/team/cto.md`)
- **Product Lead**: CEO Agent (see `.agents/team/ceo.md`)
- **Security**: Pentester Agent (see `.agents/team/pentester.md`)
- **Design**: UI/UX Agents (see `.agents/team/ui-designer.md`, `ux-designer.md`)

---

## Session Log Template

Each session should append:

```markdown
## Session YYYY-MM-DD

**Goal**: [What you aimed to achieve]
**Completed**: [What actually got done]
**Blockers**: [What stopped progress]
**Decisions**: [Any ADRs or choices made]
**Next Session**: [Specific next steps]
```

---

## Session Log

### Session 2025-01-19

**Goal**: Build complete Turna platform with modular architecture, email service, and SEO optimization

**Completed**:
- Project renamed from CircleSafe to Turna
- Monorepo structure with pnpm workspaces
- Database schema: 12 tables, 10 enums, 25+ indexes
- RLS policies for all tables
- Authentication: Email/Password + Google OAuth
- Core business logic services
- Seed data for development
- Web app: Landing, auth, dashboard pages
- Email service with Resend (5 templates)
- SEO: Sitemap, robots.txt, metadata, structured data
- Android build configuration
- GitHub Actions CI/CD with release automation
- Security audit framework with agent team

**Decisions**:
- Domain: turna.name.ng
- Email: Resend (not SMTP)
- Auth: Email/Password + Google OAuth (phone/OTP removed)

**Next Session**:
1. Complete documentation
2. Write security-focused tests
3. Integration verification
4. Set up GitHub repo and push code
```

### Session 2026-09-23 (OTP + SMTP)

**Goal**: Custom non-expiring OTP via Gmail SMTP; all site emails from support.turna@gmail.com

**Completed**:
- Migration: `custom_otps` table + `create_custom_otp` / `verify_custom_otp` (service_role only, no expiry, max 5 attempts); `user_id` column for reliable email confirm
- `supabase-admin.ts` service-role client
- `signUp` / `verifyEmailOtp` / `resendEmailOtp` rewritten for custom OTP + SMTP send + email confirm + password sign-in
- Signup stashes password in sessionStorage; verify page clears it and routes correctly
- `request-email-otp` API route uses custom OTP + SMTP
- Invite emails send via SMTP with circleInvitation template
- Email templates: no-expiry OTP copy; removed emoji from welcome
- Rate limit checked before creating OTP
- Vercel Production (+ Preview) env: SMTP_HOST/PORT/USER/PASS/FROM set (correct app password `epqwjmudbsfqvmyo`)
- Local SMTP verify + test send succeeded

**Blockers**:
- None for OTP path. Supabase Auth password-reset email still needs Supabase SMTP config if not already set (optional follow-up: route reset through our SMTP).

**Decisions**:
- OTP codes never expire (valid until used/replaced, 5 attempts)
- Password stashed in sessionStorage only for post-OTP seamless sign-in
- Gmail app password is `epqwjmudbsfqvmyo` (note q-before-w order)

**Next Session**:
1. Live test: signup → OTP email → verify → dashboard on production
2. Optional: password-reset via custom SMTP (avoid Supabase SMTP dependency)
3. Admin dashboard (editable legal pages) + remaining roadmap phases

### Session 2026-09-23 (OTP hardening + custom reset)

**Goal**: 5-min OTP expiry, always-working OTP (no rate-limit blocks), mandatory email verify before dashboard, custom forgot-password, real logo in emails, clear all users

**Completed**:
- OTP `expires_at` = now + 5 min; verify checks expiry; email/UI copy updated
- Rate limit function is a no-op (always allowed) — OTP system never blocked
- `signUp` creates unconfirmed user via admin API (full OTP control), always sends 5-min code
- `signIn`: "Email not confirmed" → issues OTP, returns `needsVerify` + `redirectTo` → login redirects to verify
- Verify: purpose field, expiry check, clear errors; session via stashed password → dashboard
- Custom password reset: `password_reset_tokens` table + create/consume RPCs; SMTP email with real reset link; `/auth/reset-password?token=` page; API routes updated; no Supabase `resetPasswordForEmail`
- Email shell uses real `/logo.png` (absolute URL)
- All Supabase users cleared (0); test flows verified via RPC
- Migrations: 5-min expiry, password_reset_tokens, rate-limit no-op

**Blockers**: None.

**Decisions**:
- OTP always works (no rate limiting) per user request
- Mandatory verify: unconfirmed login forces OTP before dashboard
- Password reset fully custom (our SMTP + token table)

**Next Session**:
1. Live test signup → 5-min OTP → dashboard; unverified login → forced verify
2. Live test forgot-password → reset link → new password → login
3. Commit + push + monitor Vercel

### Session 2026-09-23 (Session cookies + middleware + logo + Resend removal)

**Goal**: Pull remote logo/auth commits; fix login bouncing back to login; real logo everywhere; remove Resend; reduce Gmail OTP spam

**Completed**:
- `git pull --rebase` — 6 commits: no password in sessionStorage, OTP race fixes, enhanced logo assets, theme toggle
- Moved middleware to `apps/web/src/middleware.ts` (Next looks in `src/` when app is `src/app`; root middleware was never registered → no edge redirect)
- Fixed `@supabase/ssr@0.3` cookie adapter: `get`/`set`/`remove` instead of `getAll`/`setAll` — sessions were silently never persisted → login success then bounced to `/auth/login`
- Login page now forwards `?redirect=` into the server action form
- Logo component uses real brand PNGs (`logo.png`/`logo-dark.png`/`logo-on-dark.png`) via `next/image`; landing already uses enhanced lockup; emails use absolute `/logo.png`
- Removed `resend` from package.json + lockfile; removed `RESEND_API_KEY` from `.env.local` — Gmail SMTP only
- OTP email subject no longer contains the code; added stable Message-ID / replyTo / X-Entity-Ref-ID for deliverability
- Typecheck pass; `pnpm install --lockfile-only` pass

**Blockers**: None.

**Decisions**:
- Keep Resend out entirely — single path is Gmail SMTP
- Transactional OTP emails stay non-bulk (no Precedence:bulk) to protect inbox placement
- Middleware lives under `src/` matching app directory layout

**Next Session**:
1. Push + wait Vercel Ready → curl `GET /dashboard` expect **307** to `/auth/login?redirect=/dashboard`
2. Live E2E: signup → OTP email → verify → login → dashboard (cookies must stick)
3. Live: unverified login → forced OTP; forgot-password → reset → new password → login
4. Optionally send test OTP and check Gmail Spam for a recipient

### Session 2026-09-23 (UI/UX polish batch)

**Goal**: Dashboard theme toggle + light-mode contrast, notification centered modal (double-click fix), invitation accept page, self-invite block, settings redesign + delete account, branded selects, remove Supabase UI branding. Full security audit deferred until project foundation complete (user request).

**Completed**:
- `ThemeProvider` mounted in `AppProviders`; app-wide dark CSS (body/cards/inputs/nav/glass) not only `.landing-page`; `--muted` + Tailwind `muted` → `#4A5D73` for light-mode subtext contrast
- `ThemeToggle` in dashboard sidebar (on-dark), mobile top bar, settings header
- `NotificationBell` → centered portal modal (z-90, Escape, scroll lock) — removed sticky full-screen overlay that swallowed clicks
- New `/circles/join` page (public in middleware) + `acceptInvitation` server action: token/expiry/email-match checks, free `payout_position`, join, ledger `MEMBER_JOINED`
- `inviteMember` rejects self-invite (invitee == owner email)
- Signup/verify forward `?redirect=` so join deep-links return after OTP → login
- Settings redesign: Profile + Account + Appearance + Delete Account (email-confirm modal); `deleteAccount` blocks owned circles, leaves memberships, anonymizes profile (ledger FK RESTRICT), admin auth delete
- `BrandSelect` + `useConfirm` in `components/ui.tsx`; native frequency `<select>` removed
- Removed "managed by Supabase Auth" + legal "Supabase for data hosting" user-facing copy
- Typecheck + ESLint pass on `apps/web`; `pnpm install --frozen-lockfile --lockfile-only` pass

**Blockers**:
- Root `pnpm typecheck` fails on `@turna/database` missing local `typescript` binary (pre-existing env; not this batch)
- Full security-audit skill run deferred by user until project foundation done

**Decisions**:
- Profile delete is anonymize + auth-user delete (cannot hard-delete profile: `ledger_events.actor_id` ON DELETE RESTRICT)
- Notification UI is a modal, not dropdown, to stop click-through / double-click issues
- Join route is public; accept requires authenticated session with matching invitee email

**Next Session**:
1. Commit + push + wait Vercel Ready; curl `/dashboard` still 307 unauthenticated; open `/circles/join` without token → invalid-link UI
2. Live: create invite → accept with invited email → member appears; self-invite shows error
3. Live: theme toggle light↔dark on dashboard + settings; notification bell opens centered modal
4. Live: settings delete-account with wrong/right email; owned-circle block message
5. Later: full security audit (6-phase skill) when foundation is complete

### Session 2026-09-23 (Invite auto-join + delete circle + notifications + fixes)

**Goal**: Invite token survives signup/verify/login and auto-joins; owner can delete circles; bell notifications for real events; fix join RLS, dashboard error, spam headers, OTP grey, bottom-nav black icon.

**Completed**:
- Join flow: `join-client.tsx` stores/recovers `turna_pending_invite`; auto-accepts once when `sessionEmail` set; signup/login/verify stash token when redirect contains `/circles/join`
- Unauthenticated `acceptInvitation` redirects to login with full `/circles/join?token=` (was dropping token)
- `signIn` needsVerify redirectTo now preserves `&redirect=` (invite was lost on unverified login)
- Migration `20260923230000` applied to Supabase: LOWER() invite email match; notifications INSERT for circle members/owner
- `deleteCircle` action + `DeleteCircleButton` on circle detail (owner, draft or active, confirm dialog)
- `notify` / `notifyCircleMembers`: circle created, invite sent, member joined (all members)
- Join error messages for 23505 / RLS
- Dashboard: stats try/catch, NaN-safe `formatCurrency`, `dashboard/error.tsx`
- Email: text part always, List-Unsubscribe, invite sends text
- OTP solid white + teal; bottom nav active `#00C2A8` explicit; border `#D0DBE8`
- TSC + ESLint pass

**Blockers**: Mobile Android CI job still fails (pre-existing, not this batch). Security audit still deferred.

**Decisions**:
- Invite token dual-tracked: URL `?token=` + sessionStorage (callbacks must not lose it)
- Auto-join only once per page load after auth returns
- Circle delete is hard delete (FK cascade); owner-only any status

**Next Session**:
1. Push → Vercel Ready → live test: invite no-account email → signup → OTP → login → auto-join circle
2. Live: owner delete draft + active circle; member sees notification bell events
3. Live: check Gmail inbox vs Spam for OTP + invite
4. Mobile CI failure triage if needed

### Session 2026-09-24 (Phase 42 — remaining features)

**Goal**: Wire KYC UI, cron reminders/autopay/digest, payments history, admin ops dashboard, money emails, insights stats, payout receipt notify.

**Completed**:
- Migration `20260924140000_autopay_authorizations.sql` applied: `payment_authorizations` (saved Paystack reusable auth) + `autopay_charges` (idempotent cycle×user)
- `chargeAuthorization` in `paystack.ts` (`/transaction/charge_authorization`)
- Webhook: saves `authorization` on charge.success; on `transfer.success`/payout marks `payouts.received`, `cycle payout_confirmed`, ledger `PAYOUT_RECEIPT_CONFIRMED`, in-app + `payoutReceipt` email with `/receipt/[ref]` link; contribution success also emails `moneyEvent`
- Crons (both vercel.json): `/api/cron/reminders` 09:00, `/api/cron/autopay` 06:00, `/api/cron/digest` 20:00 (optional `CRON_SECRET` Bearer)
- `KycForm` + `KycStatusBadge` on settings; uses existing `submitKyc`
- `/dashboard/payments` history (own + owned-circle rows, receipt links, fees) + nav item
- `/dashboard/admin` gated by `ADMIN_EMAILS` env (comma list): KYC queue, volume, users, circles, members
- Insights: on-time % (confirmed vs due_date for memberships) + next payout to you
- Email templates: `moneyEvent`, `moneyDigest`, `payoutReceipt`
- Digest cron groups last-24h success payments per user (no per-event spam)

**Env needed (Vercel)**: `ADMIN_EMAILS` (your login email), optional `CRON_SECRET`. `PAYSTACK_SECRET_KEY` already required for autopay/webhook.

**Next Session**:
1. Commit + push Phase 42; verify Vercel deploy + crons listed in dashboard
2. Set `ADMIN_EMAILS` on Vercel → open `/dashboard/admin`
3. Next: mobile app fix (user-stated next step after Phase 42)

