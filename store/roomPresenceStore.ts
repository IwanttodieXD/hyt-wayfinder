import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

/**
 * Room presence tracking.
 *
 * This is deliberately NOT attendance. Attendance lives in `clock_in_records`
 * and is only ever written by scanning the ground floor station code (see
 * `clockInStore` / `recordsStore`). Presence here answers a narrower question:
 * of the people currently checked in, which room is each one sitting in right
 * now?
 *
 * Rows are append-only. Scanning a room door opens a row with `entered_at` and
 * no `exited_at`; scanning a different room (or the same one again) closes the
 * open row first. Keeping the history means "who was in Room 304 at 3pm" is
 * answerable, not just "who is in it now".
 */

export interface RoomPresence {
  id: string;
  userId: string;
  userName?: string;
  room: string;
  roomLabel: string;
  enteredAt: Date;
  exitedAt: Date | null;
}

interface RoomPresenceState {
  presence: RoomPresence[];

  /**
   * Records that the user is in `room` now, closing any room they were in
   * before. Returns the new open row's id on success.
   */
  enterRoom: (params: {
    userId: string;
    room: string;
    roomLabel: string;
  }) => Promise<{ success: boolean; error?: string; presenceId?: string }>;

  /** Closes the user's currently open row, if any. */
  leaveRoom: (userId: string) => Promise<{ success: boolean; error?: string }>;

  /** The room the user is in right now, or null if nowhere tracked. */
  getCurrentRoom: (userId: string) => RoomPresence | null;

  /** Everyone with an open row, grouped by room. Rooms with nobody are absent. */
  getOccupancyByRoom: () => { room: string; roomLabel: string; people: RoomPresence[] }[];

  getPresenceCount: () => number;
  fetchTodayPresence: () => Promise<void>;
  /** Full history, not just today. Used by the admin room-visits page. */
  fetchAllPresence: () => Promise<void>;
  /** Visits to one room, newest first. */
  getVisitsByRoom: (room: string) => RoomPresence[];
  /** Rooms that have at least one visit, with their totals. */
  getRoomSummaries: () => RoomSummary[];
}

function mapRow(row: any): RoomPresence {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.users?.name || 'Unknown User',
    room: row.room,
    roomLabel: row.room_label || row.room,
    enteredAt: new Date(row.entered_at),
    exitedAt: row.exited_at ? new Date(row.exited_at) : null,
  };
}

const SELECT = `*, users:user_id (name)`;

/** How long someone spent in a room, from their own two timestamps. */
export function visitDuration(enteredAt: Date, exitedAt: Date | null): string {
  if (!exitedAt) return '—';
  // A negative span means the clock moved (DST, or a device with a skewed
  // clock). Showing a negative "duration" would be worse than showing nothing.
  return formatDuration(exitedAt.getTime() - enteredAt.getTime());
}

/** Per-room totals for the admin page. */
export interface RoomSummary {
  room: string;
  roomLabel: string;
  totalVisits: number;
  insideNow: number;
  uniqueVisitors: number;
  /** Mean length of completed visits, or null when nothing has left yet. */
  averageDuration: string | null;
}

/** Formats a span in ms. Negative spans return an em dash rather than "-5m". */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export const useRoomPresenceStore = create<RoomPresenceState>((set, get) => ({
  presence: [],

  enterRoom: async ({ userId, room, roomLabel }) => {
    try {
      // Close whatever room they were in first, so they can never be counted
      // in two rooms at once. Deliberately tolerant of failure: if this update
      // fails we still record the new room rather than losing the scan, but the
      // stale row stays open and shows up in occupancy until it's fixed.
      const { data: openRows, error: openError } = await supabase
        .from('room_presence')
        .select('id')
        .eq('user_id', userId)
        .is('exited_at', null);

      if (!openError && openRows && openRows.length > 0) {
        await supabase
          .from('room_presence')
          .update({ exited_at: new Date().toISOString() })
          .in(
            'id',
            openRows.map((r) => r.id)
          );
      }

      const { data, error } = await supabase
        .from('room_presence')
        .insert([
          {
            user_id: userId,
            room,
            room_label: roomLabel,
            entered_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const row = mapRow(data);
      set((state) => ({ presence: [row, ...state.presence] }));

      return { success: true, presenceId: data.id };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  leaveRoom: async (userId) => {
    try {
      const { error } = await supabase
        .from('room_presence')
        .update({ exited_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('exited_at', null);

      if (error) {
        return { success: false, error: error.message };
      }

      const now = new Date().toISOString();
      set((state) => ({
        presence: state.presence.map((p) =>
          p.userId === userId && !p.exitedAt ? { ...p, exitedAt: new Date(now) } : p
        ),
      }));

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  getCurrentRoom: (userId) =>
    get().presence.find((p) => p.userId === userId && !p.exitedAt) ?? null,

  getOccupancyByRoom: () => {
    const byRoom = new Map<string, RoomPresence[]>();

    for (const entry of get().presence) {
      if (entry.exitedAt) continue;
      const list = byRoom.get(entry.room) ?? [];
      list.push(entry);
      byRoom.set(entry.room, list);
    }

    return Array.from(byRoom.entries()).map(([room, people]) => ({
      room,
      roomLabel: people[0]?.roomLabel || room,
      people,
    }));
  },

  getPresenceCount: () => get().presence.filter((p) => !p.exitedAt).length,

  getVisitsByRoom: (room) =>
    get()
      .presence.filter((p) => p.room === room)
      .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime()),

  getRoomSummaries: () => {
    const byRoom = new Map<string, RoomPresence[]>();

    for (const entry of get().presence) {
      const list = byRoom.get(entry.room) ?? [];
      list.push(entry);
      byRoom.set(entry.room, list);
    }

    return Array.from(byRoom.entries()).map(([room, visits]) => {
      // Only visits that have both timestamps AND a sane ordering can contribute
      // to the average. Summing the bad ones would drag the mean down (or make
      // it negative) for the whole room.
      const spans = visits
        .filter((v) => v.exitedAt)
        .map((v) => v.exitedAt!.getTime() - v.enteredAt.getTime())
        .filter((ms) => ms >= 0);

      return {
        room,
        roomLabel: visits[0]?.roomLabel || room,
        totalVisits: visits.length,
        insideNow: visits.filter((v) => !v.exitedAt).length,
        uniqueVisitors: new Set(visits.map((v) => v.userId)).size,
        averageDuration:
          spans.length > 0
            ? formatDuration(spans.reduce((a, b) => a + b, 0) / spans.length)
            : null,
      };
    });
  },

  fetchAllPresence: async () => {
    try {
      const { data, error } = await supabase
        .from('room_presence')
        .select(SELECT)
        .order('entered_at', { ascending: false });

      if (error) {
        console.error('Error fetching room presence history:', error);
        return;
      }

      if (data) {
        set({ presence: data.map(mapRow) });
      }
    } catch (error) {
      console.error('Error fetching room presence history:', error);
    }
  },

  fetchTodayPresence: async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('room_presence')
        .select(SELECT)
        .gte('entered_at', today.toISOString())
        .order('entered_at', { ascending: false });

      if (error) {
        console.error('Error fetching room presence:', error);
        return;
      }

      if (data) {
        set({ presence: data.map(mapRow) });
      }
    } catch (error) {
      console.error('Error fetching room presence:', error);
    }
  },
}));
