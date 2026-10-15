import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ toString: () => '' }) }));

const { initialsOf, toShellSession } = await import('./session');

describe('session helpers', () => {
  it('makes initials from the name, falling back to the email', () => {
    expect(initialsOf('Sara Malik', 's@x.co')).toBe('SM');
    expect(initialsOf('Indexx', 'i@x.co')).toBe('IN');
    expect(initialsOf('', 'kashif@x.co')).toBe('KA');
  });

  it('shows spendable credits and how much of the plan is used', () => {
    const s = toShellSession({
      user: { id: '1', name: 'Sara Malik', email: 's@x.co', emailVerified: true, image: null },
      workspace: { id: 'w', name: 'W', plan: 'free', periodEnd: '2026-11-05T00:00:00Z' },
      credits: { spendable: 1240, plan: 60, topup: 1180, held: 0, monthly: 100 },
      preferences: { textModel: 'auto' },
      space: { active: 'personal', business: null },
      onboarding: { askUse: false, use: 'personal', goals: [], note: '' },
    });
    expect(s.credits).toEqual({ remaining: '1,240', percent: 40, plan: 'Jack Free' });
    expect(s.user.initials).toBe('SM');
  });
});
