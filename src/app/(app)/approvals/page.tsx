import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ApprovalsPage } from '@/components/jack/ApprovalsPage';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Approvals' };

/** v2 Approvals: everything waiting for your OK, from both spaces. */
export default async function Approvals() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/approvals', { headers: { cookie }, cache: 'no-store' });
  return (
    <ApprovalsPage
      initial={data ?? { pending: [], decided: [], modes: {}, jackPending: [], jackDecided: [] }}
    />
  );
}
