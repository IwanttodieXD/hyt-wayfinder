import { create } from 'zustand';

export type ViewMode = 'mobile' | 'kiosk';
export type ClockInStatus = 'not-clocked-in' | 'clocked-in' | 'viewing-route';

interface StudentProfile {
  id: string;
  name: string;
  destination: string;
  building: string;
  room: string;
}

interface ClockInState {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Student data
  student: StudentProfile;
  clockInTime: Date | null;
  status: ClockInStatus;

  // Clock-in actions
  clockIn: () => void;
  clockOut: () => void;
  startRouteView: () => void;
  setStudentName: (name: string) => void;

  // Kiosk stats
  activeStudents: number;
  dailyVisits: number;

  // Route animation state
  isRouteAnimating: boolean;
  currentWaypoint: number;
  setRouteAnimating: (animating: boolean) => void;
  setCurrentWaypoint: (waypoint: number) => void;
  resetRoute: () => void;
}

export const useClockInStore = create<ClockInState>((set) => ({
  // Initial state
  viewMode: 'mobile',
  student: {
    id: '',
    name: '',
    destination: 'TESDA Electronics Lab',
    building: 'Building B',
    room: 'Room 304',
  },
  clockInTime: null,
  status: 'not-clocked-in',
  activeStudents: 47,
  dailyVisits: 203,
  isRouteAnimating: false,
  currentWaypoint: 0,

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  setStudentName: (name) =>
    set((state) => ({ student: { ...state.student, name } })),

  clockIn: () =>
    set((state) => ({
      clockInTime: new Date(),
      status: 'clocked-in',
      activeStudents: state.activeStudents + 1,
      dailyVisits: state.dailyVisits + 1,
    })),

  clockOut: () =>
    set((state) => ({
      clockInTime: null,
      status: 'not-clocked-in',
      isRouteAnimating: false,
      currentWaypoint: 0,
      activeStudents: Math.max(0, state.activeStudents - 1),
    })),

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
