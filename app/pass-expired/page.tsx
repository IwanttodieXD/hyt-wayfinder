'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { personLabel } from '@/lib/trainee';
import { Alert, AuthShell, Badge, Button } from '@/components/ui';

/**
 * Pass Expired.
 *
 * Destination page for visitors whose `valid_until` has passed. The login
 * page and the root index route both redirect here when `passExpired` is true;
 * no nav points at it. The session is left intact so the page can read the
 * visitor's identity and show their expiry date — expiry is a business rule,
 * not an auth failure.
 *
 * If someone lands here without an expired session (e.g. typing the URL), they
 * are sent to /login. The page never re-redirects to itself, so there is no
 * loop with `checkAuth` (which AuthGate runs on every load).
 */
export default function PassExpiredPage() {
  const router = useRouter();
  const { user, passExpired, authResolved, logout } = useAuthStore();

  // Wait for AuthGate's checkAuth to settle. `passExpired` is recomputed on
  // every load, so a cold reload of this page reads false until the check
  // finishes — same gate `useRoleGuard` already relies on.
  useEffect(() => {
    if (!authResolved) return;

    // Someone navigating here directly, or whose pass has since been renewed,
    // has no business on this page.
    if (!user || !passExpired) {
      router.replace('/login');
    }
  }, [authResolved, user, passExpired, router]);

  if (!authResolved || !user || !passExpired) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent'></div>
          <p className='text-navy-300'>Loading…</p>
        </div>
      </div>
    );
  }

  const expiry = user.validUntil ? new Date(user.validUntil) : null;
  const expiryLabel = expiry
    ? expiry.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const handleBackToLogin = () => {
    // Clear the expired session so they can re-login once the pass is renewed.
    logout();
    router.push('/login');
  };

  return (
    <AuthShell
      eyebrow='Pass status'
      title='Your pass has expired'
      subtitle='Your record and visit history are safe. Only new check-ins are paused.'
    >
      <div className='text-center'>
        {/* Amber, not red: an expired pass is a soft block, not an error.
            The person's account and history still exist; only the day is
            over. */}
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/15'>
          <i className='fa-solid fa-clock text-2xl text-yellow-400'></i>
        </div>

        <div className='mb-5 flex flex-wrap items-center justify-center gap-2'>
          <Badge tone='warning' dot>
            Expired
          </Badge>
          <Badge tone='neutral' icon='fa-id-card'>
            {personLabel(user.visitorType)}
          </Badge>
        </div>

        <p className='text-sm leading-relaxed text-navy-300'>
          Your access has reached its expiration date, so the entrance scanner
          will not start a new visit. Ask the front desk to renew the pass.
        </p>
      </div>

      {/* Trainee info. Only the fields carried on the session `User` —
          company/host live on `ManagedUser` (admin view), not here. */}
      <div className='mt-5 space-y-2 rounded-xl border border-navy-700 bg-navy-950/40 p-4 text-sm'>
        <div className='flex justify-between gap-3'>
          <span className='text-navy-400'>Name</span>
          <span className='text-right font-medium text-white'>{user.name}</span>
        </div>
        <div className='flex justify-between gap-3'>
          <span className='text-navy-400'>Expiration date</span>
          <span className='text-right font-medium text-yellow-300'>
            {expiryLabel}
          </span>
        </div>
      </div>

      {/* Next steps. Mirrors the "ask reception" wording used in the scanner
          banner and the verify flow, so the person hears one consistent
          message. */}
      <Alert tone='warning' className='mt-5' icon='fa-circle-info'>
        <p className='font-semibold text-white'>What should you do?</p>
        <p className='mt-1 leading-relaxed'>
          Contact your{' '}
          <span className='font-medium text-yellow-300'>
            trainer or HYT Global Institute administrator
          </span>{' '}
          to request a pass extension. Once the pass has been renewed, sign in
          again and the entrance check-in will work as usual.
        </p>
      </Alert>

      <Button
        onClick={handleBackToLogin}
        icon='fa-right-from-bracket'
        size='lg'
        className='mt-6 w-full'
      >
        Back to sign in
      </Button>
    </AuthShell>
  );
}
