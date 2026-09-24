export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type Circle = {
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
  end_date: string | null;
  start_month: number | null;
  end_month: number | null;
  payout_mode: 'rotating' | 'end_of_term';
  payment_mode: 'manual' | 'autopay';
  fee_bps: number;
  network_charge_bps: number;
  fee_payer: 'member' | 'owner' | 'shared';
  created_at: string;
  updated_at: string;
};

export type CircleMember = {
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
};

export type Invitation = {
  id: string;
  circle_id: string;
  inviter_id: string;
  invitee_email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
};

export type ContributionCycle = {
  id: string;
  circle_id: string;
  cycle_number: number;
  due_date: string;
  payout_member_id: string | null;
  expected_amount: number;
  status:
    | 'pending'
    | 'collecting'
    | 'payout_pending'
    | 'payout_initiated'
    | 'payout_confirmed'
    | 'completed'
    | 'disputed';
  created_at: string;
  completed_at: string | null;
};

export type Contribution = {
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
};

export type ContributionConfirmation = {
  id: string;
  contribution_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  created_at: string;
};

export type Payout = {
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
};

export type PayoutConfirmation = {
  id: string;
  payout_id: string;
  confirmer_id: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  created_at: string;
};

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

export type LedgerEvent = {
  id: string;
  circle_id: string;
  actor_id: string;
  event_type: LedgerEventType;
  entity_type: string;
  entity_id: string;
  payload: Json;
  previous_event_id: string | null;
  created_at: string;
};

export type Notification = {
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
};

export type EmailOtpRequest = {
  id: string;
  email: string;
  request_count: number;
  window_start: string;
  created_at: string;
  updated_at: string;
};

type TableDef<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

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
  circle_status: Circle['status'];
  circle_frequency: Circle['frequency'];
  member_role: CircleMember['role'];
  member_status: CircleMember['status'];
  invitation_status: Invitation['status'];
  cycle_status: ContributionCycle['status'];
  contribution_status: Contribution['status'];
  confirmation_decision: ContributionConfirmation['decision'];
  payout_status: Payout['status'];
  ledger_event_type: LedgerEventType;
  notification_channel: Notification['channel'];
  notification_status: Notification['status'];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Profile, Partial<Profile>>;
      circles: TableDef<
        Circle,
        Omit<Circle, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Circle>
      >;
      circle_members: TableDef<
        CircleMember,
        Omit<CircleMember, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<CircleMember>
      >;
      invitations: TableDef<
        Invitation,
        Omit<Invitation, 'id' | 'created_at' | 'accepted_at'> & {
          id?: string;
          created_at?: string;
          accepted_at?: string | null;
        },
        Partial<Invitation>
      >;
      contribution_cycles: TableDef<ContributionCycle>;
      contributions: TableDef<Contribution>;
      contribution_confirmations: TableDef<ContributionConfirmation>;
      payouts: TableDef<Payout>;
      payout_confirmations: TableDef<PayoutConfirmation>;
      ledger_events: TableDef<
        LedgerEvent,
        Omit<LedgerEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        },
        never
      >;
      notifications: TableDef<Notification>;
      email_otp_requests: TableDef<EmailOtpRequest>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_email_otp_rate_limit: {
        Args: { p_email: string };
        Returns: {
          allowed: boolean;
          request_count: number;
          retry_after_seconds: number;
        }[];
      };
      is_circle_member: {
        Args: { p_circle_id: string };
        Returns: boolean;
      };
      is_circle_owner: {
        Args: { p_circle_id: string };
        Returns: boolean;
      };
    };
    Enums: Enums;
    CompositeTypes: Record<string, never>;
  };
};
