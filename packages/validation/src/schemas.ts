import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const moneySchema = z.number().int().positive('Amount must be a positive integer in minor units');

export const currencySchema = z.string().length(3, 'Currency must be 3-letter ISO code').default('NGN');

export const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly']);

export const circleStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']);

export const memberRoleSchema = z.enum(['owner', 'treasurer', 'member']);

export const memberStatusSchema = z.enum(['pending', 'active', 'left', 'removed']);

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'cancelled']);

export const cycleStatusSchema = z.enum([
  'pending',
  'collecting',
  'payout_pending',
  'payout_initiated',
  'payout_confirmed',
  'completed',
  'disputed',
]);

export const contributionStatusSchema = z.enum(['pending', 'reported', 'confirmed', 'rejected', 'disputed']);

export const confirmationDecisionSchema = z.enum(['approved', 'rejected']);

export const payoutStatusSchema = z.enum(['pending', 'initiated', 'sent', 'received', 'disputed']);

export const notificationChannelSchema = z.enum(['in_app', 'push', 'sms', 'whatsapp', 'email']);

export const notificationStatusSchema = z.enum(['pending', 'sent', 'delivered', 'failed', 'read']);

export const ledgerEventTypeSchema = z.enum([
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
  'SETTINGS_CHANGED',
]);

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const createCircleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  contribution_amount: moneySchema,
  currency: currencySchema,
  frequency: frequencySchema,
  member_limit: z.number().int().min(2).max(100).default(10),
  start_date: z.string().date().optional(),
});

export const updateCircleSchema = createCircleSchema.partial().extend({
  status: circleStatusSchema.optional(),
});

export const inviteMemberSchema = z.object({
  circle_id: uuidSchema,
  invitee_email: emailSchema,
  payout_position: z.number().int().positive(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export const reportContributionSchema = z.object({
  cycle_id: uuidSchema,
  reported_amount: moneySchema,
  payment_method: z.string().max(50).optional(),
});

export const confirmContributionSchema = z.object({
  contribution_id: uuidSchema,
  decision: confirmationDecisionSchema,
  note: z.string().max(500).optional(),
});

export const initiatePayoutSchema = z.object({
  cycle_id: uuidSchema,
  actual_amount: moneySchema.optional(),
  notes: z.string().max(500).optional(),
});

export const confirmPayoutReceiptSchema = z.object({
  payout_id: uuidSchema,
  decision: confirmationDecisionSchema,
  note: z.string().max(500).optional(),
});

export const updateMemberRoleSchema = z.object({
  member_id: uuidSchema,
  role: memberRoleSchema,
});

export const setPayoutOrderSchema = z.object({
  circle_id: uuidSchema,
  member_positions: z.array(z.object({
    member_id: uuidSchema,
    payout_position: z.number().int().positive(),
  })),
});

export const pauseCircleSchema = z.object({
  circle_id: uuidSchema,
});

export const resumeCircleSchema = z.object({
  circle_id: uuidSchema,
});

export const cancelCircleSchema = z.object({
  circle_id: uuidSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1).max(100),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;
export type UpdateCircleInput = z.infer<typeof updateCircleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ReportContributionInput = z.infer<typeof reportContributionSchema>;
export type ConfirmContributionInput = z.infer<typeof confirmContributionSchema>;
export type InitiatePayoutInput = z.infer<typeof initiatePayoutSchema>;
export type ConfirmPayoutReceiptInput = z.infer<typeof confirmPayoutReceiptSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type SetPayoutOrderInput = z.infer<typeof setPayoutOrderSchema>;
export type PauseCircleInput = z.infer<typeof pauseCircleSchema>;
export type ResumeCircleInput = z.infer<typeof resumeCircleSchema>;
export type CancelCircleInput = z.infer<typeof cancelCircleSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;