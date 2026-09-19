# Build and Deployment Checklist — Turna

**Purpose**: Mandatory checks before any commit, PR merge, or deployment. No exceptions.

---

## Pre-Commit (Local)

Run before every commit:

```bash
# 1. Install/check dependencies
pnpm install --frozen-lockfile

# 2. Lint all packages
pnpm lint

# 3. Typecheck all packages
pnpm typecheck

# 4. Unit tests (fast)
pnpm test --run --reporter=verbose

# 5. Security audit (fast)
pnpm audit --audit-level=high

# 6. Build verification
pnpm build
```

**Must pass**: All 6 steps. No warnings treated as errors in lint/typecheck.

---

## Pre-PR (Before Push)

```bash
# 1. All pre-commit checks
# 2. Full test suite
pnpm test --run

# 3. RLS policy tests
pnpm test:rls

# 4. Contract/business logic tests
pnpm test:contracts

# 5. Database migration test
pnpm db:reset && pnpm db:migrate && pnpm db:seed

# 6. Generate types from DB
pnpm db:generate
pnpm typecheck

# 7. Security scan
pnpm run security:sast
```

---

## PR Requirements

### Required Checks (GitHub Actions)
- [ ] `lint` — All packages
- [ ] `typecheck` — All packages
- [ ] `test` — Unit + integration
- [ ] `rls-tests` — Database policy tests
- [ ] `contract-tests` — Business logic tests
- [ ] `sast` — Static analysis
- [ ] `dependency-audit` — No high/critical vulns
- [ ] `build:web` — Next.js compiles
- [ ] `build:mobile` — Android compiles (if mobile changes)

### Required Reviews
- [ ] **Pentester Agent** — Security audit (blocks on Critical/High)
- [ ] **CTO Agent** — Architecture review
- [ ] **Code Owner** — Domain-specific review

### PR Metadata
- [ ] Linked to phase issue (e.g., `phase-3: database schema`)
- [ ] ADR updated if architecture decision
- [ ] Migration file included if schema change
- [ ] Seed data updated if new entities
- [ ] Documentation updated (architecture.md, database.md, etc.)

---

## Pre-Merge (Main Branch)

```bash
# 1. All PR checks pass
# 2. Main branch up to date
git fetch origin main && git rebase origin/main

# 3. Run full suite again on rebased code
pnpm lint && pnpm typecheck && pnpm test --run

# 4. Security audit on merged state
pnpm run security:sast
pnpm audit --audit-level=high

# 5. Deploy preview (Vercel/Netlify)
#    Auto-deploy on merge to main
```

---

## Deployment Checklist

### Staging (Auto on main merge)

- [ ] Vercel preview deployment succeeds
- [ ] Supabase migrations applied to staging
- [ ] Seed data loaded in staging
- [ ] Smoke tests pass:
  - [ ] Auth: phone OTP login works
  - [ ] Circle: create, invite, join
  - [ ] Contribution: report, confirm
  - [ ] Payout: initiate, confirm receipt
  - [ ] Ledger: events created, immutable
  - [ ] Realtime: updates propagate
  - [ ] Notifications: in-app received

### Production (Manual, CEO Approval)

**Pre-deploy**:
- [ ] CEO Agent: `GO` decision in `DECISION_LOG.md`
- [ ] CTO Agent: `ARCHITECTURE_REVIEW.md` signed off
- [ ] Pentester: Release audit complete, 0 Critical/High
- [ ] All `needs_validation` resolved or documented
- [ ] Database backup verified (Supabase PITR)
- [ ] Rollback plan documented

**Deploy**:
- [ ] Vercel production deploy
- [ ] Supabase migrations (if any) — run during low traffic
- [ ] Verify production health:
  - [ ] Auth works
  - [ ] API responds <500ms p95
  - [ ] Realtime connects
  - [ ] No error spike in logs

**Post-deploy**:
- [ ] Smoke test critical paths
- [ ] Monitor error rates 30 min
- [ ] Update `RELEASE_NOTES.md`
- [ ] Tag release: `git tag vX.Y.Z`

---

## Rollback Procedure

```bash
# 1. Vercel: Instant rollback to previous deployment
vercel rollback [deployment-url]

# 2. Supabase: If migration caused issue
#    - Supabase Dashboard → Database → Backups → Restore
#    - Or: PITR to timestamp before migration

# 3. Mobile: Previous build in Play Store / TestFlight

# 4. Document incident in INCIDENT_LOG.md
```

---

## Environment Promotion

| Environment | Branch | Trigger | Approval |
|-------------|--------|---------|----------|
| Local | any | Manual | None |
| Preview (Vercel) | any PR | Auto | PR checks |
| Staging | main | Auto merge | All checks |
| Production | main (tagged) | Manual | CEO + CTO + Pentester |

---

## Versioning

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking API/schema changes, major auth/arch changes
- **MINOR**: New features, new tables, backward-compatible
- **PATCH**: Bug fixes, security patches, doc updates

**Release Tags**: `v1.0.0`, `v1.1.0`, `v1.1.1`

**Changelog**: `CHANGELOG.md` (Keep a Changelog format)

---

## Monitoring & Alerting

### Required Alerts (Post-Deploy)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | >1% | Page on-call |
| API latency p95 | >1s | Alert |
| Auth failure rate | >5% | Page on-call |
| DB CPU | >80% | Alert |
| Realtime disconnects | >10/min | Alert |
| Failed migrations | Any | Page on-call |

### Dashboards

- Vercel Analytics
- Supabase Dashboard (Database, Auth, Realtime)
- Custom: Business metrics (circles created, contributions, payouts)

---

## Compliance & Audit Trail

Every deployment must be traceable:

- Git tag ↔ Vercel deployment ↔ Supabase migration
- `DEPLOYMENT_LOG.md` with:
  - Version, date, author
  - Git commit SHA
  - Vercel deployment URL
  - Supabase migration IDs applied
  - CEO/CTO/Pentester approvals
  - Rollback info (if applicable)

---

## Emergency Procedures

### Security Incident

1. **Contain**: Revoke compromised keys, disable affected features
2. **Assess**: Pentester leads investigation
3. **Communicate**: CEO coordinates user notification if needed
4. **Fix**: CTO directs emergency patch
5. **Deploy**: Emergency release (bypass normal gate, but Pentester reviews post-deploy)
6. **Post-mortem**: Within 48h, documented in `INCIDENT_LOG.md`

### Data Incident

1. Supabase PITR restore to pre-incident
2. Verify ledger integrity (hash chain validation)
3. Audit all affected circles
4. Notify affected users per regulatory requirements

---

## Checklist Enforcement

**No checklist = no merge = no deploy.**

Automation enforces:
- GitHub branch protection: require all checks + reviews
- Vercel: only deploy from main with passing checks
- Supabase: migrations only via CI/CD pipeline
- Mobile: Fastlane/Gradle only from tagged releases