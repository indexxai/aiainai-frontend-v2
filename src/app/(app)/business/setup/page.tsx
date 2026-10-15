import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BusinessSetup } from '@/components/space/BusinessSetup';
import { getMe, getSpaces } from '@/lib/session';

export const metadata: Metadata = { title: 'Business set-up' };

/** First time someone taps Business (v2 design "Business — first time you tap Business"). */
export default async function BusinessSetupPage() {
  const [spaces, me] = await Promise.all([getSpaces(), getMe()]);
  if (!spaces) redirect('/signin?expired=1');
  const signup = me?.onboarding.use === 'business' ? me.onboarding : undefined;
  return (
    <BusinessSetup
      business={spaces.business ?? null}
      signup={signup && { goals: signup.goals, note: signup.note }}
    />
  );
}
