// Frontend liveness for the host (does not call the API). Full system health: /api/health.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { ok: true, version: process.env.APP_VERSION ?? 'dev' },
    { headers: { 'cache-control': 'no-store' } },
  );
}
