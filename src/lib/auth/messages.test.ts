import { describe, expect, it } from 'vitest';
import { authErrorMessage, isUnverified } from './messages';

describe('auth error messages', () => {
  it('maps known codes to plain language', () => {
    expect(authErrorMessage({ code: 'INVALID_OTP' })).toMatch(/code isn’t right/);
    expect(authErrorMessage({ code: 'USER_ALREADY_EXISTS' })).toMatch(/Sign in instead/);
  });
  it('treats rate limiting by status', () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Wait a minute/);
  });
  it('never shows raw server messages', () => {
    expect(authErrorMessage({ code: 'SOMETHING_NEW', message: 'stack trace…' })).not.toContain('stack');
  });
  it('detects unverified accounts', () => {
    expect(isUnverified({ code: 'EMAIL_NOT_VERIFIED' })).toBe(true);
  });
});
