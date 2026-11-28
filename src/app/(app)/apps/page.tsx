import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AppsList } from '@/components/apps/AppsList';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Apps' };

export default async function Apps() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/apps', { headers: { cookie }, cache: 'no-store' });
  return <AppsList apps={data ?? []} />;
}
