'use client';
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/**
 * Talks to Better Auth on the backend through this app's own /api/auth (forwarded by
 * Next.js), so the session cookie is first-party on the aiainai domain.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin,
  basePath: '/api/auth',
  plugins: [emailOTPClient()],
});

/** Shown only when the backend has Google keys (set NEXT_PUBLIC_GOOGLE_SIGNIN=true). */
export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === 'true';
