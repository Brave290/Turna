import { describe, it, expect } from 'vitest';
import {
  TurnaError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  IllegalStateError,
  IdempotencyError,
} from '../errors';

describe('Error Handling', () => {
  describe('TurnaError', () => {
    it('creates error with message and code', () => {
      const error = new TurnaError('Something went wrong', 'INTERNAL_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('creates error with custom status code', () => {
      const error = new TurnaError('Error', 'CUSTOM', 500);
      expect(error.statusCode).toBe(500);
    });

    it('is instance of Error', () => {
      const error = new TurnaError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TurnaError');
    });
  });

  describe('NotFoundError', () => {
    it('creates not found error', () => {
      const error = new NotFoundError('User', '123');
      expect(error.message).toBe('User not found: 123');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('UnauthorizedError', () => {
    it('creates unauthorized error', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('accepts custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('creates forbidden error', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ValidationError', () => {
    it('creates validation error', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('accepts field errors', () => {
      const fields = { email: 'Invalid email', password: 'Too short' };
      const error = new ValidationError('Validation failed', fields);
      expect(error.fields).toEqual(fields);
    });
  });

  describe('ConflictError', () => {
    it('creates conflict error', () => {
      const error = new ConflictError('Email already exists');
      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('IllegalStateError', () => {
    it('creates illegal state error', () => {
      const error = new IllegalStateError('Circle already active');
      expect(error.message).toBe('Circle already active');
      expect(error.code).toBe('ILLEGAL_STATE');
    });
  });

  describe('IdempotencyError', () => {
    it('creates idempotency error', () => {
      const error = new IdempotencyError();
      expect(error.message).toBe('Duplicate operation');
      expect(error.code).toBe('IDEMPOTENCY_VIOLATION');
    });
  });

  describe('error hierarchy', () => {
    it('all custom errors extend TurnaError', () => {
      expect(new NotFoundError('A', '1')).toBeInstanceOf(TurnaError);
      expect(new UnauthorizedError()).toBeInstanceOf(TurnaError);
      expect(new ForbiddenError()).toBeInstanceOf(TurnaError);
      expect(new ValidationError('E')).toBeInstanceOf(TurnaError);
      expect(new ConflictError('E')).toBeInstanceOf(TurnaError);
      expect(new IllegalStateError('E')).toBeInstanceOf(TurnaError);
      expect(new IdempotencyError()).toBeInstanceOf(TurnaError);
    });
  });
});