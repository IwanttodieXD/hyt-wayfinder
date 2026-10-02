'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useClockInStore } from '@/store/clockInStore';

/**
 * Mirrors the signed-in user's profile into the clock-in store, so the mobile
 * view and the resulting clock-in record show who is checking in and where
 * they are headed.
 *
 * Shared by every page that renders `StudentMobileView`, so a new route can't
 * silently forget to sync the profile.
 */
export function useClockInProfile() {
  const { user, isAuthenticated } = useAuthStore();
  const { setStudentName, setDestination } = useClockInStore();

  // Held in a ref so the store actions don't retrigger the effect on every
  // render.
  const actionsRef = useRef({ setStudentName, setDestination });
  actionsRef.current = { setStudentName, setDestination };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const { setStudentName, setDestination } = actionsRef.current;
    setStudentName(user.name);

    // Only override the store's default when the profile actually has one.
    // Otherwise a user with no destination would quietly clock in to
    // "TESDA Electronics Lab", which is exactly the wrong thing to record.
    if (user.destination) {
      setDestination(user.destination);
    }
  }, [isAuthenticated, user]);
}