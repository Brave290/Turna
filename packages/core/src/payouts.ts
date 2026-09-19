import { createServerClient } from '@turna/database';
import type { Payout, ContributionCycle, PayoutConfirmation } from '@turna/types';
import { NotFoundError, IllegalStateError, ForbiddenError, ValidationError, ConflictError } from './errors';
import { assertValidAmount } from './money';

interface InitiatePayoutInput {
  cycle_id: string;
  initiator_id: string;
  actual_amount?: number;
  notes?: string;
}

interface ConfirmPayoutInput {
  payout_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export class PayoutService {
  private supabase = createServerClient();

  async initiatePayout(input: InitiatePayoutInput): Promise<Payout> {
    const { data: cycle } = await this.supabase
      .from('contribution_cycles')
      .select('id, circle_id, status, expected_amount, payout_member_id')
      .eq('id', input.cycle_id)
      .single();

    if (!cycle) throw new NotFoundError('Cycle', input.cycle_id);
    if (cycle.status !== 'payout_pending') throw new IllegalStateError('Payout can only be initiated for completed cycles');
    if (!cycle.payout_member_id) throw new IllegalStateError('No payout recipient assigned for this cycle');

    const { data: initiator } = await this.supabase
      .from('circle_members')
      .select('id, user_id, role')
      .eq('id', input.initiator_id)
      .eq('circle_id', cycle.circle_id)
      .single();

    if (!initiator) throw new ForbiddenError('Initiator must be a member of this circle');
    if (initiator.role !== 'treasurer' && initiator.role !== 'owner') {
      throw new ForbiddenError('Only treasurer or owner can initiate payouts');
    }

    const { data: existingPayout } = await this.supabase
      .from('payouts')
      .select('id, status')
      .eq('cycle_id', input.cycle_id)
      .single();

    if (existingPayout) {
      if (existingPayout.status === 'sent' || existingPayout.status === 'received') {
        throw new ConflictError('Payout already completed');
      }
      if (existingPayout.status === 'initiated') {
        throw new ConflictError('Payout already initiated');
      }
    }

    const actualAmount = input.actual_amount ?? cycle.expected_amount;
    assertValidAmount(BigInt(actualAmount), 'Actual amount');

    const { data, error } = await this.supabase
      .from('payouts')
      .upsert({
        cycle_id: input.cycle_id,
        recipient_member_id: cycle.payout_member_id,
        expected_amount: cycle.expected_amount,
        actual_amount: actualAmount,
        status: 'initiated',
        initiated_at: new Date().toISOString(),
        notes: input.notes ?? null,
      }, {
        onConflict: 'cycle_id,recipient_member_id',
      })
      .select()
      .single();

    if (error) throw new ValidationError(error.message);

    await this.supabase
      .from('contribution_cycles')
      .update({ status: 'payout_initiated' })
      .eq('id', input.cycle_id);

    return data;
  }

  async markPayoutSent(payoutId: string, actorId: string): Promise<Payout> {
    const { data: payout } = await this.supabase
      .from('payouts')
      .select('*, contribution_cycles!inner(circle_id)')
      .eq('id', payoutId)
      .single();

    if (!payout) throw new NotFoundError('Payout', payoutId);
    if (payout.status !== 'initiated') throw new IllegalStateError('Can only mark initiated payouts as sent');

    const { data: actor } = await this.supabase
      .from('circle_members')
      .select('id, user_id, role')
      .eq('id', actorId)
      .eq('circle_id', payout.contribution_cycles.circle_id)
      .single();

    if (!actor) throw new ForbiddenError('Actor must be a member of this circle');
    if (actor.role !== 'treasurer' && actor.role !== 'owner') {
      throw new ForbiddenError('Only treasurer or owner can mark payouts as sent');
    }

    const { data, error } = await this.supabase
      .from('payouts')
      .update({
        status: 'sent',
        notes: (payout.notes ?? '') + '\nMarked sent by treasurer/owner',
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  async confirmPayoutReceipt(input: ConfirmPayoutInput): Promise<PayoutConfirmation> {
    const { data: payout } = await this.supabase
      .from('payouts')
      .select('*, contribution_cycles!inner(circle_id)')
      .eq('id', input.payout_id)
      .single();

    if (!payout) throw new NotFoundError('Payout', input.payout_id);
    if (payout.status !== 'sent') throw new IllegalStateError('Can only confirm sent payouts');

    const { data: recipient } = await this.supabase
      .from('circle_members')
      .select('id, user_id')
      .eq('id', payout.recipient_member_id)
      .single();

    if (!recipient) throw new NotFoundError('Recipient member', payout.recipient_member_id);
    if (recipient.user_id !== input.confirmer_id) {
      throw new ForbiddenError('Only the recipient can confirm receipt');
    }

    const { data: existingConfirmation } = await this.supabase
      .from('payout_confirmations')
      .select('id')
      .eq('payout_id', input.payout_id)
      .eq('confirmer_id', input.confirmer_id)
      .single();

    if (existingConfirmation) {
      throw new ConflictError('Already confirmed by this user');
    }

    const { data: confirmation, error: confirmError } = await this.supabase
      .from('payout_confirmations')
      .insert({
        payout_id: input.payout_id,
        confirmer_id: input.confirmer_id,
        decision: input.decision,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (confirmError) throw new ValidationError(confirmError.message);

    if (input.decision === 'approved') {
      const { error: updateError } = await this.supabase
        .from('payouts')
        .update({
          status: 'received',
          confirmed_at: new Date().toISOString(),
          confirmed_by: input.confirmer_id,
        })
        .eq('id', input.payout_id);

      if (updateError) throw new ValidationError(updateError.message);

      await this.supabase
        .from('contribution_cycles')
        .update({ status: 'completed' })
        .eq('id', payout.contribution_cycles.id);
    } else {
      const { error: updateError } = await this.supabase
        .from('payouts')
        .update({ status: 'disputed' })
        .eq('id', input.payout_id);

      if (updateError) throw new ValidationError(updateError.message);

      await this.supabase
        .from('contribution_cycles')
        .update({ status: 'disputed' })
        .eq('id', payout.contribution_cycles.id);
    }

    return confirmation;
  }

  async getPayoutForCycle(cycleId: string): Promise<Payout | null> {
    const { data, error } = await this.supabase
      .from('payouts')
      .select('*')
      .eq('cycle_id', cycleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async getPayoutConfirmations(payoutId: string): Promise<PayoutConfirmation[]> {
    const { data, error } = await this.supabase
      .from('payout_confirmations')
      .select('*')
      .eq('payout_id', payoutId)
      .order('created_at', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }
}