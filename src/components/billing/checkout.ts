import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';

export type CheckoutBody = { kind: 'topup'; pack: '500' | '1200' | '3000' } | { kind: 'plan'; plan: 'pro' };

/** Credit packs (same as the backend's TOPUP_PACKS). */
export const PACKS = [
  { id: '500', credits: 500, price: '$5' },
  { id: '1200', credits: 1200, price: '$10', note: 'Best value' },
  { id: '3000', credits: 3000, price: '$25' },
] as const;

/**
 * Open Stripe's payment page. Resolves with an error message if it couldn't start; on success
 * the browser leaves the app (and comes back to Billing with ?checkout=<id>).
 */
export async function startCheckout(body: CheckoutBody): Promise<string | null> {
  const { data, error } = await api.POST('/api/billing/checkout', { body });
  if (data?.url) {
    window.location.assign(data.url);
    return null;
  }
  return toApiError(error).message;
}
