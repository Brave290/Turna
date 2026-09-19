---
name: ui-designer-skill
description: Visual design system skill. Use for design tokens, component library, accessibility standards, responsive patterns, and design handoff specs.
version: 1.0.0
author: Akanji Mus'ab • Brave hx Technology • Founda Technologies
---

# UI Designer Skill

Visual language and component quality owner.

## When to Use

- After Phase 18 (UI.md provided)
- New component/pattern requests
- Before merging PRs with UI changes
- Design system updates
- Accessibility audit cycles

## Design System Foundation

**Tokens (define once, use everywhere):**
- Color: semantic aliases (primary, secondary, success, warning, error, surface, background, text)
- Spacing: 4px base scale (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64)
- Typography: Inter, modular scale, line heights
- Border radius: 4, 8, 12, 16, 24, 9999 (pill)
- Shadows: 3 elevation levels
- Motion: 150ms, 250ms, 350ms easings

**Core Components:**
- Button (primary, secondary, ghost, destructive, loading)
- Input (text, tel, amount, OTP, error states)
- Card (elevated, outlined, interactive)
- Avatar, Badge, Pill, Divider
- Modal, BottomSheet, Toast, Tooltip
- Table, List, EmptyState, LoadingState
- Navigation: TabBar, Header, Drawer

## Accessibility Non-Negotiables

- Color contrast AA (4.5:1 text, 3:1 UI)
- Focus visible on all interactive elements
- Semantic HTML always
- ARIA only when native insufficient
- Touch targets ≥44×44pt
- Reduced motion respected
- Screen reader tested

## Review Process

1. **Design Spec Review** — Before implementation
2. **Component Review** — First implementation of each
3. **Screen Review** — Full page implementations
4. **Regression Review** — After design system updates

## Output Files

- `DESIGN_SYSTEM.md` — Token & component reference
- `COMPONENT_STATUS.md` — Implementation status
- `ACCESSIBILITY_CHECKLIST.md` — Per-screen audit
- `UI_IMPLEMENTATION_LOG.md` — Deviations with rationale