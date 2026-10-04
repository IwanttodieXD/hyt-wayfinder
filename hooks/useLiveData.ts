'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';

/** Which slice of a table to pull. 'none' leaves it alone. */
type Scope = 'today' | 'all' | 'none';

/**
 * Keeps a view's numbers live.
 *
 * These views used to fetch once on mount, so every count was a snapshot taken
 * whenever the page happened to load - a check-in at the kiosk never showed up
 * without a manual refresh. This re-fetches on an interval, and immediately when
 * the tab becomes visible again so switching back does not show stale data.
 *
 * Overlapping fetches are skipped: on a slow connection a second poll can land
 * after the first and overwrite it with older rows.
 */
export function useLiveData(options?: {
  /** Attendance rows to fetch. Defaults to today's. */
  records?: Scope;
  /** Room presence rows to fetch. Defaults to today's. */
  presence?: Scope;
  intervalMs?: number;
  /** Gate the polling, e.g. until the signed-in user is known to be an admin. */
  enabled?: boolean;
}) {
  const recordsScope = options?.records ?? 'today';
  const presenceScope = options?.presence ?? 'today';
  const intervalMs = options?.intervalMs ?? 10000;
  const enabled = options?.enabled ?? true;

  const { fetchRecords, fetchTodayRecords } = useRecordsStore();
  const { fetchTodayPresence, fetchAllPresence } = useRoomPresenceStore();

  const inFlight = useRef(false);
  // When the numbers on screen were last fetched. Callers can render this so a
  // refresh is visible rather than something the viewer has to take on trust.
  const [lastRefreshed, setLastRefreshed] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const jobs: Promise<unknown>[] = [];

      if (recordsScope === 'all') jobs.push(fetchRecords());
      else if (recordsScope === 'today') jobs.push(fetchTodayRecords());

      if (presenceScope === 'all') jobs.push(fetchAllPresence());
      else if (presenceScope === 'today') jobs.push(fetchTodayPresence());

      await Promise.all(jobs);
    } finally {
      inFlight.current = false;
      setLastRefreshed(Date.now());
    }
  }, [
    enabled,
    recordsScope,
    presenceScope,
    fetchRecords,
    fetchTodayRecords,
    fetchTodayPresence,
    fetchAllPresence,
  ]);

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

  return { lastRefreshed, refresh };
}
