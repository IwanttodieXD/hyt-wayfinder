'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, authResolved } = useAuthStore();

  // The session is restored once, app-wide, by <AuthGate>. Here we only route on
  // the resolved state - never on the pre-check value, which is what used to
  // send a signed-in person to /login on a plain reload.
  useEffect(() => {
    if (!authResolved) return;

    if (isAuthenticated && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/check-in');
    } else {
      router.replace('/login');
    }
  }, [authResolved, isAuthenticated, user, router]);

  // Show loading while the session check finishes and the redirect lands.
  return (
    <div className='w-full h-screen bg-navy-950 flex items-center justify-center'>
      <div className='text-center'>
        <div className='w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
        <p className='text-navy-300'>Loading...</p>
      </div>
    </div>
  );
}
