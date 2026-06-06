// ─── Base ────────────────────────────────────────────────────────────────────

export class BelurError extends Error {
  public override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.cause = cause
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

export class BelurHttpError extends BelurError {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly raw?: unknown,
    cause?: unknown,
  ) {
    super(message, cause)
  }
}

export class BelurAuthError extends BelurHttpError {
  constructor(cause?: unknown) {
    super(401, 'Unauthorized: invalid or missing API token', undefined, cause)
  }
}

export class BelurForbiddenError extends BelurHttpError {
  constructor(cause?: unknown) {
    super(403, 'Forbidden: access denied', undefined, cause)
  }
}

export class BelurNotFoundError extends BelurHttpError {
  constructor(message = 'Not found', cause?: unknown) {
    super(404, message, undefined, cause)
  }
}

export class BelurServerError extends BelurHttpError {
  constructor(raw?: unknown, cause?: unknown) {
    super(500, 'Internal server error from Belurk API', raw, cause)
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

export class BelurValidationError extends BelurError {
  constructor(
    public readonly issues: unknown,
    cause?: unknown,
  ) {
    super('Failed to validate API response', cause)
  }
}

// ─── Result type ─────────────────────────────────────────────────────────────

export interface BelurErrorPayload {
  code: string
  message: string
  cause?: unknown
}

export type BelurResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: BelurErrorPayload }

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function ok<T>(data: T): BelurResult<T> {
  return { status: 'success', data }
}

export function fail<T>(error: BelurErrorPayload): BelurResult<T> {
  return { status: 'error', error }
}

export function toErrorPayload(err: unknown): BelurErrorPayload {
  if (err instanceof BelurAuthError) {
    return { code: 'AUTH_ERROR', message: err.message, cause: err.cause }
  }
  if (err instanceof BelurForbiddenError) {
    return { code: 'FORBIDDEN', message: err.message, cause: err.cause }
  }
  if (err instanceof BelurNotFoundError) {
    return { code: 'NOT_FOUND', message: err.message, cause: err.cause }
  }
  if (err instanceof BelurServerError) {
    return { code: 'SERVER_ERROR', message: err.message, cause: err.cause }
  }
  if (err instanceof BelurHttpError) {
    return { code: `HTTP_${err.statusCode}`, message: err.message, cause: err.cause }
  }
  if (err instanceof BelurValidationError) {
    return { code: 'VALIDATION_ERROR', message: err.message, cause: err.issues }
  }
  if (err instanceof BelurError) {
    return { code: 'BELUR_ERROR', message: err.message, cause: err.cause }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'Unknown error',
    cause: err,
  }
}