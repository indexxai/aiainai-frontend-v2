import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { WalletPage } from '@/components/jack/WalletPage';
import { getMe, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Wallet' };

/** v2 Wallet: how Jack pays, limits, blocked sites and receipts for this space. */
export default async function Wallet() {
  const cookie = (await cookies()).toString();
  const opts = { headers: { cookie }, cache: 'no-store' as const };
  const [w, r, me] = await Promise.all([
    serverApi().GET('/api/wallet', opts),
    serverApi().GET('/api/wallet/receipts', opts),
    getMe(),
  ]);
  if (!w.data) throw new Error('Wallet could not load');
  return (
    <WalletPage initial={w.data} receipts={r.data?.items ?? []} space={me?.space.active ?? 'personal'} />
  );
}
