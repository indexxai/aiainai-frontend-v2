import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { TeamRoom } from '@/components/team/TeamRoom';
import { TeamSetup } from '@/components/team/TeamSetup';
import { getMe, getModelMenu, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'AI Crews' };

export default async function TeamPage() {
  const cookie = (await cookies()).toString();
  const [state, menu, me] = await Promise.all([
    serverApi().GET('/api/team', { headers: { cookie }, cache: 'no-store' }),
    getModelMenu('text'),
    getMe(),
  ]);
  const team = state.data?.team ?? null;
  if (team && team.status !== 'setup') {
    const room = await serverApi().GET('/api/team/room', { headers: { cookie }, cache: 'no-store' });
    return <TeamRoom team={team} menu={menu} initial={room.data ?? null} />;
  }
  return <TeamSetup menu={menu} plan={me?.workspace?.plan === 'pro' ? 'pro' : 'free'} />;
}
