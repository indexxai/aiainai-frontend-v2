# aiainai frontend

Next.js app for **aiainai (AI Station)**: every screen on desktop and phone. The NestJS API lives in the
separate `aiainai-backend` repo.

## How it talks to the backend

The browser only calls this app. Requests to `/api/*` are forwarded to the backend (`BACKEND_URL`), so users
see one domain and sign-in cookies stay first-party. Calls are made with a **typed client**
(`src/lib/api/client.ts`) generated from the backend's `openapi.json`:

```bash
pnpm api:types                          # from ../aiainai-backend/openapi.json (default)
API_SPEC=https://<api-host>/api/swagger-json pnpm api:types   # or from a running backend
```

Commit the regenerated `src/lib/api/schema.d.ts` with the change that needs it.

## Run locally

Node 22, pnpm 10 (`corepack enable`). Start the backend first (see its README; `pnpm dev:memory` there
runs it without MongoDB, with sample answers), then:

```bash
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

## Layout

```
src/app/(app)        signed-in screens inside the app shell (sidebar / rail / phone tabs)
src/app              root layout, 404, /healthz (this app's own health check)
src/components/shell app shell: navigation config, responsive layout, More sheet
src/components/page  page column and empty states
src/ui               aiainai design system in React: tokens, components, icons
src/lib/api          typed API client, generated schema, error helper
src/lib/theme        dark / light / system theme (no flash on load)
src/app/(auth)       sign-up, email code, sign-in, forgot / reset password
src/proxy.ts         sends people without a session to sign-in (remembers where they were going)
src/lib/auth         Better Auth client, error messages, safe redirects
src/lib/session.ts   asks the backend who is signed in (GET /api/me) for the app shell
```

## Commands

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format` — CI runs all of them on every pull request.

## Layout breakpoints

Phone < 768 px (top bar + bottom tabs + More sheet) · tablet 768–1279 px (icon rail) · desktop ≥ 1280 px (full sidebar).

## Rules

- Colours, type and spacing come only from design tokens (`src/ui/styles/tokens.css`). Status is icon + word.
- Screens follow the AI Station design canvas; new components go in `src/ui` with a test.
- No secrets in this repo; the frontend holds none (all keys live in the backend).
