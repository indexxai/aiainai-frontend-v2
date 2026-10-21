import { describe, expect, it } from 'vitest';
import { creditsWarning } from './credits';

describe('creditsWarning', () => {
  it('warns when a fifth or less of the month is left, and when empty', () => {
    expect(creditsWarning({ spendable: 60, monthly: 100 })).toBeNull();
    expect(creditsWarning({ spendable: 20, monthly: 100 })).toBeNull();
    expect(creditsWarning({ spendable: 12, monthly: 100 })).toEqual({
      tone: 'warning',
      text: 'You have 12 credits left this period.',
    });
    expect(creditsWarning({ spendable: 1, monthly: 100 })?.text).toBe('You have 1 credit left this period.');
    expect(creditsWarning({ spendable: 0, monthly: 100 })?.tone).toBe('danger');
  });
});
