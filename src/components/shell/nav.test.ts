import { describe, expect, it } from 'vitest';
import { FOOTER_NAV, MAIN_NAV, isActive, sectionFor } from './nav';

describe('navigation', () => {
  it('finds the section for nested paths', () => {
    expect(sectionFor('/')?.id).toBe('home');
    expect(sectionFor('/chat/abc123')?.id).toBe('chat');
    expect(sectionFor('/settings/billing')?.id).toBe('billing');
    expect(sectionFor('/chatter')).toBeUndefined();
  });

  it('highlights exactly one main item', () => {
    const active = MAIN_NAV.filter((s) => isActive(s, '/docs/q4-plan', 'personal'));
    expect(active.map((s) => s.id)).toEqual(['docs']);
  });

  it('highlights the Jack of the current space in conversations and v1 tools that are now his', () => {
    for (const path of ['/', '/chat/abc', '/research']) {
      expect(MAIN_NAV.filter((s) => isActive(s, path, 'personal')).map((s) => s.id)).toEqual(['jack']);
      expect(MAIN_NAV.filter((s) => isActive(s, path, 'business')).map((s) => s.id)).toEqual(['captain']);
    }
    expect(MAIN_NAV.map((s) => s.label)).toEqual([
      'Jack of all trades',
      'Captain Jack',
      'Activity',
      'Approvals',
      'Projects',
      'Docs',
      'Image',
      'Files',
      'Wallet',
      'Memory',
      'Connections',
    ]);
  });

  it('highlights Projects and Files on their own pages', () => {
    expect(MAIN_NAV.filter((s) => isActive(s, '/projects/abc', 'personal')).map((s) => s.id)).toEqual([
      'projects',
    ]);
    expect(MAIN_NAV.filter((s) => isActive(s, '/files', 'business')).map((s) => s.id)).toEqual(['files']);
  });

  it('keeps Settings highlighted on the billing page', () => {
    expect(isActive(FOOTER_NAV[0]!, '/settings/billing')).toBe(true);
  });
});
