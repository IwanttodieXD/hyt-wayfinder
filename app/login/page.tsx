'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Get user info to determine redirect
      const user = useAuthStore.getState().user;

      // Role-based redirect
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        // Everyone else is a visitor and goes to the mobile check-in page
        router.push('/check-in');
      }
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <>
      <div className='min-h-screen flex items-center justify-center p-4'>
        {/* Login Card */}
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
            <p className='text-yellow-300'>Sign in to your account</p>
          </div>

          {/* Login Form */}
          <div className='border border-yellow-400/30 rounded-lg p-8 bg-navy-900/60'>
            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* Error Message */}
              {error && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2'>
                  <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-yellow-200 mb-2'
                >
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-envelope text-yellow-400'></i>
                  </div>
                  <input
                    type='email'
                    id='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-yellow-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
                      transition-colors
                      '
                    placeholder='you@example.com'
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-yellow-200 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-yellow-400'></i>
                  </div>
                  <input
                    type='password'
                    id='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-yellow-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={loading}
                className='
                  w-full py-3 rounded-lg font-semibold text-yellow-950
                  bg-yellow-500 hover:bg-yellow-600
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-yellow-500/50
                  '
              >
                {loading ? (
                  <>
                    <i className='fa-solid fa-spinner fa-spin'></i>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-right-to-bracket'></i>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className='mt-6 text-center text-sm text-navy-300'>
              Don&apos;t have an account?{' '}
              <Link
                href='/register'
                className='text-yellow-400 hover:text-yellow-300 font-semibold transition-colors'
              >
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
