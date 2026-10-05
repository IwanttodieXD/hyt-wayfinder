'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Where the Supabase recovery email lands.
 *
 * The link carries a short-lived recovery token. Supabase's client picks it up
 * from the URL and establishes a session; this page waits for that to happen,
 * then lets the person set a new password. If no recovery session appears (the
 * link expired, was already used, or they navigated here directly) the page says
 * so and points them back to the request form rather than showing a dead form.
 *
 * Reaching this page signed in normally would also satisfy the session check,
 * which is harmless: updateUser would simply change the password of the account
 * that is already authenticated.
 */
export default function ResetPasswordPage() {
  const { logout } = useAuthStore();

  // 'checking' until the recovery session is confirmed, so the form never
  // flashes for someone whose link is dead.
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>(
    'checking'
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    // Fires once the client consumes the recovery token from the URL.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    // Fallback for a token already processed before this listener attached: the
    // session is present even though the event has been and gone.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setStatus('ready');
        return;
      }
      // Still nothing: give detectSessionInUrl a moment to consume a token that
      // is still sitting in the URL before declaring the link dead.
      window.setTimeout(() => {
        if (active) setStatus((s) => (s === 'checking' ? 'invalid' : s));
      }, 1500);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Same floor the register form enforces, so the rule is consistent.
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // The recovery session has served its purpose. Sign out so the person
    // re-enters with the password they just chose, and so the store does not
    // keep an identity that was only ever a recovery grant.
    await logout();
    setLoading(false);
    setDone(true);
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <div className='relative w-full max-w-md'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <div className='inline-block w-40 h-40 mb-4'>
            <img
              src='/hyt_logo.png'
              alt='HYT Logo'
              className='w-full h-full object-contain'
            />
          </div>
          <h1 className='text-3xl font-bold text-white mb-2'>HYT Wayfinder</h1>
          <p className='text-orange-300'>Set a new password</p>
        </div>

        <div className='border border-orange-400/30 rounded-lg p-8 bg-navy-900/60'>
          {/* Still waiting to confirm the recovery session. */}
          {status === 'checking' && (
            <div className='text-center py-6'>
              <div className='w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-navy-300 text-sm'>Verifying your reset link...</p>
            </div>
          )}

          {/* Dead or missing link. Offer the way back instead of a dead form. */}
          {status === 'invalid' && (
            <div className='text-center'>
              <div className='w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-link-slash text-red-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-3'>
                Link not valid
              </h2>
              <p className='text-navy-300 text-sm mb-6'>
                This reset link is invalid or has expired. Request a new one and
                try again.
              </p>
              <Link
                href='/forgot-password'
                className='
                  inline-block w-full px-4 py-3 rounded-lg
                  bg-orange-500 hover:bg-orange-600 text-paper
                  font-semibold text-sm transition-colors
                '
              >
                Request a new link
              </Link>
            </div>
          )}

          {/* Password changed. */}
          {status === 'ready' && done && (
            <div className='text-center'>
              <div className='w-16 h-16 mx-auto mb-5 rounded-full bg-orange-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-circle-check text-orange-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-3'>
                Password updated
              </h2>
              <p className='text-navy-300 text-sm mb-6'>
                Your password has been changed. Sign in with your new password.
              </p>
              <Link
                href='/login'
                className='
                  inline-block w-full px-4 py-3 rounded-lg
                  bg-orange-500 hover:bg-orange-600 text-paper
                  font-semibold text-sm transition-colors
                '
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {/* The actual form. */}
          {status === 'ready' && !done && (
            <form onSubmit={handleSubmit} className='space-y-6'>
              {error && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2'>
                  <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
                  <span>{error}</span>
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  New Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete='new-password'
                    className='
                      w-full pl-12 pr-12 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                  {/* type='button' matters: without it this submits the form. */}
                  <button
                    type='button'
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className='absolute inset-y-0 right-0 pr-4 flex items-center text-orange-400 hover:text-orange-300 transition-colors'
                  >
                    <i
                      className={`fa-solid ${
                        showPassword ? 'fa-eye-slash' : 'fa-eye'
                      }`}
                    ></i>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Confirm New Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id='confirmPassword'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete='new-password'
                    className='
                      w-full pl-12 pr-12 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                  {/* type='button' matters: without it this submits the form. */}
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                    className='absolute inset-y-0 right-0 pr-4 flex items-center text-orange-400 hover:text-orange-300 transition-colors'
                  >
                    <i
                      className={`fa-solid ${
                        showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'
                      }`}
                    ></i>
                  </button>
                </div>
              </div>

              <button
                type='submit'
                disabled={loading}
                className='
                  w-full py-3 rounded-lg font-semibold text-paper
                  bg-orange-600 hover:bg-orange-700
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-orange-500/50
                  '
              >
                {loading ? (
                  <>
                    <i className='fa-solid fa-spinner fa-spin'></i>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-key'></i>
                    <span>Update password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
