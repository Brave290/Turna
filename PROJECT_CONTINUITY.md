# Project Continuity — Turna

**Purpose**: Enable seamless handoff between sessions, agents, and team members. Contains all context needed to resume work without loss of momentum.

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

### Phase 28: Dashboard Shell + Real Auth — In Progress (2026-09-22)

**Completed this session**:
- Real auth: login/signup/forgot-password call Supabase server actions with spinners + error surfaces
- `signIn` honors `?redirect=` safely; signup redirects to `/dashboard` when session exists
- OAuth/OTP callback route: `apps/web/src/app/auth/callback/route.ts`
- Profile auto-create trigger + backfill + full RLS policies applied via `supabase db query --linked` (`20260922230000_profiles_rls_realtime.sql`)
- Dashboard shell: desktop sidebar + mobile top/bottom nav, middleware + layout auth guard
- Live pages (Supabase, not demo): overview stats, circles list/detail/create, invite form, contributions, payouts list, ledger, notifications, insights, settings/profile
- APK fix kept: `debuggableVariants = []` so debug APKs embed JS bundle
- **Env policy**: secrets only in Vercel project env (project `turna` / `prj_8VPRC7xoqlKomwV4PHzSr2TRTgbJ`) — do not commit `.env*`
- Vercel env already has: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (=https://turnaapp.vercel.app), `NODE_ENV`

**Next**:
1. Commit + push → CI + Vercel deploy to https://turnaapp.vercel.app
2. Verify login → `/dashboard` with real data
3. Payout confirm actions + invite email delivery (Resend key still empty)
4. Explain/`set` `ANDROID_SIGNING_*` GitHub secrets before first release tag
5. Contribution report/confirm UI flows

**Key files**:
- `apps/web/src/lib/auth-actions.ts` — signIn/signUp/reset/createCircle/invite/updateProfile
- `apps/web/src/lib/dashboard-data.ts` — server data loaders
- `apps/web/src/app/dashboard/**` — shell + pages
- `apps/web/src/components/dashboard/nav.tsx` — sidebar/bottom nav
- `supabase/migrations/20260922230000_profiles_rls_realtime.sql` — profile trigger + RLS
- `apps/mobile/android/app/build.gradle` — `debuggableVariants = []`

**Env / deploy**:
- Vercel CLI linked to project `turna` (GitHub Brave290/Turna → turnaapp.vercel.app)
- Supabase CLI linked to `dhedoxczmbwrgetibvmy` — use `supabase db query --linked` from `/public/Turna`
- Never put API keys in tracked files

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