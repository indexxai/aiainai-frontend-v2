/**
 * Plain-language messages for sign-in errors. Better Auth returns codes; people see these.
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'That email and password don’t match. Check them and try again.',
  INVALID_EMAIL: 'Enter a valid email address, like you@company.com.',
  INVALID_PASSWORD: 'That email and password don’t match. Check them and try again.',
  USER_ALREADY_EXISTS: 'There’s already an account with this email. Sign in instead.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'There’s already an account with this email. Sign in instead.',
  PASSWORD_TOO_SHORT: 'Use at least 8 characters for your password.',
  PASSWORD_TOO_WEAK: 'Your password needs at least 8 characters, a letter, and a number or symbol.',
  PASSWORD_TOO_LONG: 'Use 128 characters or fewer for your password.',
  INVALID_OTP: 'That code isn’t right. Check the email and try again.',
  OTP_EXPIRED: 'This code has expired. Send a new one.',
  TOO_MANY_ATTEMPTS: 'Too many tries with this code. Send a new one.',
  TOO_MANY_REQUESTS: 'Too many tries. Wait a minute, then try again.',
};

const FALLBACK = 'Something went wrong on our side. Please try again.';

export function authErrorMessage(
  error: { code?: string; status?: number; message?: string } | null | undefined,
): string {
  if (!error) return FALLBACK;
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
  return (error.code && MESSAGES[error.code]) || FALLBACK;
}

export const isUnverified = (error: { code?: string } | null | undefined) =>
  error?.code === 'EMAIL_NOT_VERIFIED';
