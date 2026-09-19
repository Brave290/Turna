# Security Audit Process — Turna

**Skill Reference**: `.agents/skills/security-audit/SKILL.md` (Cloudflare security-audit skill)

---

## Audit Triggers

Run security audit **after every phase completion** and **on every PR** touching:
- Authentication / Authorization
- Database schema / RLS policies
- Business logic (contributions, payouts, ledger)
- API endpoints / Server Actions
- Payment / money handling code

---

## Audit Workflow (Per Phase)

### Phase Gate Audit (Mandatory)

After each numbered phase (1-18), the **Pentester Agent** runs:

```bash
# 1. Static analysis
pnpm run security:sast

# 2. Dependency audit
pnpm audit --audit-level=high

# 3. RLS policy tests
pnpm test:rls

# 4. Contract/business logic tests
pnpm test:contracts

# 5. Manual review (Pentester Agent)
#    - Threat model update
#    - Auth/authorization bypass attempts
#    - Business logic abuse
#    - Data validation boundaries
```

### PR Audit (Automated)

GitHub Actions runs on every PR:
- SAST scan
- Dependency audit
- Typecheck + lint
- RLS policy test suite
- Contract test suite

### Release Audit (Comprehensive)

Before any release candidate:
- Full skill workflow (all 6 phases)
- Penetration test simulation
- Threat model complete review
- All `needs_validation` resolved or documented

---

## Turna-Specific Attack Surface

### Trust Boundaries

| Boundary | Lower-Trust Principal | Higher-Trust Resource |
|----------|----------------------|----------------------|
| Circle Isolation | Member of Circle A | Circle B data |
| Role Escalation | Member | Treasurer/Owner actions |
| Ledger Integrity | Any client | Historical events |
| Auth | Unauthenticated | User session |
| Invitation | Token holder | Circle membership |

### Critical Invariants to Validate

1. **Circle Isolation**: `SELECT * FROM circles WHERE id NOT IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())` returns 0 rows
2. **Self-Confirmation Prevention**: No user can confirm their own contribution when independent confirmation required
3. **Ledger Immutability**: `UPDATE ledger_events` and `DELETE FROM ledger_events` fail for all non-superuser roles
4. **Amount Integrity**: All amounts stored as BIGINT minor units, never floating point
5. **State Machine**: Contribution status transitions only follow: `pending → reported → confirmed|rejected|disputed`
6. **Idempotency**: Duplicate contribution reports / confirmations / payouts fail safely
7. **RLS Coverage**: Every table with sensitive data has RLS enabled and tested policies

---

## Audit Artifacts

### Per-Phase Audit Report

Location: `.agents/outputs/phase-N/security_audit.md`

Structure:
```markdown
# Security Audit — Phase N: [Phase Name]

## Scope
- Tables/components reviewed
- Attack classes covered
- Profiles used (quick/standard/deep)

## Findings

### Confirmed
| ID | Severity | Boundary | Result | Fix |
|----|----------|----------|--------|-----|

### Needs Validation
| ID | Hypothesis | Blocker | Plan |

### Rejected
| ID | Claim | Reason |

## Coverage Statement
- Ledger units planned: X
- Units covered: Y
- Gaps: Z (with reason)

## Remediation Required Before Next Phase
- [ ] Critical/High findings fixed
- [ ] Regression tests added
```

### Vulnerability Register

Location: `.agents/outputs/VULNERABILITY_REGISTER.md`

Running log of all findings across phases with:
- Fingerprint (stable hash of root cause)
- Status: confirmed/needs_validation/rejected/remediated
- Phase introduced / Phase remediated
- CVSS score (for confirmed)
- Regression test reference

---

## Integration with Agent Team

### Review Order (Blocking)

1. **Pentester** → Produces audit report, blocks on Critical/High
2. **CTO** → Reviews architecture implications of findings
3. **CEO** → Approves remediation priority vs feature work
4. **UX/UI** → Reviews if fixes impact user flows

### Escalation

- Critical finding → All feature work stops until fixed
- High finding → Must fix before next phase gate
- Medium → Track in sprint, fix within 2 weeks
- Low → Batch fix quarterly

---

## Automation Setup

### GitHub Actions (`.github/workflows/security.yml`)

```yaml
name: Security Audit
on: [push, pull_request]
jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run security:sast
      - run: pnpm audit --audit-level=high
  
  rls-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:16
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:rls
  
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:contracts
```

### Pre-commit Hooks (`.husky/pre-commit`)

```bash
#!/bin/sh
pnpm lint --filter @turna/core --filter @turna/validation --filter @turna/database
pnpm typecheck --filter @turna/core --filter @turna/validation --filter @turna/database
```

---

## Skill Usage

### Full Audit Mode (Phase Gates)

```bash
# From Turna root
cd /public/Turna

# The Pentester Agent loads the skill and runs full workflow
# Output goes to .agents/outputs/phase-N/
```

### Guidance Mode (Ad-hoc Questions)

For specific security questions during development, reference relevant sections:
- RLS policies → `WEB-PROTOCOL-AND-AUTH.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`
- Auth flows → `WEB-PROTOCOL-AND-AUTH.md`
- Business logic → `ATTACK-CLASSES.md` (authorization, logic flaws)
- Realtime → `PROTOCOLS-RPC-AND-MESSAGING.md`
- Mobile → `DESKTOP-MOBILE-AND-LOCAL-IPC.md`

---

## Validation Commands

```bash
# Validate findings JSON schema
node .agents/skills/security-audit/validate-findings.cjs .agents/outputs/phase-N/findings.json

# Validate coverage ledger
node .agents/skills/security-audit/validate-coverage-ledger.cjs .agents/outputs/phase-N/coverage-ledger.json
```

---

## Continuous Improvement

After each audit:
1. Update threat model (`.agents/outputs/THREAT_MODEL.md`)
2. Add regression tests for confirmed findings
3. Update RLS test coverage for new tables/policies
4. Review and update attack class coverage
5. Document any `needs_validation` resolutions