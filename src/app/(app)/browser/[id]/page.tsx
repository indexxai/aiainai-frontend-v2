import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { BrowserPage } from '@/components/jack/BrowserPage';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Jack’s browser' };

/** v2 Jack's browser, live: one browsing task Jack is doing. */
export default async function Browser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/browser/{id}', {
    params: { path: { id } },
    headers: { cookie },
    cache: 'no-store',
  });
  if (!data) notFound();
  return <BrowserPage initial={data} />;
}
