import { create } from 'zustand';

export type ClockInStatus = 'not-clocked-in' | 'clocked-in' | 'viewing-route';

interface StudentProfile {
  id: string;
  name: string;
  destination: string;
  building: string;
  room: string;
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
  startRouteView: () => void;
  setStudentName: (name: string) => void;

  // Route animation state
  isRouteAnimating: boolean;
  currentWaypoint: number;
  setRouteAnimating: (animating: boolean) => void;
  setCurrentWaypoint: (waypoint: number) => void;
  resetRoute: () => void;
}

export const useClockInStore = create<ClockInState>((set) => ({
  // Initial state
  student: {
    id: '',
    name: '',
    destination: 'TESDA Electronics Lab',
    building: 'Building B',
    room: 'Room 304',
  },
  clockInTime: null,
  status: 'not-clocked-in',
  activeRecordId: null,
  isRouteAnimating: false,
  currentWaypoint: 0,

  // Actions
  setStudentName: (name) =>
    set((state) => ({ student: { ...state.student, name } })),

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
      isRouteAnimating: false,
      currentWaypoint: 0,
    }),

  startRouteView: () =>
    set({
      status: 'viewing-route',
    }),

  setRouteAnimating: (animating) => set({ isRouteAnimating: animating }),

  setCurrentWaypoint: (waypoint) => set({ currentWaypoint: waypoint }),

  resetRoute: () =>
    set({
      isRouteAnimating: false,
      currentWaypoint: 0,
      status: 'clocked-in',
    }),
}));
