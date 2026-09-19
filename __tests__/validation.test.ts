import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Validation Schemas (from @turna/validation) ──

const emailSchema = z.string().email('Invalid email address');
const moneySchema = z.number().int().positive('Amount must be positive');
const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly']);

const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1).max(100),
});

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({ email: emailSchema });

const createCircleSchema = z.object({
  name: z.string().min(1).max(100),
  contribution_amount: moneySchema,
  frequency: frequencySchema,
  member_limit: z.number().int().min(2).max(100).default(10),
});

const reportContributionSchema = z.object({
  cycle_id: z.string().uuid(),
  reported_amount: moneySchema,
});

const initiatePayoutSchema = z.object({
  cycle_id: z.string().uuid(),
});

describe('Validation Schemas', () => {
  describe('signUpSchema', () => {
    const valid = { email: 'test@example.com', password: 'Password123', display_name: 'Test User' };
    it('accepts valid', () => { expect(signUpSchema.safeParse(valid).success).toBe(true); });
    it('rejects invalid email', () => { expect(signUpSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false); });
    it('rejects short password', () => { expect(signUpSchema.safeParse({ ...valid, password: '123' }).success).toBe(false); });
    it('rejects empty name', () => { expect(signUpSchema.safeParse({ ...valid, display_name: '' }).success).toBe(false); });
  });

  describe('signInSchema', () => {
    const valid = { email: 'test@example.com', password: 'pass' };
    it('accepts valid', () => { expect(signInSchema.safeParse(valid).success).toBe(true); });
    it('rejects invalid email', () => { expect(signInSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false); });
    it('rejects empty password', () => { expect(signInSchema.safeParse({ ...valid, password: '' }).success).toBe(false); });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid email', () => { expect(resetPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true); });
    it('rejects invalid email', () => { expect(resetPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false); });
  });

  describe('createCircleSchema', () => {
    const valid = { name: 'My Circle', contribution_amount: 10000, frequency: 'monthly' };
    it('accepts valid', () => { expect(createCircleSchema.safeParse(valid).success).toBe(true); });
    it('rejects empty name', () => { expect(createCircleSchema.safeParse({ ...valid, name: '' }).success).toBe(false); });
    it('rejects zero contribution', () => { expect(createCircleSchema.safeParse({ ...valid, contribution_amount: 0 }).success).toBe(false); });
    it('accepts all frequencies', () => {
      ['weekly', 'biweekly', 'monthly'].forEach(f => {
        expect(createCircleSchema.safeParse({ ...valid, frequency: f }).success).toBe(true);
      });
    });
  });

  describe('reportContributionSchema', () => {
    const valid = { cycle_id: '550e8400-e29b-41d4-a716-446655440000', reported_amount: 5000 };
    it('accepts valid', () => { expect(reportContributionSchema.safeParse(valid).success).toBe(true); });
    it('rejects zero amount', () => { expect(reportContributionSchema.safeParse({ ...valid, reported_amount: 0 }).success).toBe(false); });
    it('rejects invalid UUID', () => { expect(reportContributionSchema.safeParse({ ...valid, cycle_id: 'bad' }).success).toBe(false); });
  });

  describe('initiatePayoutSchema', () => {
    it('accepts valid UUID', () => { expect(initiatePayoutSchema.safeParse({ cycle_id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true); });
    it('rejects invalid UUID', () => { expect(initiatePayoutSchema.safeParse({ cycle_id: 'bad' }).success).toBe(false); });
  });
});