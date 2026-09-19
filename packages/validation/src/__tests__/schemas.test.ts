import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  signInSchema,
  resetPasswordSchema,
  createCircleSchema,
  reportContributionSchema,
  initiatePayoutSchema,
} from '../schemas';

describe('Validation Schemas', () => {
  describe('signUpSchema', () => {
    const validSignUp = {
      email: 'test@example.com',
      password: 'Password123',
      display_name: 'Test User',
    };

    it('accepts valid sign up data', () => {
      expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(signUpSchema.safeParse({ ...validSignUp, email: 'not-an-email' }).success).toBe(false);
    });

    it('rejects short password', () => {
      expect(signUpSchema.safeParse({ ...validSignUp, password: '123' }).success).toBe(false);
    });

    it('rejects empty display name', () => {
      expect(signUpSchema.safeParse({ ...validSignUp, display_name: '' }).success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    const validSignIn = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('accepts valid sign in data', () => {
      expect(signInSchema.safeParse(validSignIn).success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(signInSchema.safeParse({ ...validSignIn, email: 'bad' }).success).toBe(false);
    });

    it('rejects empty password', () => {
      expect(signInSchema.safeParse({ ...validSignIn, password: '' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(resetPasswordSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(resetPasswordSchema.safeParse({ email: 'not-email' }).success).toBe(false);
    });
  });

  describe('createCircleSchema', () => {
    const validCircle = {
      name: 'My Circle',
      contribution_amount: 10000,
      frequency: 'monthly',
    };

    it('accepts valid circle data', () => {
      expect(createCircleSchema.safeParse(validCircle).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(createCircleSchema.safeParse({ ...validCircle, name: '' }).success).toBe(false);
    });

    it('rejects zero contribution', () => {
      expect(createCircleSchema.safeParse({ ...validCircle, contribution_amount: 0 }).success).toBe(false);
    });

    it('accepts valid frequencies', () => {
      ['weekly', 'biweekly', 'monthly'].forEach(freq => {
        expect(createCircleSchema.safeParse({ ...validCircle, frequency: freq }).success).toBe(true);
      });
    });
  });

  describe('reportContributionSchema', () => {
    it('accepts valid contribution', () => {
      expect(reportContributionSchema.safeParse({
        cycle_id: '550e8400-e29b-41d4-a716-446655440000',
        reported_amount: 5000,
      }).success).toBe(true);
    });

    it('rejects zero amount', () => {
      expect(reportContributionSchema.safeParse({
        cycle_id: '550e8400-e29b-41d4-a716-446655440000',
        reported_amount: 0,
      }).success).toBe(false);
    });

    it('rejects invalid UUID', () => {
      expect(reportContributionSchema.safeParse({
        cycle_id: 'not-a-uuid',
        reported_amount: 5000,
      }).success).toBe(false);
    });
  });

  describe('initiatePayoutSchema', () => {
    it('accepts valid payout', () => {
      expect(initiatePayoutSchema.safeParse({
        cycle_id: '550e8400-e29b-41d4-a716-446655440000',
      }).success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      expect(initiatePayoutSchema.safeParse({
        cycle_id: 'not-a-uuid',
      }).success).toBe(false);
    });
  });
});