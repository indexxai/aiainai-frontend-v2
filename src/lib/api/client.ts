import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/**
 * Typed client for the aiainai backend. Types come from the backend's openapi.json
 * (`pnpm api:types`), so a backend change that breaks the frontend fails the type check.
 *
 * In the browser, calls go to /api on this app and Next.js forwards them to the backend.
 * On the server (server components, route handlers), call the backend directly.
 */
export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl, credentials: 'include' });
}

export const api = createApiClient(
  typeof window === 'undefined'
    ? (process.env.BACKEND_URL ?? 'http://localhost:4000')
    : window.location.origin,
);

export type Schemas = components['schemas'];
