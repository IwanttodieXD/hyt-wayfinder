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
  const { user, isAuthenticated } = useAuthStore();
  const role = user?.role;

  // Kept in a ref so a fresh array literal on every render can't retrigger
  // the effect below.
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (role && !allowedRef.current.includes(role)) {
      router.push(fallback);
    }
  }, [isAuthenticated, role, router, fallback]);

  return isAuthenticated && !!role && allowed.includes(role);
}