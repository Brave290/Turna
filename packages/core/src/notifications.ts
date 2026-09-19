import { createServerClient } from '@turna/database';
import type { Notification, Json } from '@turna/types';
import { ValidationError } from './errors';

export type NotificationChannel = 'in_app' | 'push' | 'sms' | 'whatsapp' | 'email';

export interface NotificationPayload {
  user_id: string;
  circle_id?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Json;
}

export interface NotificationProvider {
  send(notification: NotificationPayload): Promise<{ success: boolean; provider_id?: string; error?: string }>;
}

export class InAppProvider implements NotificationProvider {
  private supabase = createServerClient();

  async send(notification: NotificationPayload): Promise<{ success: boolean; provider_id?: string; error?: string }> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        circle_id: notification.circle_id ?? null,
        channel: notification.channel,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    
    await this.supabase
      .from('notifications')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', data.id);

    return { success: true, provider_id: data.id };
  }
}

export class NotificationService {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();
  private supabase = createServerClient();

  registerProvider(channel: NotificationChannel, provider: NotificationProvider): void {
    this.providers.set(channel, provider);
  }

  async send(notification: NotificationPayload): Promise<void> {
    const provider = this.providers.get(notification.channel);
    if (!provider) {
      throw new ValidationError(`No provider registered for channel: ${notification.channel}`);
    }

    const result = await provider.send(notification);
    
    if (!result.success) {
      await this.supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', result.provider_id);
      throw new ValidationError(`Failed to send notification: ${result.error}`);
    }
  }

  async sendToUser(userId: string, circleId: string | undefined, title: string, body: string, data?: Json, channels: NotificationChannel[] = ['in_app']): Promise<void> {
    await Promise.all(
      channels.map(channel => 
        this.send({ user_id: userId, circle_id: circleId, channel, title, body, data })
      )
    );
  }

  async sendToCircleMembers(circleId: string, title: string, body: string, data?: Json, channels: NotificationChannel[] = ['in_app'], excludeUserId?: string): Promise<void> {
    const { data: members } = await this.supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circleId)
      .eq('status', 'active');

    if (!members) return;

    await Promise.all(
      members
        .filter(m => m.user_id !== excludeUserId)
        .map(member => 
          Promise.all(
            channels.map(channel => 
              this.send({ user_id: member.user_id, circle_id: circleId, channel, title, body, data })
            )
          )
        )
    );
  }

  async getNotificationsForUser(userId: string, options?: { limit?: number; status?: Notification['status'] }): Promise<Notification[]> {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new ValidationError(error.message);
    return data ?? [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw new ValidationError(error.message);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'delivered');

    if (error) throw new ValidationError(error.message);
  }
}

export const notificationTemplates = {
  circleInvited: (circleName: string, inviterName: string) => ({
    title: 'Circle Invitation',
    body: `${inviterName} invited you to join "${circleName}"`,
  }),

  circleStarted: (circleName: string) => ({
    title: 'Circle Started',
    body: `Your circle "${circleName}" has started! First cycle is now collecting.`,
  }),

  contributionDue: (circleName: string, amount: number, dueDate: string) => ({
    title: 'Contribution Due',
    body: `Your contribution of ${amount} is due for "${circleName}" by ${dueDate}`,
  }),

  contributionReported: (circleName: string, memberName: string, amount: number) => ({
    title: 'Contribution Reported',
    body: `${memberName} reported a contribution of ${amount} in "${circleName}"`,
  }),

  contributionConfirmed: (circleName: string, amount: number) => ({
    title: 'Contribution Confirmed',
    body: `Your contribution of ${amount} in "${circleName}" has been confirmed`,
  }),

  contributionRejected: (circleName: string, amount: number, reason?: string) => ({
    title: 'Contribution Rejected',
    body: `Your contribution of ${amount} in "${circleName}" was rejected${reason ? `: ${reason}` : ''}`,
  }),

  payoutInitiated: (circleName: string, recipientName: string, amount: number) => ({
    title: 'Payout Initiated',
    body: `Payout of ${amount} to ${recipientName} has been initiated in "${circleName}"`,
  }),

  payoutSent: (circleName: string, amount: number) => ({
    title: 'Payout Sent',
    body: `Your payout of ${amount} from "${circleName}" has been sent`,
  }),

  payoutReceived: (circleName: string, amount: number) => ({
    title: 'Payout Received',
    body: `You have received ${amount} from "${circleName}"`,
  }),

  cycleCompleted: (circleName: string, cycleNumber: number) => ({
    title: 'Cycle Completed',
    body: `Cycle ${cycleNumber} of "${circleName}" has been completed`,
  }),

  memberJoined: (circleName: string, memberName: string) => ({
    title: 'New Member',
    body: `${memberName} joined "${circleName}"`,
  }),

  memberLeft: (circleName: string, memberName: string) => ({
    title: 'Member Left',
    body: `${memberName} left "${circleName}"`,
  }),
};