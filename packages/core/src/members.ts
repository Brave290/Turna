import { createServerClient } from '@turna/database';
import type { CircleMember, Invitation } from '@turna/types';
import { ForbiddenError, NotFoundError, IllegalStateError, ValidationError, ConflictError } from './errors';
import { v4 as uuidv4 } from 'uuid';

interface InviteInput {
  circle_id: string;
  inviter_id: string;
  invitee_phone: string;
  payout_position: number;
}

export class MemberService {
  private supabase = createServerClient();

  async inviteMember(input: InviteInput): Promise<Invitation> {
    const { data: circle, error: circleError } = await this.supabase
      .from('circles')
      .select('id, status, member_limit, owner_id')
      .eq('id', input.circle_id)
      .single();

    if (circleError || !circle) throw new NotFoundError('Circle', input.circle_id);
    if (circle.owner_id !== input.inviter_id) throw new ForbiddenError('Only owner can invite members');
    if (circle.status !== 'draft') throw new IllegalStateError('Can only invite members to draft circles');

    const { count: activeCount } = await this.supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', input.circle_id)
      .eq('status', 'active');

    if (activeCount && activeCount >= circle.member_limit) {
      throw new IllegalStateError('Circle has reached maximum member limit');
    }

    const { data: existingInvite } = await this.supabase
      .from('invitations')
      .select('id')
      .eq('circle_id', input.circle_id)
      .eq('invitee_phone', input.invitee_phone)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new ConflictError('Invitation already pending for this phone number');
    }

    const { data: existingMember } = await this.supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', input.circle_id)
      .eq('user_id', (await this.getProfileByPhone(input.invitee_phone))?.id)
      .single();

    if (existingMember) {
      throw new ConflictError('User is already a member of this circle');
    }

    const { data: positionTaken } = await this.supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', input.circle_id)
      .eq('payout_position', input.payout_position)
      .single();

    if (positionTaken) {
      throw new ConflictError(`Payout position ${input.payout_position} is already taken`);
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('invitations')
      .insert({
        circle_id: input.circle_id,
        inviter_id: input.inviter_id,
        invitee_phone: input.invitee_phone,
        token,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return data;
  }

  private async getProfileByPhone(phone: string) {
    const { data } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();
    return data;
  }

  async acceptInvitation(token: string, userId: string): Promise<CircleMember> {
    const { data: invitation, error: inviteError } = await this.supabase
      .from('invitations')
      .select('*, circles!inner(owner_id, status)')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) throw new NotFoundError('Invitation', token);
    if (invitation.status !== 'pending') throw new IllegalStateError('Invitation is no longer pending');
    if (new Date(invitation.expires_at) < new Date()) throw new IllegalStateError('Invitation has expired');
    if (invitation.circles.status !== 'draft') throw new IllegalStateError('Cannot join a circle that is not in draft status');

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, phone')
      .eq('id', userId)
      .single();

    if (!profile || profile.phone !== invitation.invitee_phone) {
      throw new ForbiddenError('This invitation is for a different phone number');
    }

    const { data: existingMember } = await this.supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', invitation.circle_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      throw new ConflictError('User is already a member of this circle');
    }

    const { error: updateInviteError } = await this.supabase
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateInviteError) throw new ValidationError(updateInviteError.message);

    const { data: member, error: memberError } = await this.supabase
      .from('circle_members')
      .insert({
        circle_id: invitation.circle_id,
        user_id: userId,
        role: 'member',
        payout_position: invitation.payout_position,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) throw new ValidationError(memberError.message);
    return member;
  }

  async getCircleMembers(circleId: string): Promise<CircleMember[]> {
    const { data, error } = await this.supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circleId)
      .order('payout_position', { ascending: true });

    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async getMember(circleId: string, userId: string): Promise<CircleMember | null> {
    const { data, error } = await this.supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ValidationError(error.message);
    }
    return data;
  }

  async updateMemberRole(circleId: string, memberId: string, role: 'owner' | 'treasurer' | 'member', actorId: string): Promise<CircleMember> {
    const circle = await this.supabase
      .from('circles')
      .select('owner_id')
      .eq('id', circleId)
      .single();

    if (!circle.data) throw new NotFoundError('Circle', circleId);
    if (circle.data.owner_id !== actorId) throw new ForbiddenError('Only owner can change roles');

    const { data: member, error } = await this.supabase
      .from('circle_members')
      .update({ role })
      .eq('id', memberId)
      .eq('circle_id', circleId)
      .select()
      .single();

    if (error) throw new ValidationError(error.message);
    return member;
  }

  async removeMember(circleId: string, memberId: string, actorId: string): Promise<void> {
    const circle = await this.supabase
      .from('circles')
      .select('owner_id, status')
      .eq('id', circleId)
      .single();

    if (!circle.data) throw new NotFoundError('Circle', circleId);
    if (circle.data.owner_id !== actorId) throw new ForbiddenError('Only owner can remove members');
    if (circle.data.status !== 'draft') throw new IllegalStateError('Can only remove members from draft circles');

    const { data: member } = await this.supabase
      .from('circle_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('circle_id', circleId)
      .single();

    if (!member) throw new NotFoundError('Member', memberId);
    if (member.role === 'owner') throw new IllegalStateError('Cannot remove the circle owner');

    const { error } = await this.supabase
      .from('circle_members')
      .update({ status: 'removed', left_at: new Date().toISOString() })
      .eq('id', memberId);

    if (error) throw new ValidationError(error.message);
  }

  async leaveCircle(circleId: string, userId: string): Promise<void> {
    const { data: circle } = await this.supabase
      .from('circles')
      .select('status')
      .eq('id', circleId)
      .single();

    if (!circle) throw new NotFoundError('Circle', circleId);
    if (circle.status !== 'draft') throw new IllegalStateError('Can only leave draft circles');

    const { data: member } = await this.supabase
      .from('circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .single();

    if (!member) throw new NotFoundError('Member', userId);
    if (member.role === 'owner') throw new IllegalStateError('Owner cannot leave; transfer ownership first');

    const { error } = await this.supabase
      .from('circle_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('circle_id', circleId)
      .eq('user_id', userId);

    if (error) throw new ValidationError(error.message);
  }
}