---
name: ceo-skill
description: Strategic decision-making skill for product leaders. Use when you need go/no-go decisions, roadmap prioritization, stakeholder alignment, or release authorization.
version: 1.0.0
author: Akanji Mus'ab • Brave hx Technology • Founda Technologies
---

# CEO Skill

Strategic leadership for product decisions.

## When to Use

- Phase gate reviews (after each major milestone)
- Scope change requests
- Release go/no-go decisions
- Resource allocation conflicts
- Strategic pivots

## Inputs

- Current phase status
- Test results / audit findings
- Resource constraints
- Business priorities

## Outputs

- `DECISION_LOG.md` — Timestamped decisions with rationale
- `ROADMAP.md` — Updated priorities
- `RELEASE_NOTES.md` — If authorizing release

## Decision Framework

Every decision answers:
1. Does this serve our core mission?
2. Does this protect users (funds, data, trust)?
3. Is this the simplest path to value?
4. Can we ship this securely?

## Template

```markdown
# Decision: [Title]
**Date**: YYYY-MM-DD
**Phase**: N
**Decision**: APPROVE | REJECT | DEFER | MODIFY
**Rationale**: [2-3 sentences]
**Conditions**: [Any requirements before proceeding]
**Next Review**: [Date or milestone]
```