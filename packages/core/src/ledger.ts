import { createServerClient } from '@turna/database';
import type { LedgerEvent, Json } from '@turna/types';
import { NotFoundError, ValidationError } from './errors';

interface LedgerEventInput {
  circle_id: string;
  actor_id: string;
  event_type: LedgerEvent['event_type'];
  entity_type: string;
  entity_id: string;
  payload?: Json;
}

export class LedgerService {
  private supabase = createServerClient();

  async appendEvent(input: LedgerEventInput): Promise<LedgerEvent> {
    const { data: previousEvent } = await this.supabase
      .from('ledger_events')
      .select('id')
      .eq('circle_id', input.circle_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await this.supabase
      .from('ledger_events')
      .insert({
        circle_id: input.circle_id,
        actor_id: input.actor_id,
        event_type: input.event_type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        payload: input.payload ?? {},
        previous_event_id: previousEvent?.id ?? null,
      })
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  async getEventsForCircle(
    circleId: string,
    options?: { limit?: number; offset?: number; event_type?: LedgerEvent['event_type'] }
  ): Promise<LedgerEvent[]> {
    let query = this.supabase
      .from('ledger_events')
      .select('*')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false });

    if (options?.event_type) {
      query = query.eq('event_type', options.event_type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getEventsForEntity(entityType: string, entityId: string): Promise<LedgerEvent[]> {
    const { data, error } = await this.supabase
      .from('ledger_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getEvent(eventId: string): Promise<LedgerEvent | null> {
    const { data, error } = await this.supabase
      .from('ledger_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async verifyChainIntegrity(circleId: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const events = await this.getEventsForCircle(circleId, { limit: 1000 });
    
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];
      
      if (current.previous_event_id !== next.id) {
        return { valid: false, brokenAt: current.id };
      }
    }
    
    return { valid: true };
  }

  async getLatestEvent(circleId: string): Promise<LedgerEvent | null> {
    const events = await this.getEventsForCircle(circleId, { limit: 1 });
    return events[0] ?? null;
  }
}

export const ledgerEventFactory = {
  circleCreated: (circleId: string, actorId: string, payload: Json) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_CREATED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload,
  }),

  circleUpdated: (circleId: string, actorId: string, payload: Json) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_UPDATED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload,
  }),

  circlePaused: (circleId: string, actorId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_PAUSED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: {},
  }),

  circleResumed: (circleId: string, actorId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_RESUMED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: {},
  }),

  circleCompleted: (circleId: string, actorId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_COMPLETED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: {},
  }),

  circleCancelled: (circleId: string, actorId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CIRCLE_CANCELLED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: {},
  }),

  memberInvited: (circleId: string, actorId: string, inviteePhone: string, memberId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'MEMBER_INVITED' as const,
    entity_type: 'invitation',
    entity_id: memberId,
    payload: { invitee_phone: inviteePhone },
  }),

  memberJoined: (circleId: string, actorId: string, memberId: string, payoutPosition: number) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'MEMBER_JOINED' as const,
    entity_type: 'circle_member',
    entity_id: memberId,
    payload: { payout_position: payoutPosition },
  }),

  memberLeft: (circleId: string, actorId: string, memberId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'MEMBER_LEFT' as const,
    entity_type: 'circle_member',
    entity_id: memberId,
    payload: {},
  }),

  memberRemoved: (circleId: string, actorId: string, memberId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'MEMBER_REMOVED' as const,
    entity_type: 'circle_member',
    entity_id: memberId,
    payload: {},
  }),

  memberRoleChanged: (circleId: string, actorId: string, memberId: string, oldRole: string, newRole: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'MEMBER_ROLE_CHANGED' as const,
    entity_type: 'circle_member',
    entity_id: memberId,
    payload: { old_role: oldRole, new_role: newRole },
  }),

  payoutOrderSet: (circleId: string, actorId: string, positions: Array<{ member_id: string; position: number }>) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'PAYOUT_ORDER_SET' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: { positions },
  }),

  contributionReported: (circleId: string, actorId: string, contributionId: string, amount: number, paymentMethod?: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CONTRIBUTION_REPORTED' as const,
    entity_type: 'contribution',
    entity_id: contributionId,
    payload: { amount, payment_method: paymentMethod },
  }),

  contributionConfirmed: (circleId: string, actorId: string, contributionId: string, confirmerId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CONTRIBUTION_CONFIRMED' as const,
    entity_type: 'contribution',
    entity_id: contributionId,
    payload: { confirmer_id: confirmerId },
  }),

  contributionRejected: (circleId: string, actorId: string, contributionId: string, confirmerId: string, note?: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CONTRIBUTION_REJECTED' as const,
    entity_type: 'contribution',
    entity_id: contributionId,
    payload: { confirmer_id: confirmerId, note },
  }),

  contributionDisputed: (circleId: string, actorId: string, contributionId: string, reason: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CONTRIBUTION_DISPUTED' as const,
    entity_type: 'contribution',
    entity_id: contributionId,
    payload: { reason },
  }),

  payoutInitiated: (circleId: string, actorId: string, payoutId: string, amount: number) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'PAYOUT_INITIATED' as const,
    entity_type: 'payout',
    entity_id: payoutId,
    payload: { amount },
  }),

  payoutMarkedSent: (circleId: string, actorId: string, payoutId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'PAYOUT_MARKED_SENT' as const,
    entity_type: 'payout',
    entity_id: payoutId,
    payload: {},
  }),

  payoutReceiptConfirmed: (circleId: string, actorId: string, payoutId: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'PAYOUT_RECEIPT_CONFIRMED' as const,
    entity_type: 'payout',
    entity_id: payoutId,
    payload: {},
  }),

  payoutDisputed: (circleId: string, actorId: string, payoutId: string, reason: string) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'PAYOUT_DISPUTED' as const,
    entity_type: 'payout',
    entity_id: payoutId,
    payload: { reason },
  }),

  cycleStarted: (circleId: string, actorId: string, cycleId: string, cycleNumber: number) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CYCLE_STARTED' as const,
    entity_type: 'contribution_cycle',
    entity_id: cycleId,
    payload: { cycle_number: cycleNumber },
  }),

  cycleCompleted: (circleId: string, actorId: string, cycleId: string, cycleNumber: number) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'CYCLE_COMPLETED' as const,
    entity_type: 'contribution_cycle',
    entity_id: cycleId,
    payload: { cycle_number: cycleNumber },
  }),

  settingsChanged: (circleId: string, actorId: string, changes: Json) => ({
    circle_id: circleId,
    actor_id: actorId,
    event_type: 'SETTINGS_CHANGED' as const,
    entity_type: 'circle',
    entity_id: circleId,
    payload: { changes },
  }),
};