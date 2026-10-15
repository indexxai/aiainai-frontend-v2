import { describe, expect, it } from 'vitest';
import { toApiError } from './errors';

describe('toApiError', () => {
  it('keeps the backend message and request ID', () => {
    const e = toApiError({ error: { code: 'not_found', message: 'Chat not found', requestId: 'r1' } });
    expect(e).toEqual({ code: 'not_found', message: 'Chat not found', requestId: 'r1', details: undefined });
  });

  it('falls back safely for unexpected bodies', () => {
    expect(toApiError('<html>Bad gateway</html>').code).toBe('internal_error');
    expect(toApiError(null).message).toMatch(/your work is saved/i);
  });
});
