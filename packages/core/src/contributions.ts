import { createServerClient } from '@turna/database';
import type { Contribution, ContributionCycle, ContributionConfirmation } from '@turna/types';
import { NotFoundError, IllegalStateError, ForbiddenError, ValidationError, ConflictError } from './errors';
import { assertValidAmount } from './money';

interface ReportContributionInput {
  cycle_id: string;
  member_id: string;
  reported_amount: number;
  payment_method?: string;
}

interface ConfirmContributionInput {
  contribution_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export class ContributionService {
  private supabase = createServerClient();

  async reportContribution(input: ReportContributionInput): Promise<Contribution> {
    const { data: cycle } = await this.supabase
      .from('contribution_cycles')
      .select('id, circle_id, status, expected_amount, payout_member_id')
      .eq('id', input.cycle_id)
      .single();

    if (!cycle) throw new NotFoundError('Cycle', input.cycle_id);
    if (cycle.status !== 'collecting') throw new IllegalStateError('Contributions can only be reported in collecting cycles');

    const { data: member } = await this.supabase
      .from('circle_members')
      .select('id, user_id, status')
      .eq('id', input.member_id)
      .eq('circle_id', cycle.circle_id)
      .single();

    if (!member) throw new NotFoundError('Member', input.member_id);
    if (member.status !== 'active') throw new IllegalStateError('Only active members can report contributions');

    const { data: existingContribution } = await this.supabase
      .from('contributions')
      .select('id, status')
      .eq('cycle_id', input.cycle_id)
      .eq('member_id', input.member_id)
      .single();

    if (existingContribution) {
      if (existingContribution.status === 'confirmed') {
        throw new ConflictError('Contribution already confirmed');
      }
      if (existingContribution.status === 'reported') {
        throw new ConflictError('Contribution already reported; awaiting confirmation');
      }
    }

    assertValidAmount(BigInt(input.reported_amount), 'Reported amount');

    if (input.reported_amount !== cycle.expected_amount) {
      throw new ValidationError(`Reported amount must match expected amount: ${cycle.expected_amount}`);
    }

    const { data, error } = await this.supabase
      .from('contributions')
      .upsert({
        cycle_id: input.cycle_id,
        member_id: input.member_id,
        expected_amount: cycle.expected_amount,
        reported_amount: input.reported_amount,
        payment_method: input.payment_method ?? null,
        status: 'reported',
        reported_at: new Date().toISOString(),
      }, {
        onConflict: 'cycle_id,member_id',
      })
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  async confirmContribution(input: ConfirmContributionInput): Promise<ContributionConfirmation> {
    const { data: contribution } = await this.supabase
      .from('contributions')
      .select('*, contribution_cycles!inner(circle_id, payout_member_id)')
      .eq('id', input.contribution_id)
      .single();

    if (!contribution) throw new NotFoundError('Contribution', input.contribution_id);
    if (contribution.status !== 'reported') throw new IllegalStateError('Can only confirm reported contributions');

    const { data: confirmer } = await this.supabase
      .from('circle_members')
      .select('id, user_id, role')
      .eq('id', input.confirmer_id)
      .eq('circle_id', contribution.contribution_cycles.circle_id)
      .single();

    if (!confirmer) throw new ForbiddenError('Confirmer must be a member of this circle');
    if (confirmer.user_id === contribution.member_id) {
      throw new ForbiddenError('A member cannot confirm their own contribution');
    }
    if (confirmer.role !== 'treasurer' && confirmer.role !== 'owner') {
      throw new ForbiddenError('Only treasurer or owner can confirm contributions');
    }

    const { data: existingConfirmation } = await this.supabase
      .from('contribution_confirmations')
      .select('id')
      .eq('contribution_id', input.contribution_id)
      .eq('confirmer_id', input.confirmer_id)
      .single();

    if (existingConfirmation) {
      throw new ConflictError('Already confirmed by this user');
    }

    const { data: confirmation, error: confirmError } = await this.supabase
      .from('contribution_confirmations')
      .insert({
        contribution_id: input.contribution_id,
        confirmer_id: input.confirmer_id,
        decision: input.decision,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (confirmError) throw new ValidationError(confirmError.message);

    if (input.decision === 'approved') {
      const { error: updateError } = await this.supabase
        .from('contributions')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', input.contribution_id);

      if (updateError) throw new ValidationError(updateError.message);
    } else {
      const { error: updateError } = await this.supabase
        .from('contributions')
        .update({ status: 'rejected' })
        .eq('id', input.contribution_id);

      if (updateError) throw new ValidationError(updateError.message);
    }

    return confirmation;
  }

  async getContributionsForCycle(cycleId: string): Promise<Contribution[]> {
    const { data, error } = await this.supabase
      .from('contributions')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getContribution(contributionId: string): Promise<Contribution | null> {
    const { data, error } = await this.supabase
      .from('contributions')
      .select('*')
      .eq('id', contributionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async getConfirmationsForContribution(contributionId: string): Promise<ContributionConfirmation[]> {
    const { data, error } = await this.supabase
      .from('contribution_confirmations')
      .select('*')
      .eq('contribution_id', contributionId)
      .order('created_at', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async startCycleCollection(cycleId: string): Promise<ContributionCycle> {
    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .update({ status: 'collecting' })
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  async completeCycle(cycleId: string): Promise<ContributionCycle> {
    const { data: cycle } = await this.supabase
      .from('contribution_cycles')
      .select('*, contributions(*)')
      .eq('id', cycleId)
      .single();

    if (!cycle) throw new NotFoundError('Cycle', cycleId);

    const allConfirmed = cycle.contributions.every(
      (c: any) => c.status === 'confirmed'
    );

    if (!allConfirmed) {
      throw new IllegalStateError('All contributions must be confirmed before completing cycle');
    }

    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .update({
        status: 'payout_pending',
        completed_at: new Date().toISOString(),
      })
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }
}