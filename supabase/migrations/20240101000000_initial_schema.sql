-- Turna Database Schema
-- Initial migration for Turna savings circle platform

-- gen_random_uuid() is built-in to PostgreSQL 13+ (no extension needed)

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE circle_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE circle_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE member_role AS ENUM ('owner', 'treasurer', 'member');
CREATE TYPE member_status AS ENUM ('pending', 'active', 'left', 'removed');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE cycle_status AS ENUM ('pending', 'collecting', 'payout_pending', 'payout_initiated', 'payout_confirmed', 'completed', 'disputed');
CREATE TYPE contribution_status AS ENUM ('pending', 'reported', 'confirmed', 'rejected', 'disputed');
CREATE TYPE confirmation_decision AS ENUM ('approved', 'rejected');
CREATE TYPE payout_status AS ENUM ('pending', 'initiated', 'sent', 'received', 'disputed');
CREATE TYPE ledger_event_type AS ENUM (
    'CIRCLE_CREATED',
    'CIRCLE_UPDATED',
    'CIRCLE_PAUSED',
    'CIRCLE_RESUMED',
    'CIRCLE_COMPLETED',
    'CIRCLE_CANCELLED',
    'MEMBER_INVITED',
    'MEMBER_JOINED',
    'MEMBER_LEFT',
    'MEMBER_REMOVED',
    'MEMBER_ROLE_CHANGED',
    'PAYOUT_ORDER_SET',
    'PAYOUT_ORDER_CHANGED',
    'CONTRIBUTION_REPORTED',
    'CONTRIBUTION_CONFIRMED',
    'CONTRIBUTION_REJECTED',
    'CONTRIBUTION_DISPUTED',
    'CONTRIBUTION_CORRECTION_REQUESTED',
    'CONTRIBUTION_CORRECTION_APPROVED',
    'CONTRIBUTION_CORRECTION_REJECTED',
    'PAYOUT_INITIATED',
    'PAYOUT_MARKED_SENT',
    'PAYOUT_RECEIPT_CONFIRMED',
    'PAYOUT_DISPUTED',
    'CYCLE_STARTED',
    'CYCLE_COMPLETED',
    'SETTINGS_CHANGED'
);
CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'sms', 'whatsapp', 'email');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- ============================================================
-- USERS / PROFILES
-- ============================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================
-- CIRCLES
-- ============================================================

CREATE TABLE circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    contribution_amount BIGINT NOT NULL, -- stored in minor units (kobo)
    currency TEXT NOT NULL DEFAULT 'NGN',
    frequency circle_frequency NOT NULL DEFAULT 'monthly',
    member_limit INT NOT NULL DEFAULT 10,
    status circle_status NOT NULL DEFAULT 'draft',
    current_cycle INT NOT NULL DEFAULT 0,
    start_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT circles_contribution_amount_positive CHECK (contribution_amount > 0),
    CONSTRAINT circles_member_limit_positive CHECK (member_limit > 0 AND member_limit <= 100)
);

CREATE INDEX idx_circles_owner_id ON circles(owner_id);
CREATE INDEX idx_circles_status ON circles(status);

-- ============================================================
-- CIRCLE MEMBERS
-- ============================================================

CREATE TABLE circle_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    payout_position INT NOT NULL,
    status member_status NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT circle_members_unique_circle_user UNIQUE (circle_id, user_id),
    CONSTRAINT circle_members_unique_payout_position UNIQUE (circle_id, payout_position),
    CONSTRAINT circle_members_payout_position_positive CHECK (payout_position > 0)
);

CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX idx_circle_members_status ON circle_members(status);

-- ============================================================
-- INVITATIONS
-- ============================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    CONSTRAINT invitations_expires_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_invitations_circle_id ON invitations(circle_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- ============================================================
-- CONTRIBUTION CYCLES
-- ============================================================

CREATE TABLE contribution_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL,
    due_date DATE NOT NULL,
    payout_member_id UUID REFERENCES circle_members(id) ON DELETE SET NULL,
    expected_amount BIGINT NOT NULL,
    status cycle_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT contribution_cycles_unique_circle_cycle UNIQUE (circle_id, cycle_number),
    CONSTRAINT contribution_cycles_expected_amount_positive CHECK (expected_amount > 0)
);

CREATE INDEX idx_contribution_cycles_circle_id ON contribution_cycles(circle_id);
CREATE INDEX idx_contribution_cycles_status ON contribution_cycles(status);
CREATE INDEX idx_contribution_cycles_payout_member_id ON contribution_cycles(payout_member_id);

-- ============================================================
-- CONTRIBUTIONS
-- ============================================================

CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES contribution_cycles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
    expected_amount BIGINT NOT NULL,
    reported_amount BIGINT,
    payment_method TEXT,
    status contribution_status NOT NULL DEFAULT 'pending',
    reported_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT contributions_unique_cycle_member UNIQUE (cycle_id, member_id),
    CONSTRAINT contributions_expected_amount_positive CHECK (expected_amount > 0),
    CONSTRAINT contributions_reported_amount_positive CHECK (reported_amount IS NULL OR reported_amount > 0)
);

CREATE INDEX idx_contributions_cycle_id ON contributions(cycle_id);
CREATE INDEX idx_contributions_member_id ON contributions(member_id);
CREATE INDEX idx_contributions_status ON contributions(status);

-- ============================================================
-- CONTRIBUTION CONFIRMATIONS
-- ============================================================

CREATE TABLE contribution_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    confirmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    decision confirmation_decision NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT contribution_confirmations_unique_contribution_confirmer UNIQUE (contribution_id, confirmer_id)
);

CREATE INDEX idx_contribution_confirmations_contribution_id ON contribution_confirmations(contribution_id);
CREATE INDEX idx_contribution_confirmations_confirmer_id ON contribution_confirmations(confirmer_id);

-- ============================================================
-- PAYOUTS
-- ============================================================

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES contribution_cycles(id) ON DELETE CASCADE,
    recipient_member_id UUID NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
    expected_amount BIGINT NOT NULL,
    actual_amount BIGINT,
    status payout_status NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT payouts_unique_cycle_recipient UNIQUE (cycle_id, recipient_member_id),
    CONSTRAINT payouts_expected_amount_positive CHECK (expected_amount > 0),
    CONSTRAINT payouts_actual_amount_positive CHECK (actual_amount IS NULL OR actual_amount > 0)
);

CREATE INDEX idx_payouts_cycle_id ON payouts(cycle_id);
CREATE INDEX idx_payouts_recipient_member_id ON payouts(recipient_member_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ============================================================
-- PAYOUT CONFIRMATIONS
-- ============================================================

CREATE TABLE payout_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    confirmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    decision confirmation_decision NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT payout_confirmations_unique_payout_confirmer UNIQUE (payout_id, confirmer_id)
);

CREATE INDEX idx_payout_confirmations_payout_id ON payout_confirmations(payout_id);
CREATE INDEX idx_payout_confirmations_confirmer_id ON payout_confirmations(confirmer_id);

-- ============================================================
-- APPEND-ONLY LEDGER EVENTS
-- ============================================================

CREATE TABLE ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    event_type ledger_event_type NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    previous_event_id UUID REFERENCES ledger_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_events_circle_id ON ledger_events(circle_id);
CREATE INDEX idx_ledger_events_actor_id ON ledger_events(actor_id);
CREATE INDEX idx_ledger_events_entity_type_id ON ledger_events(entity_type, entity_id);
CREATE INDEX idx_ledger_events_event_type ON ledger_events(event_type);
CREATE INDEX idx_ledger_events_created_at ON ledger_events(created_at DESC);
CREATE INDEX idx_ledger_events_previous_event_id ON ledger_events(previous_event_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL DEFAULT 'in_app',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    status notification_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_circle_id ON notifications(circle_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON circles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circle_members_updated_at BEFORE UPDATE ON circle_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();