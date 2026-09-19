export class TurnaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'TurnaError';
  }
}

export class NotFoundError extends TurnaError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends TurnaError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends TurnaError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends TurnaError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends TurnaError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class IllegalStateError extends TurnaError {
  constructor(message: string) {
    super(message, 'ILLEGAL_STATE', 400);
    this.name = 'IllegalStateError';
  }
}

export class IdempotencyError extends TurnaError {
  constructor(message = 'Duplicate operation') {
    super(message, 'IDEMPOTENCY_VIOLATION', 409);
    this.name = 'IdempotencyError';
  }
}