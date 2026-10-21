import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ApprovalsPage } from '@/components/jack/ApprovalsPage';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Approvals' };

/** v2 Approvals: what Jack is waiting for your OK on. */
export default async function Approvals() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/approvals', { headers: { cookie }, cache: 'no-store' });
  return <ApprovalsPage initial={data ?? { jackPending: [], jackDecided: [] }} />;
}
