'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';

/**
 * Keeps the admin counts and tables live.
 *
 * These views used to fetch once on mount, so the numbers were a snapshot taken
 * whenever the page happened to load - a check-in at the kiosk never showed up
 * without a manual refresh. This re-fetches on an interval, and immediately when
 * the tab becomes visible again so switching back does not show stale data.
 *
 * Overlapping fetches are skipped: on a slow connection a second poll can land
 * after the first and overwrite it with older rows.
 */
export function useLiveData(options?: {
  /** Fetch the full history instead of only today's rows. */
  allRecords?: boolean;
  intervalMs?: number;
  /** Gate the polling, e.g. until the signed-in user is known to be an admin. */
  enabled?: boolean;
}) {
  const allRecords = options?.allRecords ?? false;
  const intervalMs = options?.intervalMs ?? 20000;
  const enabled = options?.enabled ?? true;

  const { fetchRecords, fetchTodayRecords } = useRecordsStore();
  const { fetchTodayPresence } = useRoomPresenceStore();

  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      if (allRecords) {
        await fetchRecords();
      } else {
        await fetchTodayRecords();
      }
      await fetchTodayPresence();
    } finally {
      inFlight.current = false;
    }
  }, [enabled, allRecords, fetchRecords, fetchTodayRecords, fetchTodayPresence]);

  useEffect(() => {
    if (!enabled) return;

    refresh();

    const id = setInterval(() => {
      // Don't poll a hidden tab; nothing is looking at the result.
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);

    // Coming back to the tab should show current data immediately.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh, intervalMs]);
}
