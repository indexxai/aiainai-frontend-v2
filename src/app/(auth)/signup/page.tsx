import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
