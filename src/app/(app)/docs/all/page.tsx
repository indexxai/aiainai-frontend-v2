import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { DocsList } from '@/components/docs/DocsList';
import { getMe, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'All documents' };

export default async function AllDocsPage() {
  const cookie = (await cookies()).toString();
  const [{ data }, me] = await Promise.all([
    serverApi().GET('/api/docs', {
      params: { query: { scope: 'all' } },
      headers: { cookie },
      cache: 'no-store',
    }),
    getMe(),
  ]);
  return (
    <DocsList
      items={data?.items ?? []}
      nextCursor={data?.nextCursor ?? null}
      email={me?.user.email ?? 'your email'}
    />
  );
}
