import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { BillingView } from '@/components/billing/BillingView';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Billing and usage' };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const cookie = (await cookies()).toString();
  const api = serverApi();
  const [summary, history, payments] = await Promise.all([
    api.GET('/api/billing/summary', { headers: { cookie }, cache: 'no-store' }),
    api.GET('/api/billing/history', { headers: { cookie }, cache: 'no-store' }),
    api.GET('/api/billing/payments', { headers: { cookie }, cache: 'no-store' }),
  ]);
  if (!summary.data || !history.data) throw new Error('Could not load billing');
  return (
    <BillingView
      summary={summary.data}
      history={history.data}
      payments={payments.data ?? { items: [], mode: 'off' }}
      checkout={checkout}
    />
  );
}
