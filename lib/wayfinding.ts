/**
 * Wayfinding route registry.
 *
 * There are two kinds of QR code in this system, and they are deliberately
 * different things:
 *
 * 1. ATTENDANCE - exactly one code, printed at the ground floor station.
 *    Scanning it is the only way to clock in or out. It carries no room, so
 *    which route to draw comes from the person's assigned destination instead.
 *
 * 2. ROOM PRESENCE - one code per room, posted on that room's door. Scanning
 *    one only records that the person is inside that room right now. It never
 *    touches attendance, so a visitor cannot clock themselves out by scanning
 *    the wrong poster.
 *
 * Attendance codes are `HYT-KIOSK-<station>` and room codes are
 * `HYT-ROOM-<room>:<ROOM_ID>`. The prefixes are what `parseQrValue` keys off,
 * so the two can never be mistaken for one another.
 */

export interface RouteWaypoint {
  position: [number, number, number];
  label: string;
  stage: number;
  cameraOffset: [number, number, number];
}

export interface DestinationRoute {
  id: string;
  label: string;
  building: string;
  room: string;
  /** Encoded into the printed room-presence QR code for this room. */
  qrValue: string;
  waypoints: RouteWaypoint[];
}

/** Prefix for the ground floor attendance code. */
const ATTENDANCE_PREFIX = 'HYT-KIOSK-';

/** Prefix for the per-room presence codes posted on room doors. */
const ROOM_PREFIX = 'HYT-ROOM-01-';

/**
 * The single ground floor attendance code. Scanning this is the only thing that
 * clocks someone in or out.
 */
export const ATTENDANCE_QR_VALUE = `${ATTENDANCE_PREFIX}CHECKIN-STATION`;

export const DESTINATION_ROUTES: DestinationRoute[] = [
  {
    id: 'electronics-lab',
    label: 'TESDA Electronics Lab',
    building: 'HYT-Business Center',
    room: 'Room 304',
    qrValue: `${ROOM_PREFIX}:ELECTRONICS-LAB`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [5, 0, 3], label: 'Hallway A', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [10, 0, 5], label: 'Elevator 3F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [10, 10, 5], label: '3rd Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [15, 10, 8], label: 'Corridor B', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [20, 10, 10], label: 'Room 304', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
  {
    id: 'training-hall',
    label: 'Training Hall',
    building: 'HYT-Business Center',
    room: 'Room 204',
    qrValue: `${ROOM_PREFIX}:TRAINING-HALL`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [-5, 0, 4], label: 'Hallway B', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [-9, 0, 6], label: 'Stairwell 2F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [-9, 5, 6], label: '2nd Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [-13, 5, 8], label: 'Corridor A', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [-17, 5, 10], label: 'Room 204', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
  {
    id: 'computer-lab',
    label: 'Computer Laboratory',
    building: 'HYT-Business Center',
    room: 'Room 303',
    qrValue: `${ROOM_PREFIX}:COMPUTER-LAB`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [5, 0, 3], label: 'Hallway A', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [9, 0, -2], label: 'Elevator 3F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [9, 10, -2], label: '3rd Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [14, 10, 1], label: 'Corridor C', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [18, 10, 3], label: 'Room 303', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    building: 'HYT-Business Center',
    room: 'Room 202',
    qrValue: `${ROOM_PREFIX}:LIBRARY`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [-5, 0, 4], label: 'Hallway B', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [-9, 0, 6], label: 'Stairwell 2F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [-9, 5, 6], label: '2nd Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [-4, 5, 10], label: 'Corridor D', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [1, 5, 12], label: 'Room 202', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
  {
    id: 'main-office',
    label: 'Main Office',
    building: 'HYT-Business Center',
    room: 'Room 401',
    qrValue: `${ROOM_PREFIX}:MAIN-OFFICE`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [5, 0, 3], label: 'Hallway A', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [11, 0, 7], label: 'Elevator 4F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [11, 15, 7], label: '4th Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [17, 15, 9], label: 'Corridor E', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [22, 15, 11], label: 'Room 401', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
  {
    id: 'conference-room-a',
    label: 'Conference Room A',
    building: 'HYT-Business Center',
    room: 'Room 402',
    qrValue: `${ROOM_PREFIX}:CONFERENCE-ROOM-A`,
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [5, 0, 3], label: 'Hallway A', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [11, 0, 7], label: 'Elevator 4F', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [11, 15, 7], label: '4th Floor Landing', stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [6, 15, 11], label: 'Corridor F', stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [0, 15, 13], label: 'Room 402', stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  },
];

export const DEFAULT_ROUTE_ID = DESTINATION_ROUTES[0].id;

export function getRoute(id: string | null | undefined): DestinationRoute {
  return DESTINATION_ROUTES.find((r) => r.id === id) ?? DESTINATION_ROUTES[0];
}

export function getRouteByRoom(room: string): DestinationRoute | undefined {
  return DESTINATION_ROUTES.find((r) => r.room === room);
}

/**
 * What a scanned QR code turned out to be.
 *
 * `attendance` is the ground floor code and the only thing that clocks someone
 * in or out. `room` is a door code and only records presence. `null` means the
 * code isn't one of ours.
 */
export type ParsedQr =
  | { kind: 'attendance' }
  | { kind: 'room'; routeId: string; room: string }
  | null;

/** Strips the punctuation so 'electronics-lab' matches 'ELECTRONICS-LAB'. */
function normalise(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Works out which of the two kinds of QR code was scanned.
 *
 * Returns null for anything unrecognised rather than guessing, because the
 * difference between the two is what decides whether attendance is touched.
 */
export function parseQrValue(value: string): ParsedQr {
  const trimmed = value.trim();

  if (trimmed.startsWith(ROOM_PREFIX)) {
    const id = trimmed.slice(ROOM_PREFIX.length + 1)?.trim();
    if (!id) return null;

    const match = DESTINATION_ROUTES.find((r) => normalise(r.id) === normalise(id));
    // An unknown room id is still a room code, but we can't say which room, so
    // treat it as unrecognised rather than guessing a destination.
    return match ? { kind: 'room', routeId: match.id, room: match.room } : null;
  }

  if (trimmed.startsWith(ATTENDANCE_PREFIX)) return { kind: 'attendance' };

  return null;
}

/**
 * The route to draw for someone who just clocked in.
 *
 * The ground floor code carries no room, so this resolves from the person's
 * assigned destination instead, falling back to the default route when they
 * have not been assigned one.
 */
export function routeIdForDestination(destination?: string | null): string {
  if (!destination) return DEFAULT_ROUTE_ID;
  const match = DESTINATION_ROUTES.find(
    (r) => normalise(r.label) === normalise(destination)
  );
  return match?.id ?? DEFAULT_ROUTE_ID;
}