'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useClockInStore } from '@/store/clockInStore';
import { useRoomsStore } from '@/store/roomsStore';

/**
 * Mirrors the signed-in user's profile into the clock-in store, so the mobile
 * view and the resulting clock-in record show who is checking in and where
 * they are headed.
 *
 * Also loads the rooms list. `StudentMobileView` resolves the assigned room's
 * name from the `rooms` table, and `/visitor` and `/check-in` both render that
 * component without otherwise loading rooms. Doing it here means neither page
 * can forget, and the store caches it so the second render is free.
 */
export function useClockInProfile() {
  const { user, isAuthenticated } = useAuthStore();
  const { setStudentName, setDestination } = useClockInStore();
  const { fetchRooms } = useRoomsStore();

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

    fetchRooms();
  }, [isAuthenticated, user, fetchRooms]);
}