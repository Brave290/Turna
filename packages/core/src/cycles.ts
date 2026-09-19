import { createServerClient } from '@turna/database';
import type { ContributionCycle } from '@turna/types';
import { NotFoundError, ValidationError, IllegalStateError } from './errors';

export class CycleService {
  private supabase = createServerClient();

  async createCyclesForCircle(circleId: string, count: number, startDate: string): Promise<ContributionCycle[]> {
    const { data: circle } = await this.supabase
      .from('circles')
      .select('id, contribution_amount, member_limit')
      .eq('id', circleId)
      .single();

    if (!circle) throw new NotFoundError('Circle', circleId);

    const cycles = [];
    const start = new Date(startDate);
    
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      
      cycles.push({
        circle_id: circleId,
        cycle_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        expected_amount: circle.contribution_amount,
        status: 'pending' as const,
      });
    }

    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .insert(cycles)
      .select();

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getCyclesForCircle(circleId: string): Promise<ContributionCycle[]> {
    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .select('*')
      .eq('circle_id', circleId)
      .order('cycle_number', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getCycle(cycleId: string): Promise<ContributionCycle | null> {
    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async getCurrentCycle(circleId: string): Promise<ContributionCycle | null> {
    const { data: circle } = await this.supabase
      .from('circles')
      .select('current_cycle')
      .eq('id', circleId)
      .single();

    if (!circle) throw new NotFoundError('Circle', circleId);

    return this.getCycleByNumber(circleId, circle.current_cycle);
  }

  async getCycleByNumber(circleId: string, cycleNumber: number): Promise<ContributionCycle | null> {
    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .select('*')
      .eq('circle_id', circleId)
      .eq('cycle_number', cycleNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async advanceCycle(circleId: string): Promise<ContributionCycle> {
    const { data: circle } = await this.supabase
      .from('circles')
      .select('current_cycle')
      .eq('id', circleId)
      .single();

    if (!circle) throw new NotFoundError('Circle', circleId);

    const nextCycleNumber = circle.current_cycle + 1;
    const { data: nextCycle } = await this.supabase
      .from('contribution_cycles')
      .select('*')
      .eq('circle_id', circleId)
      .eq('cycle_number', nextCycleNumber)
      .single();

    if (!nextCycle) throw new IllegalStateError('No more cycles available');

    const { data, error } = await this.supabase
      .from('circles')
      .update({ current_cycle: nextCycleNumber })
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return nextCycle;
  }

  async assignPayoutMember(cycleId: string, memberId: string): Promise<ContributionCycle> {
    const { data, error } = await this.supabase
      .from('contribution_cycles')
      .update({ payout_member_id: memberId, status: 'collecting' })
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  async getPayoutSchedule(circleId: string): Promise<Array<{ cycle: ContributionCycle; member: any }>> {
    const cycles = await this.getCyclesForCircle(circleId);
    const { data: members } = await this.supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circleId)
      .eq('status', 'active');

    const memberMap = new Map((members ?? []).map(m => [m.id, m]));

    return cycles.map(cycle => ({
      cycle,
      member: cycle.payout_member_id ? memberMap.get(cycle.payout_member_id) : null,
    }));
  }
}