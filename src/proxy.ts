import { NextResponse, type NextRequest } from 'next/server';
import { PATH_HEADER, SESSION_COOKIES } from './lib/auth/redirect';

const AUTH_PAGES = ['/signin', '/signup', '/verify', '/forgot', '/reset'];
/** Open to everyone, signed in or not: documents shared by link. */
const PUBLIC_PAGES = ['/s/', '/landing', '/for/'];

/**
 * Fast first check before rendering: no session cookie → go to sign-in (remembering where
 * the person was going). The real check happens on the server in the app layout, which
 * asks the backend whether the session is valid.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = SESSION_COOKIES.some((n) => req.cookies.has(n));
  const onAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Signed-out visitors to the home page see the Jack’s AI landing page (the address stays "/").
  if (!hasSession && pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }
  if (!hasSession && !onAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  // The app found the session expired or revoked: drop the dead cookie and show sign-in.
  if (hasSession && pathname === '/signin' && req.nextUrl.searchParams.has('expired')) {
    const res = NextResponse.next();
    for (const n of SESSION_COOKIES)
      if (req.cookies.has(n))
        res.cookies.set(n, '', { maxAge: 0, path: '/', secure: n.startsWith('__Secure-') });
    return res;
  }
  if (hasSession && (pathname === '/signin' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  const forward = new Headers(req.headers);
  forward.set(PATH_HEADER, pathname + search);
  return NextResponse.next({ request: { headers: forward } });
}

export const config = {
  // Everything except the API (forwarded to the backend), Next internals, health and static files.
  matcher: [
    '/((?!api/|_next/|healthz|favicon|icon|apple-touch-icon|logo|.*\\.(?:png|svg|jpg|webp|woff2)$).*)',
  ],
};
