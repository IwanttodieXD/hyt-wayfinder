'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Restores the Supabase session exactly once, before any page renders.
 *
 * Without this, each page decided on its own whether it was signed in, using
 * the Zustand store's initial (or rehydrated) value. On a reload that value is
 * not yet the truth - the real session lives in Supabase's own storage - so
 * guards bounced signed-in people to /login, and RLS-scoped queries ran with no
 * session attached and came back empty (records "not fetching", counts at zero).
 *
 * Blocking the first paint until `checkAuth` resolves means every page starts
 * from a store that already reflects the real session.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { authResolved, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!authResolved) {
    return (
      <div className='w-full h-screen bg-navy-950 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-navy-300'>Restoring your session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
