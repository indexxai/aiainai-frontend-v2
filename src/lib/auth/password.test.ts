import { describe, expect, it } from 'vitest';
import { passwordOk } from './password';

describe('password rules (same as the backend)', () => {
  it('needs 8+ characters, a letter and a number or symbol', () => {
    expect(passwordOk('correct-horse')).toBe(true);
    expect(passwordOk('short1')).toBe(false);
    expect(passwordOk('12345678')).toBe(false);
    expect(passwordOk('abcdefgh')).toBe(false);
  });
});
