'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Requests a password-reset email from Supabase.
 *
 * The response is deliberately generic. Supabase itself does not reveal whether
 * an address has an account (resetPasswordForEmail succeeds either way, to
 * prevent account enumeration), and neither does this page - it always shows the
 * "check your email" state on a successful call, so the screen cannot be used to
 * test which addresses are registered.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // The reset link must come back to this app. Supabase appends the recovery
    // token to this URL, so it has to be allow-listed under Authentication ->
    // URL Configuration in the Supabase dashboard, or the link is rejected.
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
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
          <p className='text-orange-300'>Reset your password</p>
        </div>

        <div className='border border-orange-400/30 rounded-lg p-8 bg-navy-900/60'>
          {sent ? (
            // Sent state. Generic on purpose: it confirms nothing about whether
            // the address exists.
            <div className='text-center'>
              <div className='w-16 h-16 mx-auto mb-5 rounded-full bg-orange-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-envelope-open-text text-orange-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-3'>
                Check your email
              </h2>
              <p className='text-navy-300 text-sm mb-2'>
                If an account exists for
              </p>
              <p className='text-white font-semibold mb-6 break-all'>{email}</p>
              <p className='text-navy-400 text-sm mb-6'>
                we sent a link to reset your password. Open it to choose a new
                one. The link expires after a while, so if it has gone stale,
                request another.
              </p>
              <Link
                href='/login'
                className='
                  inline-block w-full px-4 py-3 rounded-lg
                  bg-orange-500 hover:bg-orange-600 text-paper
                  font-semibold text-sm transition-colors
                '
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-6'>
              {error && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2'>
                  <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-envelope text-orange-400'></i>
                  </div>
                  <input
                    type='email'
                    id='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='you@example.com'
                  />
                </div>
                <p className='text-navy-400 text-xs mt-2'>
                  We will email you a link to set a new password.
                </p>
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-paper-plane'></i>
                    <span>Send reset link</span>
                  </>
                )}
              </button>
            </form>
          )}

          {!sent && (
            <div className='mt-6 text-center text-sm text-navy-300'>
              Remembered it?{' '}
              <Link
                href='/login'
                className='text-orange-400 hover:text-orange-300 font-semibold transition-colors'
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
