import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ActivityPage } from '@/components/jack/ActivityPage';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Activity' };

/** v2 Activity: what you and Jack did across both spaces, and what's coming up. */
export default async function Activity() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/activity', { headers: { cookie }, cache: 'no-store' });
  return <ActivityPage initial={data ?? { items: [], comingUp: [] }} />;
}
