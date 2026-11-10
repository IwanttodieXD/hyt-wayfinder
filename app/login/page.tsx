'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Alert, AuthShell, Button, Field, controlClass } from '@/components/ui';

/**
 * Sign-in for staff accounts and returning pass holders.
 *
 * Trainees normally do not need this screen: the entrance QR at /verify signs
 * them in with their name and course. The trainee path is still linked below so
 * someone who lands here by habit has a way forward.
 */
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
      const { user, passExpired } = useAuthStore.getState();

      // Role-based redirect
      if (user?.role === 'admin') {
        router.push('/admin');
      } else if (passExpired) {
        // An expired visitor is turned away from /check-in. The pass-expired
        // page shows their expiry date and tells them to ask for a renewal;
        // the session stays intact so the page can read their identity.
        router.push('/pass-expired');
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
    <AuthShell
      eyebrow='Staff & returning passes'
      title='Sign in'
      subtitle='Use the account issued to you by the HYT Global front desk.'
      asideLogo='large'
      aside={
        <div className='space-y-5'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400'>
            Trainee check-in
          </p>
          <h2 className='text-3xl font-bold leading-tight text-white'>
            No password needed at the door.
          </h2>
          <p className='max-w-md text-sm leading-relaxed text-navy-400'>
            If you are here for a course or orientation, scan the entrance QR or
            open the verification screen. Your name and course are enough to
            start today’s attendance.
          </p>
          <Link
            href='/verify'
            className='inline-flex items-center gap-2 text-sm font-semibold text-yellow-300 transition-colors hover:text-yellow-200'
          >
            <i className='fa-solid fa-arrow-left text-xs'></i>
            Go to entrance check-in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-5'>
        {error && (
          <Alert tone='danger' role='alert'>
            {error}
          </Alert>
        )}

        <Field label='Email address' htmlFor='email' required>
          <input
            type='email'
            id='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete='email'
            className={controlClass}
            placeholder='you@example.com'
          />
        </Field>

        <Field label='Password' htmlFor='password' required>
          <input
            type='password'
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete='current-password'
            className={controlClass}
            placeholder='••••••••'
          />
        </Field>

        <Button
          type='submit'
          loading={loading}
          icon='fa-right-to-bracket'
          size='lg'
          className='w-full'
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className='mt-5 border-t border-navy-800 pt-5 text-center text-sm text-navy-300'>
        New here?{' '}
        <Link
          href='/register'
          className='font-semibold text-yellow-300 transition-colors hover:text-yellow-200'
        >
          Register for a pass
        </Link>
      </div>

      <div className='mt-3 text-center'>
        <Link
          href='/verify'
          className='text-xs text-navy-400 transition-colors hover:text-navy-200'
        >
          Trainee? Check in at the entrance instead
        </Link>
      </div>
    </AuthShell>
  );
}
