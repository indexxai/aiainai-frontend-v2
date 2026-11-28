import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { AppWorkspace } from '@/components/apps/AppWorkspace';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'App' };

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const res = await serverApi().GET('/api/apps/{id}', {
    params: { path: { id } },
    headers: { cookie },
    cache: 'no-store',
  });
  if (res.response.status === 404) notFound();
  if (!res.data) throw new Error(`Could not load the app (status ${res.response.status})`);
  return <AppWorkspace key={id} initial={res.data} />;
}
