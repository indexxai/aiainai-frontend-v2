import { describe, expect, it } from 'vitest';
import { isThemePreference, resolveTheme } from './theme';

describe('theme', () => {
  it('follows the device setting only for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('rejects unknown stored values', () => {
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference('system')).toBe(true);
  });
});
