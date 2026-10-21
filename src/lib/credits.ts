export interface CreditsLike {
  spendable: number;
  monthly: number;
}

export interface CreditsWarning {
  tone: 'warning' | 'danger';
  text: string;
}

/**
 * The credits banner from the Billing designs: out of credits, or less than a fifth of the
 * monthly allowance left. Nothing otherwise.
 */
export function creditsWarning(c: CreditsLike): CreditsWarning | null {
  if (c.spendable <= 0)
    return { tone: 'danger', text: 'You’re out of credits. New answers can’t start until you add more.' };
  if (c.monthly > 0 && c.spendable < c.monthly * 0.2)
    return {
      tone: 'warning',
      text: `You have ${c.spendable.toLocaleString('en-US')} ${c.spendable === 1 ? 'credit' : 'credits'} left this period.`,
    };
  return null;
}

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
