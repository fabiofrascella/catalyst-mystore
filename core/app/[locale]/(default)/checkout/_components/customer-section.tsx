'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/vibes/soul/primitives/button';
import { Input } from '@/vibes/soul/form/input';

import { checkoutLogin } from '../_actions/checkout-login';

type Mode = 'guest' | 'sign-in';

interface Props {
  isActive: boolean;
  isCompleted: boolean;
  customer: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isLoggedIn: boolean;
  };
  completedEmail: string | null;
  onComplete: (email: string) => void;
  onEdit: () => void;
}

export function CustomerSection({
  isActive,
  isCompleted,
  customer,
  completedEmail,
  onComplete,
  onEdit,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('guest');

  // Guest fields
  const [guestEmail, setGuestEmail] = useState('');
  const [guestError, setGuestError] = useState('');

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleGuestContinue = () => {
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setGuestError('Please enter a valid email address');
      return;
    }
    setGuestError('');
    onComplete(guestEmail);
  };

  const handleLoggedInContinue = () => {
    onComplete(customer.email ?? '');
  };

  const handleSignIn = () => {
    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter your email and password');
      return;
    }
    setSignInError('');

    startTransition(async () => {
      const result = await checkoutLogin(signInEmail, signInPassword);

      if (result.success) {
        router.refresh();
        onComplete(signInEmail);
      } else {
        setSignInError(result.error ?? 'Login failed');
      }
    });
  };

  const displayEmail = completedEmail ?? customer.email;

  return (
    <div className="border-b border-contrast-100 pb-6">
      <div className="flex items-center gap-4 py-4">
        <StepIndicator isActive={isActive} isCompleted={isCompleted} step={1} />
        <h2
          className={`flex-1 font-semibold text-lg ${isActive || isCompleted ? 'text-foreground' : 'text-contrast-300'}`}
        >
          Customer
        </h2>
        {isCompleted && !isActive && (
          <button
            className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>

      {isCompleted && !isActive && displayEmail && (
        <p className="ml-12 text-sm text-contrast-400">{displayEmail}</p>
      )}

      {isActive && (
        <div className="ml-12 space-y-4">
          {customer.isLoggedIn ? (
            <>
              <p className="text-sm text-contrast-500">
                Continuing as{' '}
                <span className="font-medium text-foreground">
                  {customer.firstName} {customer.lastName}
                </span>{' '}
                ({customer.email})
              </p>
              <Button onClick={handleLoggedInContinue} size="small" variant="secondary">
                Continue to Shipping
              </Button>
            </>
          ) : mode === 'guest' ? (
            <>
              <p className="text-sm text-contrast-500">
                Already have an account?{' '}
                <button
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={() => {
                    setSignInError('');
                    setMode('sign-in');
                  }}
                >
                  Sign in
                </button>
              </p>
              <Input
                errors={guestError ? [guestError] : undefined}
                label="Email address"
                name="email"
                onChange={(e) => {
                  setGuestEmail(e.target.value);
                  setGuestError('');
                }}
                required
                type="email"
                value={guestEmail}
              />
              <Button onClick={handleGuestContinue} size="small" variant="secondary">
                Continue as Guest
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-contrast-500">
                No account?{' '}
                <button
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  onClick={() => {
                    setSignInError('');
                    setMode('guest');
                  }}
                >
                  Continue as guest
                </button>
              </p>
              <Input
                label="Email address"
                name="signInEmail"
                onChange={(e) => {
                  setSignInEmail(e.target.value);
                  setSignInError('');
                }}
                required
                type="email"
                value={signInEmail}
              />
              <Input
                label="Password"
                name="signInPassword"
                onChange={(e) => {
                  setSignInPassword(e.target.value);
                  setSignInError('');
                }}
                required
                type="password"
                value={signInPassword}
              />
              {signInError && (
                <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{signInError}</p>
              )}
              <div className="flex items-center gap-4">
                <Button loading={isPending} onClick={handleSignIn} size="small" variant="secondary">
                  Sign in
                </Button>
                <a
                  className="text-sm text-contrast-500 underline underline-offset-2 hover:no-underline"
                  href="/login/forgot-password"
                >
                  Forgot password?
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StepIndicator({
  step,
  isActive,
  isCompleted,
}: {
  step: number;
  isActive: boolean;
  isCompleted: boolean;
}) {
  if (isCompleted) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <svg fill="none" height="14" viewBox="0 0 14 14" width="14">
          <path
            d="M2 7l3.5 3.5L12 3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">
        {step}
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-contrast-200 text-contrast-300 text-sm">
      {step}
    </div>
  );
}
