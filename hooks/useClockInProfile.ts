'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useClockInStore } from '@/store/clockInStore';
import { useRoomsStore } from '@/store/roomsStore';
import { useRecordsStore } from '@/store/recordsStore';

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

/**
 * Keeps the visitor's check-in state honest, by reading the database.
 *
 * This fixes three symptoms at once:
 *
 * 1. Refreshing `/check-in` said "not checked in" for someone who was actually
 *    inside, because the state was only ever in memory (`clockInStore` has no
 *    `persist`).
 * 2. That made the scanner treat them as not clocked in, so scanning the
 *    entrance code would have CLOCKED THEM OUT mid-visit.
 * 3. The "View 3D Route" button is gated on being checked in, so the route was
 *    unreachable after a refresh.
 *
 * Polls so the badge and the route button reflect a check-out done at the kiosk,
 * or an archive by an admin, without the visitor having to reload.
 */
export function useAttendanceStatus(userId: string | undefined) {
  const { fetchTodayRecords, getActiveRecords } = useRecordsStore();
  const { syncFromServer } = useClockInStore();

  const inFlight = useRef(false);

  const sync = useCallback(async () => {
    if (!userId) return;

    // Skip rather than overlap: on a slow connection a second concurrent fetch
    // can land after the first and overwrite it with older data.
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      await fetchTodayRecords();

      // `getActiveRecords` reads the store the fetch just wrote, so this sees
      // fresh data without a second round trip.
      const mine = getActiveRecords().find((r) => r.userId === userId);

      syncFromServer(
        mine ? { id: mine.id, timeIn: mine.timeIn } : null
      );
    } finally {
      inFlight.current = false;
    }
  }, [userId, fetchTodayRecords, getActiveRecords, syncFromServer]);

  // Immediate sync on mount, so a refresh is correct before the first paint of
  // state-dependent UI.
  useEffect(() => {
    if (!userId) return;
    sync();
  }, [userId, sync]);

  useEffect(() => {
    if (!userId) return;

    const id = setInterval(() => {
      // Don't poll a hidden tab; nothing is looking at the result.
      if (document.visibilityState === 'visible') sync();
    }, 30000);

    // Coming back to the tab should show current state immediately.
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, sync]);
}