import type { Schemas } from './client';

export type ApiError = Schemas['ApiErrorResponse']['error'];

const FALLBACK = 'Something went wrong on our side. Your work is saved; please try again.';

/** Read the backend's standard error shape; anything else becomes a safe generic error. */
export function toApiError(body: unknown): ApiError {
  const err = (body as { error?: Partial<ApiError> } | null)?.error;
  if (err && typeof err.code === 'string' && typeof err.message === 'string') {
    return {
      code: err.code,
      message: err.message,
      requestId: err.requestId ?? 'unknown',
      details: err.details,
    };
  }
  return { code: 'internal_error', message: FALLBACK, requestId: 'unknown' };
}
