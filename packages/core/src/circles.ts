import { createServerClient } from '@turna/database';
import type { Circle, CircleMember, Invitation, ContributionCycle, Contribution, Payout, LedgerEvent } from '@turna/types';
import { TurnaError, ForbiddenError, NotFoundError, IllegalStateError, ValidationError } from './errors';
import { toMinorUnits, fromMinorUnits, assertValidAmount } from './money';
import { v4 as uuidv4 } from 'uuid';

interface CircleCreateInput {
  name: string;
  description?: string;
  contribution_amount: number;
  currency?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  member_limit?: number;
  start_date?: string;
  owner_id: string;
}

export class CircleService {
  private supabase = createServerClient();

  async createCircle(input: CircleCreateInput): Promise<Circle> {
    const { data, error } = await this.supabase
      .from('circles')
      .insert({
        name: input.name,
        description: input.description ?? null,
        owner_id: input.owner_id,
        contribution_amount: input.contribution_amount,
        currency: input.currency ?? 'NGN',
        frequency: input.frequency ?? 'monthly',
        member_limit: input.member_limit ?? 10,
        status: 'draft',
        current_cycle: 0,
        start_date: input.start_date ?? null,
      })
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async getCircle(circleId: string): Promise<Circle | null> {
    const { data, error } = await this.supabase
      .from('circles')
      .select()
      .eq('id', circleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new TurnaError(error.message, 'DB_ERROR', 500);
    }
    return data;
  }

  async getCirclesForUser(userId: string): Promise<Circle[]> {
    const { data, error } = await this.supabase
      .from('circles')
      .select(`
        *,
        circle_members!inner(user_id)
      `)
      .eq('circle_members.user_id', userId)
      .eq('circle_members.status', 'active');

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data ?? [];
  }

  async updateCircle(circleId: string, updates: Partial<Circle>, actorId: string): Promise<Circle> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);

    if (circle.owner_id !== actorId) {
      throw new ForbiddenError('Only the circle owner can update settings');
    }

    if (circle.status !== 'draft' && updates.status && updates.status !== circle.status) {
      throw new IllegalStateError('Cannot change status directly; use pause/resume/cancel');
    }

    const { data, error } = await this.supabase
      .from('circles')
      .update(updates)
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async pauseCircle(circleId: string, actorId: string): Promise<Circle> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.owner_id !== actorId) throw new ForbiddenError('Only owner can pause');
    if (circle.status !== 'active') throw new IllegalStateError('Only active circles can be paused');

    const { data, error } = await this.supabase
      .from('circles')
      .update({ status: 'paused' })
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async resumeCircle(circleId: string, actorId: string): Promise<Circle> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.owner_id !== actorId) throw new ForbiddenError('Only owner can resume');
    if (circle.status !== 'paused') throw new IllegalStateError('Only paused circles can be resumed');

    const { data, error } = await this.supabase
      .from('circles')
      .update({ status: 'active' })
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async cancelCircle(circleId: string, actorId: string): Promise<Circle> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.owner_id !== actorId) throw new ForbiddenError('Only owner can cancel');
    if (circle.status === 'completed') throw new IllegalStateError('Completed circles cannot be cancelled');

    const { data, error } = await this.supabase
      .from('circles')
      .update({ status: 'cancelled' })
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async startCircle(circleId: string, actorId: string): Promise<Circle> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.owner_id !== actorId) throw new ForbiddenError('Only owner can start');
    if (circle.status !== 'draft') throw new IllegalStateError('Only draft circles can be started');

    const { count: memberCount } = await this.supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId)
      .eq('status', 'active');

    if (!memberCount || memberCount < 2) {
      throw new IllegalStateError('Circle needs at least 2 active members to start');
    }

    const { data, error } = await this.supabase
      .from('circles')
      .update({ status: 'active', current_cycle: 1, start_date: new Date().toISOString().split('T')[0] })
      .eq('id', circleId)
      .select()
      .single();

    if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    return data;
  }

  async setPayoutOrder(circleId: string, memberPositions: { member_id: string; payout_position: number }[], actorId: string): Promise<void> {
    const circle = await this.getCircle(circleId);
    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.owner_id !== actorId) throw new ForbiddenError('Only owner can set payout order');
    if (circle.status !== 'draft') throw new IllegalStateError('Payout order can only be set in draft status');

    const positions = memberPositions.map(m => m.payout_position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i + 1) {
        throw new ValidationError('Payout positions must be sequential starting from 1');
      }
    }

    const memberIds = memberPositions.map(m => m.member_id);
    const { data: members } = await this.supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('status', 'active');

    const validMemberIds = new Set(members?.map(m => m.id) ?? []);
    for (const id of memberIds) {
      if (!validMemberIds.has(id)) {
        throw new ValidationError(`Member ${id} not found or not active in this circle`);
      }
    }

    for (const { member_id, payout_position } of memberPositions) {
      const { error } = await this.supabase
        .from('circle_members')
        .update({ payout_position })
        .eq('id', member_id)
        .eq('circle_id', circleId);

      if (error) throw new TurnaError(error.message, 'DB_ERROR', 500);
    }
  }
}