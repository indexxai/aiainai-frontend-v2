import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PlansView } from '@/components/billing/PlansView';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Upgrade your plan' };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; checkout?: string }>;
}) {
  const { tab, checkout } = await searchParams;
  const cookie = (await cookies()).toString();
  const summary = await serverApi().GET('/api/billing/summary', { headers: { cookie }, cache: 'no-store' });
  if (!summary.data) throw new Error('Could not load billing');
  return (
    <PlansView
      current={summary.data.plan.key}
      paidUntil={summary.data.plan.paidUntil}
      initialTab={tab === 'business' ? 'business' : 'personal'}
      cancelled={checkout === 'cancelled'}
    />
  );
}
