# Turna Architecture

## Overview

Turna is a monorepo with shared packages powering a Next.js web app and React Native mobile app, backed by Supabase (PostgreSQL + Auth + Realtime).

```
┌─────────────────────────────────────────────────────────────┐
│                      Turna Monorepo                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  @turna/web  │ @turna/mobile│ @turna/core  │ @turna/database│
│  (Next.js)   │ (React Native)│ (Business    │ (Supabase      │
│              │              │  Logic)      │  Client)       │
├──────────────┼──────────────┼──────────────┼────────────────┤
│  @turna/types│ @turna/      │ @turna/      │ @turna/config  │
│  (Generated) │ validation   │ validation   │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Supabase      │
                    │  • PostgreSQL   │
                    │  • Auth         │
                    │  • Realtime     │
                    │  • Storage      │
                    └─────────────────┘
```

## Data Flow

### Write Path (Mutations)
```
User Action → Server Action / API Route
    → Validation (Zod) → Business Logic (@turna/core)
    → Database Transaction (Supabase)
    → Ledger Event Created
    → Realtime Broadcast
    → Notification Queued
```

### Read Path (Queries)
```
Component → Server Component / Client Hook
    → Supabase Client (RLS enforced)
    → Typed Response (@turna/types)
    → UI Render
```

### Realtime Updates
```
DB Change → Supabase Realtime → WebSocket
    → Client Subscription → State Update → Re-render
```

## Key Architectural Decisions

### 1. Append-Only Ledger
- `ledger_events` table is **never** updated or deleted
- Every state change creates a new event with `previous_event_id` chain
- Corrections create new events (e.g., `CONTRIBUTION_CORRECTION_REQUESTED`)
- Chain integrity verifiable via `LedgerService.verifyChainIntegrity()`

### 2. Money Handling
- All amounts stored as **BIGINT minor units** (kobo for NGN)
- `50,000 NGN = 5,000,000 kobo`
- No floating-point arithmetic anywhere
- Utilities in `@turna/core/money.ts`

### 3. Authentication
- Supabase Auth with **phone/OTP** (primary)
- Email auth extensible via same profile table
- `profiles` table separate from `auth.users`
- Service role key **never** in client bundles

### 4. Authorization (Defense in Depth)
| Layer | Mechanism |
|-------|-----------|
| Database | Row Level Security (RLS) on all tables |
| API | Server-side role/membership checks in `@turna/core` |
| Client | UI hides unavailable actions (not security) |

### 5. Two-Party Confirmation
```
Member reports contribution → CONTRIBUTION_REPORTED
    ↓
Treasurer/Owner reviews → CONTRIBUTION_CONFIRMED (or REJECTED)
    ↓
If approved → status = 'confirmed', confirmed_at set
    ↓
If all confirmed → cycle → payout_pending
```

### 6. Payout Flow
```
Cycle completed → PAYOUT_PENDING
    ↓
Treasurer initiates → PAYOUT_INITIATED (expected/actual amount)
    ↓
Treasurer marks sent → PAYOUT_MARKED_SENT
    ↓
Recipient confirms → PAYOUT_RECEIPT_CONFIRMED
    ↓
Cycle → COMPLETED
```

## Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `@turna/database` | Supabase client, migrations, seed |
| `@turna/types` | Generated DB types + domain types |
| `@turna/validation` | Zod schemas (shared web/mobile) |
| `@turna/core` | All business logic, services, errors |
| `@turna/config` | Shared constants, env validation |
| `@turna/web` | Next.js App Router, Server Actions |
| `@turna/mobile` | React Native CLI, same core/services |

## Security Model

### Circle Isolation
```sql
-- RLS Policy: User can only see circles they're active members of
CREATE POLICY circle_isolation ON circles
  USING (id IN (
    SELECT circle_id FROM circle_members 
    WHERE user_id = auth.uid() AND status = 'active'
  ));
```

### Self-Confirmation Prevention
```typescript
// In ContributionService.confirmContribution()
if (confirmer.user_id === contribution.member_id) {
  throw new ForbiddenError('A member cannot confirm their own contribution');
}
```

### Ledger Immutability
```sql
-- RLS: No UPDATE/DELETE for regular users
CREATE POLICY ledger_immutable ON ledger_events
  FOR UPDATE USING (false);
CREATE POLICY ledger_immutable ON ledger_events
  FOR DELETE USING (false);
```

## Scalability Considerations

- **Indexes**: All FK columns, status columns, `(circle_id, created_at)` for ledger
- **Pagination**: Cursor-based for ledger, offset for lists
- **Realtime**: Per-circle subscriptions, not global
- **Caching**: Next.js cache for circle metadata, SWR for client data

## Deployment

- **Web**: Vercel (auto-deploy on main)
- **Database**: Supabase Cloud (managed PostgreSQL)
- **Mobile**: EAS Build → Play Store / TestFlight
- **Migrations**: CI/CD pipeline applies to staging/prod