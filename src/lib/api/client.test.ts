import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

describe('api client', () => {
  it('calls the health endpoint and returns typed data', async () => {
    const body = { ok: true, version: 'test', checks: { database: { ok: true, ms: 3 } } };
    const fetchMock = vi.fn(async () => Response.json(body));
    const api = createApiClient('https://aiainai.test');
    const { data, error } = await api.GET('/api/health', { fetch: fetchMock });
    expect(error).toBeUndefined();
    expect(data?.checks.database?.ok).toBe(true);
    const req = (fetchMock.mock.calls[0] as unknown as [Request])[0];
    expect(new URL(req.url).pathname).toBe('/api/health');
  });
});
