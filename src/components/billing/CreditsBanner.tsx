'use client';
import { useRouter } from 'next/navigation';
import { Banner } from '@/ui';
import { creditsWarning, type CreditsLike } from '@/lib/credits';

/** "You have 12 credits left this period." with Top up / Upgrade, when credits run low. */
export function CreditsBanner({
  credits,
  plan,
  className,
}: {
  credits: CreditsLike;
  plan: 'free' | 'pro';
  className?: string;
}) {
  const router = useRouter();
  const warning = creditsWarning(credits);
  if (!warning) return null;
  return (
    <Banner
      tone={warning.tone}
      className={className}
      actionLabel={plan === 'pro' ? 'Top up' : 'Upgrade'}
      onAction={() => router.push(plan === 'pro' ? '/settings/billing' : '/settings/billing/plans')}
    >
      {warning.text}
    </Banner>
  );
}
