'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner, Button, Field, Icon } from '@/ui';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { TopAction } from '../TopAction';

export function ForgotForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
    setBusy(false);
    // The same message shows whether or not the email has an account, so nobody can probe for accounts.
    if (err && err.status === 429) return setError(authErrorMessage(err));
    router.push(`/reset?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <>
      <TopAction text="Remembered it?" label="Sign in" href="/signin" />
      <div className="au-head">
        <Link href="/signin" className="au-back">
          <Icon name="chevron-left" size={16} />
          Back to sign in
        </Link>
        <h1 className="au-title">Reset your password</h1>
        <p className="au-sub">
          Enter the email you signed up with. If it has an account, we’ll send a 6-digit code.
        </p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <form className="au-form" onSubmit={submit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" className="au-full" loading={busy} disabled={!email.trim()}>
          Send code
        </Button>
      </form>
      <p className="au-small">
        Signed up with Google? You don’t need a password —{' '}
        <Link className="au-link" href="/signin">
          continue with Google
        </Link>
        .
      </p>
    </>
  );
}
