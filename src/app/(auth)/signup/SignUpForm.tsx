'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner, Button, Field } from '@/ui';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { safeNext } from '@/lib/auth/redirect';
import { passwordOk } from '@/lib/auth/password';
import { GoogleButton } from '../GoogleButton';
import { PasswordRules } from '../PasswordRules';
import { TopAction } from '../TopAction';

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [taken, setTaken] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setTaken(false);
    if (!passwordOk(password))
      return setError('Your password needs at least 8 characters, a letter, and a number or symbol.');
    setBusy(true);
    const { error: err } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) {
      setTaken(err.code === 'USER_ALREADY_EXISTS' || err.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
      return setError(authErrorMessage(err));
    }
    router.push(`/verify?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <TopAction
        text="Already have an account?"
        label="Sign in"
        href={`/signin${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
      />
      <div className="au-head">
        <h1 className="au-title">Create your account</h1>
        <p className="au-sub">Start free — no card needed.</p>
      </div>
      {error && (
        <Banner tone="danger">
          {error}
          {taken && (
            <>
              {' '}
              <Link className="au-link" href={`/signin?email=${encodeURIComponent(email)}`}>
                Sign in
              </Link>
            </>
          )}
        </Banner>
      )}
      <GoogleButton next={next} onError={setError} />
      <form className="au-form" onSubmit={submit} noValidate>
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Field
          label="Work or personal email"
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          aria-describedby="pw-rules"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <PasswordRules password={password} id="pw-rules" />
        <Button
          type="submit"
          variant="primary"
          className="au-full"
          loading={busy}
          disabled={!name.trim() || !email.trim() || !passwordOk(password)}
        >
          Create account
        </Button>
        <p className="au-small">
          By creating an account you agree to the <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </form>
    </>
  );
}
