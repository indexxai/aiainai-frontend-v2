import { NextResponse, type NextRequest } from 'next/server';

/**
 * Landing-page preview: the Jack's AI landing page is the whole site. "/" shows it (the
 * address stays "/"); every other page, including sign-in and the app, goes back to "/".
 * The full app's routing lives on `main`.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/landing') return NextResponse.next();
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }
  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  // Everything except the API (forwarded to the backend), Next internals, health and static files.
  matcher: [
    '/((?!api/|_next/|healthz|favicon|icon|apple-touch-icon|logo|.*\\.(?:png|svg|jpg|webp|woff2)$).*)',
  ],
};
