import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { MemoryPage } from '@/components/jack/MemoryPage';
import { getMe, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Memory' };

/** v2 Memory: what Jack knows in this space, editable. */
export default async function Memory() {
  const cookie = (await cookies()).toString();
  const [{ data }, me] = await Promise.all([
    serverApi().GET('/api/memory', { headers: { cookie }, cache: 'no-store' }),
    getMe(),
  ]);
  return (
    <MemoryPage
      initial={data ?? { enabled: true, items: [] }}
      space={me?.space.active ?? 'personal'}
      business={me?.space.business?.name ?? null}
    />
  );
}
