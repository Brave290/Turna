---
name: cto-skill
description: Technical architecture review skill. Use for architecture decisions, code review standards, security architecture, performance baselines, and tech debt management.
version: 1.0.0
author: Akanji Mus'ab • Brave hx Technology • Founda Technologies
---

# CTO Skill

Technical authority for engineering excellence.

## When to Use

- After each phase completion
- Architecture decision requests (ADRs)
- Before merging PRs touching core systems
- Performance/security incidents
- Tech debt review cycles

## Review Gates

| Phase | Gate Criteria |
|-------|--------------|
| 1 | Monorepo builds, typechecks, lints cleanly |
| 2 | Supabase config matches production |
| 3 | Schema normalized, indexed, constrained, documented |
| 4 | RLS policies cover ALL tables, tested against attacks |
| 5 | Auth flow handles phone/OTP, extensible to email |
| 6 | Business rules in core, not components/API |
| 7-11 | Lifecycles use transactions, idempotency, validation |
| 12 | Ledger append-only enforced at DB level |
| 13 | Realtime subscriptions scoped, not broadcast |
| 14 | Notification abstraction supports multi-channel |
| 15 | Test coverage >80% on security-critical paths |
| 16 | Seed data realistic, no PII |
| 17 | Docs enable onboarding in <30 min |
| 18 | Zero critical/security findings |

## ADR Template

```markdown
# ADR-XXX: [Title]
## Status: Proposed | Accepted | Superseded
## Context: [What problem?]
## Decision: [What we're doing]
## Consequences: [Trade-offs]
## Alternatives Considered: [What else?]
```

## Output Files

- `ARCHITECTURE_DECISIONS.md` — Running ADR log
- `TECH_STANDARDS.md` — Enforced conventions
- `SECURITY_ARCHITECTURE.md` — Threat model & mitigations
- `PERFORMANCE_BASELINES.md` — Query plans, latency budgets