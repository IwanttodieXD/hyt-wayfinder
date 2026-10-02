import { create } from 'zustand';
import { DEFAULT_ROUTE_ID } from '@/lib/wayfinding';

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
  /** Which destination route to draw in 3D, set from the scanned QR code. */
  activeRouteId: string;

  // Clock-in actions
  clockIn: (recordId?: string) => void;
  clockOut: () => void;
  startRouteView: () => void;
  setStudentName: (name: string) => void;
  setDestination: (destination: string) => void;

  // Route animation state
  isRouteAnimating: boolean;
  currentWaypoint: number;
  setRouteAnimating: (animating: boolean) => void;
  setCurrentWaypoint: (waypoint: number) => void;
  setActiveRoute: (routeId: string) => void;
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
  activeRouteId: DEFAULT_ROUTE_ID,
  isRouteAnimating: false,
  currentWaypoint: 0,

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
      isRouteAnimating: false,
      currentWaypoint: 0,
    }),

  startRouteView: () =>
    set({
      status: 'viewing-route',
    }),

  setRouteAnimating: (animating) => set({ isRouteAnimating: animating }),

  setCurrentWaypoint: (waypoint) => set({ currentWaypoint: waypoint }),

  // Switching destination also rewinds the animation, otherwise the waypoint
  // index would point into a different route's array.
  setActiveRoute: (routeId) =>
    set({ activeRouteId: routeId, currentWaypoint: 0, isRouteAnimating: false }),

  // Return: stops the animation, rewinds to the first waypoint, and drops back
  // out of the 3D view to the scanner. Setting `status` to 'clocked-in' is what
  // makes StudentMobileView render the QRScanner again instead of the route.
  resetRoute: () =>
    set({
      isRouteAnimating: false,
      currentWaypoint: 0,
      status: 'clocked-in',
    }),
}));
