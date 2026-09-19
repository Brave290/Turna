import { describe, it, expect } from 'vitest';

// ── Error Classes (from @turna/core/src/errors.ts) ──

class TurnaError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'TurnaError';
  }
}

class NotFoundError extends TurnaError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends TurnaError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends TurnaError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

class ValidationError extends TurnaError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class ConflictError extends TurnaError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

class IllegalStateError extends TurnaError {
  constructor(message: string) {
    super(message, 'ILLEGAL_STATE', 400);
    this.name = 'IllegalStateError';
  }
}

class IdempotencyError extends TurnaError {
  constructor(message = 'Duplicate operation') {
    super(message, 'IDEMPOTENCY_VIOLATION', 409);
    this.name = 'IdempotencyError';
  }
}

describe('Error Classes', () => {
  it('TurnaError has message, code, statusCode', () => {
    const e = new TurnaError('fail', 'ERR', 500);
    expect(e.message).toBe('fail');
    expect(e.code).toBe('ERR');
    expect(e.statusCode).toBe(500);
    expect(e).toBeInstanceOf(Error);
  });

  it('NotFoundError returns 404', () => {
    const e = new NotFoundError('User', '123');
    expect(e.message).toBe('User not found: 123');
    expect(e.statusCode).toBe(404);
  });

  it('UnauthorizedError returns 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it('ForbiddenError returns 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('ValidationError holds fields', () => {
    const e = new ValidationError('bad', { email: 'invalid' });
    expect(e.fields).toEqual({ email: 'invalid' });
  });

  it('ConflictError returns 409', () => {
    expect(new ConflictError('dup').statusCode).toBe(409);
  });

  it('IllegalStateError', () => {
    expect(new IllegalStateError('wrong state').code).toBe('ILLEGAL_STATE');
  });

  it('IdempotencyError', () => {
    expect(new IdempotencyError().code).toBe('IDEMPOTENCY_VIOLATION');
  });

  it('all extend TurnaError', () => {
    [NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError, IllegalStateError, IdempotencyError].forEach(cls => {
      expect(new (cls as any)('test', 'test')).toBeInstanceOf(TurnaError);
    });
  });
});