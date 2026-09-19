export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  contribution_amount: number;
  currency: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  member_limit: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  current_cycle: number;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'owner' | 'treasurer' | 'member';
  payout_position: number;
  status: 'pending' | 'active' | 'left' | 'removed';
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  circle_id: string;
  inviter_id: string;
  invitee_email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface ContributionCycle {
  id: string;
  circle_id: string;
  cycle_number: number;
  due_date: string;
  payout_member_id: string | null;
  expected_amount: number;
  status: 'pending' | 'collecting' | 'payout_pending' | 'payout_initiated' | 'payout_confirmed' | 'completed' | 'disputed';
  created_at: string;
  completed_at: string | null;
}

export interface Contribution {
  id: string;
  cycle_id: string;
  member_id: string;
  expected_amount: number;
  reported_amount: number | null;
  payment_method: string | null;
  status: 'pending' | 'reported' | 'confirmed' | 'rejected' | 'disputed';
  reported_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionConfirmation {
  id: string;
  contribution_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  cycle_id: string;
  recipient_member_id: string;
  expected_amount: number;
  actual_amount: number | null;
  status: 'pending' | 'initiated' | 'sent' | 'received' | 'disputed';
  initiated_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutConfirmation {
  id: string;
  payout_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  created_at: string;
}

export interface LedgerEvent {
  id: string;
  circle_id: string;
  actor_id: string;
  event_type: LedgerEventType;
  entity_type: string;
  entity_id: string;
  payload: Json;
  previous_event_id: string | null;
  created_at: string;
}

export type LedgerEventType =
  | 'CIRCLE_CREATED'
  | 'CIRCLE_UPDATED'
  | 'CIRCLE_PAUSED'
  | 'CIRCLE_RESUMED'
  | 'CIRCLE_COMPLETED'
  | 'CIRCLE_CANCELLED'
  | 'MEMBER_INVITED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'PAYOUT_ORDER_SET'
  | 'PAYOUT_ORDER_CHANGED'
  | 'CONTRIBUTION_REPORTED'
  | 'CONTRIBUTION_CONFIRMED'
  | 'CONTRIBUTION_REJECTED'
  | 'CONTRIBUTION_DISPUTED'
  | 'CONTRIBUTION_CORRECTION_REQUESTED'
  | 'CONTRIBUTION_CORRECTION_APPROVED'
  | 'CONTRIBUTION_CORRECTION_REJECTED'
  | 'PAYOUT_INITIATED'
  | 'PAYOUT_MARKED_SENT'
  | 'PAYOUT_RECEIPT_CONFIRMED'
  | 'PAYOUT_DISPUTED'
  | 'CYCLE_STARTED'
  | 'CYCLE_COMPLETED'
  | 'SETTINGS_CHANGED';

export interface Notification {
  id: string;
  user_id: string;
  circle_id: string | null;
  channel: 'in_app' | 'push' | 'sms' | 'whatsapp' | 'email';
  title: string;
  body: string;
  data: Json;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export type Tables = {
  profiles: Profile;
  circles: Circle;
  circle_members: CircleMember;
  invitations: Invitation;
  contribution_cycles: ContributionCycle;
  contributions: Contribution;
  contribution_confirmations: ContributionConfirmation;
  payouts: Payout;
  payout_confirmations: PayoutConfirmation;
  ledger_events: LedgerEvent;
  notifications: Notification;
};

export type Enums = {
  circle_status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  circle_frequency: 'weekly' | 'biweekly' | 'monthly';
  member_role: 'owner' | 'treasurer' | 'member';
  member_status: 'pending' | 'active' | 'left' | 'removed';
  invitation_status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  cycle_status: 'pending' | 'collecting' | 'payout_pending' | 'payout_initiated' | 'payout_confirmed' | 'completed' | 'disputed';
  contribution_status: 'pending' | 'reported' | 'confirmed' | 'rejected' | 'disputed';
  confirmation_decision: 'approved' | 'rejected';
  payout_status: 'pending' | 'initiated' | 'sent' | 'received' | 'disputed';
  ledger_event_type: LedgerEventType;
  notification_channel: 'in_app' | 'push' | 'sms' | 'whatsapp' | 'email';
  notification_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
};

export type Database = {
  public: {
    Tables: Tables;
    Enums: Enums;
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};