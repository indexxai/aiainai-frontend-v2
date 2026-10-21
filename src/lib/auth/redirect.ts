/** Only allow redirects to pages on this site (blocks "//evil.com" and "https://…"). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (['/signin', '/signup', '/verify', '/welcome'].some((p) => next.startsWith(p))) return fallback;
  return next;
}

/** Session cookie names Better Auth uses (plain in development, __Secure- over HTTPS). */
export const SESSION_COOKIES = ['aiainai.session_token', '__Secure-aiainai.session_token'];

/** Set by the proxy on page requests: the path and query asked for (the app layout can't see the URL). */
export const PATH_HEADER = 'x-aiainai-path';
