import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CaptainJackSoon } from '@/components/space/CaptainJackSoon';
import { getMe } from '@/lib/session';

export const metadata: Metadata = { title: 'Captain Jack — coming soon' };

/** Captain Jack (Business) before launch. Once the Business space opens, this goes to Jack's home. */
export default async function CaptainJackPage() {
  const me = await getMe();
  if (!me) redirect('/signin?expired=1');
  if (me.businessOpen) redirect('/');
  return <CaptainJackSoon onList={me.waitlist.includes('captain-jack')} email={me.user.email} />;
}
