import { create } from 'zustand';

export type ClockInStatus = 'not-clocked-in' | 'clocked-in';

interface StudentProfile {
  name: string;
  /**
   * The assigned room, held as a room NUMBER because that is what
   * `getRoomByNumber` resolves.
   *
   * The former `id`, `building` and `room` fields are gone. `id` was never set
   * (it rendered as a bare "ID #"), and `building`/`room` were hardcoded
   * placeholders that no action ever updated, so the visitor header showed
   * "Building B, Room 304" under every destination. The real values come from
   * the `rooms` table via `useRoomsStore`.
   */
  destination: string;
}

interface ClockInState {
  // Student data
  student: StudentProfile;
  clockInTime: Date | null;
  status: ClockInStatus;
  activeRecordId: string | null;

  // Clock-in actions
  clockIn: (recordId?: string) => void;
  clockOut: () => void;
  /** Reconciles in-memory state with the open attendance record in the database. */
  syncFromServer: (openRecord: { id: string; timeIn: Date } | null) => void;
  setStudentName: (name: string) => void;
  setDestination: (destination: string) => void;
}

export const useClockInStore = create<ClockInState>((set) => ({
  // Initial state
  student: {
    name: '',
    destination: 'TESDA Electronics Lab',
  },
  clockInTime: null,
  status: 'not-clocked-in',
  activeRecordId: null,

  // Actions
  setStudentName: (name) =>
    set((state) => ({ student: { ...state.student, name } })),

  setDestination: (destination) =>
    set((state) => ({ student: { ...state.student, destination } })),

  clockIn: (recordId) =>
    set({
      clockInTime: new Date(),
      status: 'clocked-in',
      activeRecordId: recordId ?? null,
    }),

  clockOut: () =>
    set({
      clockInTime: null,
      status: 'not-clocked-in',
      activeRecordId: null,
    }),

  /**
   * Reconciles the store with the database after a fetch.
   *
   * The visitor's check-in state used to live only in memory, so a refresh or a
   * direct visit to `/check-in` reported "not checked in" for someone who was
   * genuinely inside the building. That is not cosmetic: the scanner then read
   * them as not clocked in, so scanning the entrance code would have CLOCKED
   * THEM OUT mid-visit.
   */
  syncFromServer: (openRecord: { id: string; timeIn: Date } | null) =>
    set((state) => {
      // Already carrying the same record - a poll landing right after a local
      // clockIn would otherwise reset the time they were shown.
      if (openRecord && state.activeRecordId === openRecord.id) return state;

      return openRecord
        ? {
            status: 'clocked-in',
            activeRecordId: openRecord.id,
            clockInTime: openRecord.timeIn,
          }
        : { status: 'not-clocked-in', activeRecordId: null, clockInTime: null };
    }),
}));
