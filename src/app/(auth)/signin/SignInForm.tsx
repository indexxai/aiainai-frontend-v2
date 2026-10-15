'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner, Button, Field } from '@/ui';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage, isUnverified } from '@/lib/auth/messages';
import { safeNext } from '@/lib/auth/redirect';
import { GoogleButton } from '../GoogleButton';
import { TopAction } from '../TopAction';

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resetDone = params.get('reset') === '1';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await authClient.signIn.email({
      email: email.trim(),
      password,
      rememberMe: remember,
    });
    if (err) {
      setBusy(false);
      if (isUnverified(err)) {
        // Send a fresh code and finish verification first.
        await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'email-verification' });
        router.push(
          `/verify?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}&resent=1`,
        );
        return;
      }
      return setError(authErrorMessage(err));
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <>
      <TopAction
        text="New to Captain Jack's Bridge?"
        label="Create account"
        href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
      />
      <div className="au-head">
        <h1 className="au-title">Welcome back</h1>
        <p className="au-sub">Sign in to Captain Jack&rsquo;s Bridge.</p>
      </div>
      {params.has('expired') && !error && (
        <Banner tone="neutral">Your session ended. Sign in again to pick up where you left off.</Banner>
      )}
      {resetDone && <Banner tone="success">Password updated. Sign in with your new password.</Banner>}
      {error && <Banner tone="danger">{error}</Banner>}
      <GoogleButton next={next} onError={setError} />
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
        <Field
          label="Password"
          name="password"
          type="password"
          revealable
          autoComplete="current-password"
          labelAction={
            <Link
              className="au-link au-link-sm"
              href={`/forgot${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            >
              Forgot password?
            </Link>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="as-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in for 30 days
        </label>
        <Button
          type="submit"
          variant="primary"
          className="au-full"
          loading={busy}
          disabled={!email.trim() || !password}
        >
          Sign in
        </Button>
      </form>
    </>
  );
}
