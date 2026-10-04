'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type UserRole } from '@/store/authStore';

/**
 * Client-side role gate for a page.
 *
 * Redirects unauthenticated visitors to `/login`, and authenticated users
 * whose role is not allowed to `fallback`. Returns whether the current user is
 * allowed to render, so callers can bail out early instead of flashing
 * protected UI before the redirect lands.
 *
 * Note: this is a UX guard only. Every page here is a client component that
 * talks to Supabase directly, so real authorization must also be enforced by
 * Supabase RLS policies.
 */
export function useRoleGuard(allowed: UserRole[], fallback: string = '/login') {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const role = user?.role;

  // Kept in a ref so a fresh array literal on every render can't retrigger
  // the effect below.
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  // Revalidate the Supabase session on every guarded mount.
  //
  // This used to live only in `app/page.tsx`, so refreshing any other guarded
  // route (/check-in, /visitor, /admin/...) left the store resting on whatever
  // Zustand had rehydrated from localStorage. When that disagreed with the real
  // session the guard bounced the visitor to /login. Validating here means the
  // store is correct before any redirect decision is made, and a revoked or
  // expired session is caught rather than trusted.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Wait for `checkAuth` to settle. Redirecting while it is still in flight is
    // exactly the bug this fixes: `isAuthenticated` is false until it finishes.
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (role && !allowedRef.current.includes(role)) {
      router.push(fallback);
    }
  }, [isAuthenticated, isLoading, role, router, fallback]);

  return isAuthenticated && !isLoading && !!role && allowed.includes(role);
}