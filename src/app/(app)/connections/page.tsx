import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ConnectionsPage } from '@/components/space/ConnectionsPage';
import { ModelsCard } from '@/components/space/ModelsCard';
import { getMe, getSpaces, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Connections' };

/** v2 Connections: apps Jack can use in this space, and the models behind him. */
export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const cookie = (await cookies()).toString();
  const [spaces, { data }, params, me] = await Promise.all([
    getSpaces(),
    serverApi().GET('/api/connections', { headers: { cookie }, cache: 'no-store' }),
    searchParams,
    getMe(),
  ]);
  if (!spaces) redirect('/signin?expired=1');
  return (
    <ConnectionsPage
      initial={data ?? { demo: false, browser: 'off' as const, apps: [] }}
      returned={params.connected ?? null}
      aside={<ModelsCard spaces={spaces} />}
    />
  );
}
