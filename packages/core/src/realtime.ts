import { createBrowserClient } from '@turna/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EventCallback<T = any> = (payload: T) => void;

interface SubscriptionOptions {
  circleId: string;
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
}

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private supabase = createBrowserClient();

  subscribe<T = any>(channelName: string, options: SubscriptionOptions, callback: EventCallback<T>): () => void {
    const key = `${channelName}:${options.circleId}:${options.table ?? ''}:${options.event ?? ''}`;
    
    if (this.channels.has(key)) {
      return () => this.unsubscribe(key);
    }

    let channel = this.supabase.channel(key);

    if (options.table) {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: options.event ?? '*',
          schema: options.schema ?? 'public',
          table: options.table,
          filter: options.filter ?? `circle_id=eq.${options.circleId}`,
        },
        (payload: { [key: string]: unknown }) => callback(payload as T)
      );
    } else {
      channel = channel.on(
        'broadcast',
        { event: options.event ?? '*' },
        (payload: { [key: string]: unknown }) => callback(payload as T)
      );
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to ${key}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for ${key}`);
      }
    });

    this.channels.set(key, channel);

    return () => this.unsubscribe(key);
  }

  unsubscribe(key: string): void {
    const channel = this.channels.get(key);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(key);
      console.log(`[Realtime] Unsubscribed from ${key}`);
    }
  }

  unsubscribeAll(): void {
    for (const [key, channel] of this.channels) {
      this.supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  broadcast(channelName: string, event: string, payload: any): void {
    const key = `broadcast:${channelName}`;
    let channel = this.channels.get(key);
    
    if (!channel) {
      channel = this.supabase.channel(key);
      channel.subscribe();
      this.channels.set(key, channel);
    }

    channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  subscribeToCircle(circleId: string, callbacks: {
    onContribution?: EventCallback;
    onContributionConfirmation?: EventCallback;
    onPayout?: EventCallback;
    onPayoutConfirmation?: EventCallback;
    onMemberChange?: EventCallback;
    onCycleChange?: EventCallback;
    onLedgerEvent?: EventCallback;
  }): () => void {
    const unsubscribers: Array<() => void> = [];

    if (callbacks.onContribution) {
      unsubscribers.push(this.subscribe(
        'contributions',
        { circleId, table: 'contributions', event: '*' },
        callbacks.onContribution
      ));
    }

    if (callbacks.onContributionConfirmation) {
      unsubscribers.push(this.subscribe(
        'contribution_confirmations',
        { circleId, table: 'contribution_confirmations', event: 'INSERT' },
        callbacks.onContributionConfirmation
      ));
    }

    if (callbacks.onPayout) {
      unsubscribers.push(this.subscribe(
        'payouts',
        { circleId, table: 'payouts', event: '*' },
        callbacks.onPayout
      ));
    }

    if (callbacks.onPayoutConfirmation) {
      unsubscribers.push(this.subscribe(
        'payout_confirmations',
        { circleId, table: 'payout_confirmations', event: 'INSERT' },
        callbacks.onPayoutConfirmation
      ));
    }

    if (callbacks.onMemberChange) {
      unsubscribers.push(this.subscribe(
        'circle_members',
        { circleId, table: 'circle_members', event: '*' },
        callbacks.onMemberChange
      ));
    }

    if (callbacks.onCycleChange) {
      unsubscribers.push(this.subscribe(
        'contribution_cycles',
        { circleId, table: 'contribution_cycles', event: '*' },
        callbacks.onCycleChange
      ));
    }

    if (callbacks.onLedgerEvent) {
      unsubscribers.push(this.subscribe(
        'ledger_events',
        { circleId, table: 'ledger_events', event: 'INSERT' },
        callbacks.onLedgerEvent
      ));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  subscribeToUserNotifications(userId: string, callback: EventCallback): () => void {
    return this.subscribe(
      'notifications',
      { circleId: userId, table: 'notifications', event: 'INSERT', filter: `user_id=eq.${userId}` },
      callback
    );
  }
}

export const realtimeService = new RealtimeService();