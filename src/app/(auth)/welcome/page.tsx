import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/redirect';
import { getMe } from '@/lib/session';
import { WelcomeChoice } from './WelcomeChoice';

export const metadata: Metadata = { title: 'What will you use Jack for?' };

/**
 * Last step of sign-up: Personal or Business. Only new accounts are asked, once; the app layout
 * sends them here until they answer. Anyone else is sent on to the app.
 */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  if (!me) redirect('/signin?expired=1');
  if (!me.onboarding.askUse) redirect(next);
  return <WelcomeChoice next={next} />;
}
