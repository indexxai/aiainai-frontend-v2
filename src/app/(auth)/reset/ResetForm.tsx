'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner, Button, CodeInput, Field, Icon } from '@/ui';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { passwordOk } from '@/lib/auth/password';
import { PasswordRules } from '../PasswordRules';
import { mmss, useCountdown } from '../useCountdown';

/** Step 2 (enter the emailed code) and step 3 (choose a new password) of password reset. */
export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { left, restart } = useCountdown(60);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function checkCode(otp = code) {
    if (otp.length !== 6) return;
    setBusy(true);
    setError('');
    const { error: err } = await authClient.emailOtp.checkVerificationOtp({
      email,
      otp,
      type: 'forget-password',
    });
    setBusy(false);
    if (err) {
      setCode('');
      return setError(authErrorMessage(err));
    }
    setStep('password');
  }

  async function resend() {
    setError('');
    const { error: err } = await authClient.emailOtp.requestPasswordReset({ email });
    if (err && err.status === 429) return setError(authErrorMessage(err));
    setNotice('If this email has an account, a new code is on its way.');
    restart(60);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!passwordOk(password) || mismatch) return;
    setBusy(true);
    setError('');
    const { error: err } = await authClient.emailOtp.resetPassword({ email, otp: code, password });
    setBusy(false);
    if (err) {
      // The code may have expired while choosing a password: start the code step again.
      if (err.code === 'OTP_EXPIRED' || err.code === 'INVALID_OTP' || err.code === 'TOO_MANY_ATTEMPTS') {
        setStep('code');
        setCode('');
      }
      return setError(authErrorMessage(err));
    }
    router.push(`/signin?reset=1&email=${encodeURIComponent(email)}`);
  }

  if (step === 'code') {
    return (
      <>
        <div className="au-head">
          <span className="au-icon" aria-hidden>
            <Icon name="mail" size={20} />
          </span>
          <h1 className="au-title">Enter your reset code</h1>
          <p className="au-sub">
            We sent a 6-digit code to <b>{email || 'your email'}</b>. It expires in 10 minutes.
          </p>
        </div>
        {notice && !error && <Banner tone="neutral">{notice}</Banner>}
        {error && <Banner tone="danger">{error}</Banner>}
        <form
          className="au-form"
          onSubmit={(e) => {
            e.preventDefault();
            void checkCode();
          }}
        >
          <CodeInput
            label="6-digit code"
            value={code}
            onChange={setCode}
            onComplete={(c) => void checkCode(c)}
            invalid={!!error}
            disabled={busy}
          />
          <Button
            type="submit"
            variant="primary"
            className="au-full"
            loading={busy}
            disabled={code.length !== 6}
          >
            Continue
          </Button>
        </form>
        <p className="au-small">
          Didn’t get it? Check spam, or{' '}
          <button type="button" className="au-link" onClick={resend} disabled={left > 0}>
            {left > 0 ? `send a new code in ${mmss(left)}` : 'send a new code'}
          </button>
          .
        </p>
        <p className="au-small">
          Wrong email?{' '}
          <Link className="au-link" href={`/forgot?email=${encodeURIComponent(email)}`}>
            Change it
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="au-head">
        <h1 className="au-title">Choose a new password</h1>
        <p className="au-sub">
          For <b>{email}</b>.
        </p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <form className="au-form" onSubmit={save} noValidate>
        <Field
          label="New password"
          type="password"
          revealable
          autoComplete="new-password"
          aria-describedby="pw-rules"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRules password={password} id="pw-rules" />
        <Field
          label="Confirm new password"
          type="password"
          revealable
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords don’t match.' : undefined}
        />
        <Button
          type="submit"
          variant="primary"
          className="au-full"
          loading={busy}
          disabled={!passwordOk(password) || confirm !== password}
        >
          Save new password
        </Button>
      </form>
    </>
  );
}
