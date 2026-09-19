---
name: ux-designer-skill
description: User experience design skill. Use for user flows, information architecture, usability validation, onboarding, and journey mapping.
version: 1.0.0
author: Akanji Mus'ab • Brave hx Technology • Founda Technologies
---

# UX Designer Skill

User advocacy at every step.

## When to Use

- After Phase 1 (initial flows)
- After Phase 7 (circle lifecycle flows)
- After Phase 11 (payout flows)
- Before Phase 18 (final flow validation)
- New feature/flow requests
- Post-release usability review

## Core User Journeys

### 1. Circle Creation → First Payout
```
New User → Onboarding → Create Circle → Invite Members → Members Join
    → Set Payout Order → Start Circle → Cycle 1 Contributions
    → Confirmations → Payout → Recipient Confirms → Cycle 2...
```

### 2. Member Joining Existing Circle
```
Invite Received → View Circle Details → Accept → Verify Phone
    → See Payout Position → Wait for Start → Contribute...
```

### 3. Contribution Cycle
```
Notification: "Cycle X due" → Open App → See Amount Due
    → Report Payment (amount, method) → Wait for Confirmation
    → See Status: Confirmed/Rejected/Disputed
```

### 4. Payout Reception
```
Notification: "Your turn to collect" → Verify Amount
    → Mark Received → Confirm Receipt → See Updated History
```

## Key UX Principles

1. **Transparency by default** — Everything visible, nothing hidden
2. **Trust through clarity** — Plain language, no jargon
3. **Error prevention > error recovery** — Confirm destructive actions
4. **Progress visible** — Always know where you are in a cycle
5. **Offline-resilient** — Core info cached, sync when online
6. **Cultural resonance** — Language/symbols familiar to Ajo/Esusu/Susu users

## Critical Flow Requirements

| Flow | Must Have |
|------|-----------|
| Onboarding | <3 min, phone verify, no email required |
| Circle Create | Name, amount, frequency, members, payout order ≤5 steps |
| Invite | SMS + deep link, expires 72h, one-tap accept |
| Contribution | Report → Confirm → Visible to all members |
| Payout | Initiate → Sender confirms sent → Recipient confirms received |
| Dispute | File → Evidence → Resolution → All logged in ledger |

## Output Files

- `USER_JOURNEYS.md` — Complete flow diagrams
- `INFORMATION_ARCHITECTURE.md` — Nav structure, IA
- `FLOW_SPECIFICATIONS.md` — Detailed step-by-step
- `USABILITY_METRICS.md` — Task success, time-on-task
- `ONBOARDING_FLOW.md` — Screen-by-screen onboarding