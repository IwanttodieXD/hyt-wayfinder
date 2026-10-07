'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

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
      <div className='w-full h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-navy-300'>Loading...</p>
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
    <div className='min-h-screen flex items-start sm:items-center justify-center p-4 sm:py-8'>
      <div className='w-full max-w-md'>
        <div className='glass-panel border-navy-700 rounded-lg p-6 sm:p-8'>
          {/* Same mark as the other auth screens, so this reads as part of the
              product rather than a separate app bolted on. */}
          <div className='text-center mb-6'>
            <div className='w-14 h-14 mx-auto mb-3 flex items-center justify-center'>
              <img
                src='/hyt_logo.png'
                alt='HYT Global'
                className='w-full h-full object-contain'
              />
            </div>
            <h1 className='text-2xl font-bold text-white mb-1'>HYT Wayfinder</h1>
            <p className='text-yellow-300 text-sm'>HYT Global Institute</p>
          </div>

          <div className='text-center py-2'>
            {/* Amber, not red: an expired pass is a soft block, not an error.
                The visitor's account and history still exist; only the day is
                over. */}
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center'>
              <i className='fa-solid fa-clock text-amber-400 text-2xl'></i>
            </div>

            <h2 className='text-xl font-bold text-white mb-2'>Pass Expired</h2>
            <p className='text-navy-300 text-sm mb-4'>
              Your visitor pass has expired.
            </p>
            <p className='text-navy-400 text-sm leading-relaxed'>
              Your access to the visitor system is no longer active because
              your pass has reached its expiration date.
            </p>
          </div>

          {/* Visitor info. Only the fields carried on the session `User` —
              company/host live on `ManagedUser` (admin view), not here. */}
          <div className='mt-5 rounded-lg border border-navy-700 bg-navy-950/40 p-4 space-y-2 text-sm'>
            <div className='flex justify-between gap-3'>
              <span className='text-navy-400'>Name</span>
              <span className='text-white font-medium text-right'>
                {user.name}
              </span>
            </div>
            <div className='flex justify-between gap-3'>
              <span className='text-navy-400'>Expiration date</span>
              <span className='text-amber-300 font-medium text-right'>
                {expiryLabel}
              </span>
            </div>
          </div>

          {/* Next steps. Mirrors the "ask reception" wording used in the
              existing amber banner on StudentMobileView and the verify flow,
              so the user hears one consistent message. */}
          <div className='mt-5'>
            <h3 className='text-white font-semibold text-sm mb-2'>
              What should you do?
            </h3>
            <p className='text-navy-300 text-sm leading-relaxed'>
              Please contact your{' '}
              <span className='text-yellow-300 font-medium'>
                host, trainer, or HYT Global Institute administrator
              </span>{' '}
              to request a pass extension or a new visitor registration.
            </p>
            <p className='text-navy-400 text-sm leading-relaxed mt-2'>
              Once your pass has been renewed or a new pass has been issued,
              you can return and log in again.
            </p>
          </div>

          <button
            onClick={handleBackToLogin}
            className='w-full py-3 rounded-lg font-semibold text-yellow-950 bg-yellow-500 hover:bg-yellow-600 transition-colors duration-150 flex items-center justify-center gap-2 border border-yellow-500/50 mt-6'
          >
            <i className='fa-solid fa-right-from-bracket'></i>
            Back to Login
          </button>
        </div>

        <p className='text-center text-navy-500 text-xs mt-4'>
          HYT Global Institute · Visitor Management System
        </p>
      </div>
    </div>
  );
}
