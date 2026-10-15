import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('keeps pages on this site', () => {
    expect(safeNext('/docs/abc?x=1')).toBe('/docs/abc?x=1');
  });
  it('blocks other sites and odd paths', () => {
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
  it('never loops back to the sign-in pages', () => {
    expect(safeNext('/signin')).toBe('/');
    expect(safeNext('/welcome?next=/docs')).toBe('/');
  });
});
