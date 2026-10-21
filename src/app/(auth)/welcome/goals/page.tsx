import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/redirect';
import { getMe } from '@/lib/session';
import { GoalsForm } from './GoalsForm';

export const metadata: Metadata = { title: 'What should Jack help with first?' };

/**
 * Sign-up step 2 of 2 (designs "Sign-up — what should Jack / Captain Jack help with first"):
 * shown right after Personal or Business is picked. Skipping is fine.
 */
export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  if (!me) redirect('/signin?expired=1');
  if (me.onboarding.askUse || !me.onboarding.use) redirect('/welcome');
  return (
    <GoalsForm
      use={me.onboarding.use}
      next={next}
      hasBusiness={!!me.space.business}
      initial={{ goals: me.onboarding.goals, note: me.onboarding.note }}
    />
  );
}
