import { describe, expect, it } from 'vitest';
import { groupLabel } from './client';

describe('groupLabel', () => {
  const now = new Date(2026, 9, 6, 15, 0);
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
  it('groups chats by how recent they are', () => {
    expect(groupLabel(at(2026, 9, 6, 1), now)).toBe('Today');
    expect(groupLabel(at(2026, 9, 5, 23), now)).toBe('Yesterday');
    expect(groupLabel(at(2026, 9, 1), now)).toBe('Previous 7 days');
    expect(groupLabel(at(2026, 8, 20), now)).toBe('Previous 30 days');
    expect(groupLabel(at(2026, 6, 2), now)).toBe('July');
    expect(groupLabel(at(2025, 11, 2), now)).toBe('December 2025');
  });
});
