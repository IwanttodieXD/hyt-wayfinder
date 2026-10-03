import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

/**
 * Reference data: the rooms and purposes every other store reads.
 *
 * `rooms` is the single source of truth for what exists in the building. Nothing
 * else stores a room as free text - attendance and room visits both hold a
 * `room_id` and join back here for a name. That is why this store exists rather
 * than a hardcoded registry: rooms are created and retired through the admin UI,
 * and the scanner has to resolve a scanned code to a row without guessing.
 *
 * `purposes` lives here too because it is the same shape of lookup data and the
 * register/check-in forms need both lists at once.
 */

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  floor: string;
  building: string;
  /** Value encoded in this room's door QR code. Unique per room. */
  qrValue: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purpose {
  id: string;
  label: string;
  isActive: boolean;
}

/**
 * The purposes seeded by the migration, used as a fallback.
 *
 * The `purposes` table is readable only by signed-in users, but the
 * registration form needs the list before anyone signs in - so a brand-new
 * visitor would see an empty picker until the registration-fix migration
 * ("purposes readable by anyone") is applied. These labels are fixed by
 * `supabase/seed.sql`; once the fetch succeeds they are replaced by the real
 * rows, so the fallback is a safety net rather than a second source of truth.
 *
 * `id` is a readable placeholder, not a UUID: a purpose chosen from the
 * fallback is matched back to a real row by label before being written.
 */
export const FALLBACK_PURPOSES: Purpose[] = [
  'Interview',
  'Orientation',
  'Meeting',
  'Training',
  'Consultation',
  'Maintenance',
  'Delivery',
  'Other',
].map((label) => ({
  id: `fallback-${label.toLowerCase()}`,
  label,
  isActive: true,
}));

interface RoomsState {
  rooms: Room[];
  purposes: Purpose[];
  isLoading: boolean;
  /** Guards against refetching on every mount of every consumer. */
  hasFetched: boolean;

  fetchRooms: (force?: boolean) => Promise<void>;
  fetchPurposes: (force?: boolean) => Promise<void>;

  /** Active rooms in building order: ground floor, then floors ascending, then roof. */
  getActiveRooms: () => Room[];
  getAllRooms: () => Room[];
  getActivePurposes: () => Purpose[];
  getRoomById: (id: string | null | undefined) => Room | undefined;
  getRoomByNumber: (roomNumber: string | null | undefined) => Room | undefined;
  /** Resolves a scanned door code back to its room. */
  getRoomByQr: (qrValue: string) => Room | undefined;
}

/**
 * Floor ordering. `rooms.floor` is TEXT, so a plain sort would put '10' before
 * '2' and 'Roof' before '3'. Ranked explicitly instead.
 */
const FLOOR_ORDER: Record<string, number> = { G: 0, '2': 1, '3': 2, '4': 3, Roof: 4 };

function compareRooms(a: Room, b: Room): number {
  const floorDelta =
    (FLOOR_ORDER[a.floor] ?? 99) - (FLOOR_ORDER[b.floor] ?? 99);
  if (floorDelta !== 0) return floorDelta;

  // Roofdeck has no number, so fall back to the display name rather than
  // letting '' sort to the front of the roof.
  const aKey = /\d/.test(a.roomNumber) ? a.roomNumber : a.name;
  const bKey = /\d/.test(b.roomNumber) ? b.roomNumber : b.name;
  return aKey.localeCompare(bKey, undefined, { numeric: true });
}

function mapRoom(row: any): Room {
  return {
    id: row.id,
    roomNumber: row.room_number,
    name: row.name,
    floor: row.floor,
    building: row.building,
    qrValue: row.qr_value,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  purposes: [],
  isLoading: false,
  hasFetched: false,

  fetchRooms: async (force = false) => {
    if (get().isLoading) return;
    if (!force && get().hasFetched) return;

    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number');

      if (error) {
        console.error('Error fetching rooms:', error);
        set({ isLoading: false });
        return;
      }

      const rooms = (data ?? []).map(mapRoom).sort(compareRooms);
      set({ rooms, isLoading: false, hasFetched: true });
    } catch (error) {
      console.error('Error fetching rooms:', error);
      set({ isLoading: false });
    }
  },

  fetchPurposes: async (force = false) => {
    if (get().isLoading) return;
    // Only skip the fetch if real rows are already loaded. A previous fallback
    // must not block a retry, otherwise applying the fix migration would not
    // take effect until a hard reload.
    const hasRealRows = get().purposes.some((p) => !p.id.startsWith('fallback-'));
    if (!force && hasRealRows) return;

    try {
      const { data, error } = await supabase
        .from('purposes')
        .select('*')
        .order('label');

      if (error) {
        // Expected before the registration-fix migration is applied, and also
        // for anyone not yet signed in. Fall back to the seeded labels so the
        // pickers still render instead of silently appearing empty.
        console.warn(
          'Could not load purposes from the database; using the built-in list. ' +
            'Apply supabase/migrations/20260101000002_registration_fix.sql to fix this.',
          error
        );
        set({ purposes: FALLBACK_PURPOSES });
        return;
      }

      set({
        purposes: (data ?? []).map((row: any) => ({
          id: row.id,
          label: row.label,
          isActive: row.is_active,
        })),
      });
    } catch (error) {
      console.warn('Could not load purposes; using the built-in list.', error);
      set({ purposes: FALLBACK_PURPOSES });
    }
  },

  getActiveRooms: () => get().rooms.filter((r) => r.isActive),
  getAllRooms: () => get().rooms,
  getActivePurposes: () => get().purposes.filter((p) => p.isActive),

  getRoomById: (id) => (id ? get().rooms.find((r) => r.id === id) : undefined),

  getRoomByNumber: (roomNumber) =>
    roomNumber
      ? get().rooms.find(
          (r) => r.roomNumber.toLowerCase() === roomNumber.toLowerCase()
        )
      : undefined,

  getRoomByQr: (qrValue) =>
    get().rooms.find(
      (r) => r.qrValue.toLowerCase() === qrValue.trim().toLowerCase()
    ),
}));