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

/**
 * Prefix for the per-room presence codes posted on room doors.
 *
 * The seeded `rooms.qr_value` values are authoritative, because that is what
 * actually gets printed on the doors: `HYT-ROOM-01:ROOM-304` - colon, not hyphen.
 * The trailing separator is therefore matched loosely (see `ROOM_PREFIX_RE`) so
 * codes printed under either convention still resolve.
 */
const ROOM_PREFIX = 'HYT-ROOM-01';

/** Matches the room prefix followed by either a colon or a hyphen. */
const ROOM_PREFIX_RE = /^HYT-ROOM-01[:-]/;

/** Single building. Kept as a constant so routes and the DB default agree. */
const BUILDING = 'HYT-Business Center';

/**
 * Builds the door code for a room number, e.g. `ROOM-304` ->
 * `HYT-ROOM-01:ROOM-304`. Shared with the admin rooms page so a room created
 * there gets exactly the code the scanner will recognise.
 *
 * Declared before DESTINATION_ROUTES, which uses it while building the registry.
 */
export const ROOM_PREFIX_FACTORY = (encodedRoomNumber: string): string =>
  `${ROOM_PREFIX}:${encodedRoomNumber}`;

/**
 * The single ground floor attendance code. Scanning this is the only thing that
 * clocks someone in or out.
 */
export const ATTENDANCE_QR_VALUE = `${ATTENDANCE_PREFIX}CHECKIN-STATION`;

/**
 * Floor layout used to generate waypoints.
 *
 * Floor height is 5 units per storey, matching the existing hand-authored
 * routes. The roof sits one storey above the 4th.
 */
const FLOOR_HEIGHT = 5;

/**
 * Every room in the building, in building order.
 *
 * This mirrors `supabase/seed.sql`: room numbers and floors are authoritative,
 * display names are placeholders until the institute confirms them. The list is
 * duplicated here rather than read from the database because the 3D route scene
 * needs waypoints synchronously at module scope - it cannot await a fetch before
 * deciding what geometry to draw. Room *identity* still comes from the `rooms`
 * table at runtime (see `roomsStore`); this is only the geometry plus the
 * room_number each code encodes.
 */
export const DESTINATION_ROUTES: DestinationRoute[] = [
  { room: 'Room 201', label: 'Tech Room 201', floor: 2, index: 0 },
  { room: 'Room 202', label: 'Tech Room 202', floor: 2, index: 1 },

  { room: 'Room 301', label: 'Room 301', floor: 3, index: 0 },
  { room: 'Room 302', label: 'Room 302', floor: 3, index: 1 },
  { room: 'Room 303', label: 'Room 303', floor: 3, index: 2 },
  { room: 'Room 304', label: 'Room 304', floor: 3, index: 3 },

  { room: 'Room 401', label: 'Room 401', floor: 4, index: 0 },
  { room: 'Room 402', label: 'Room 402', floor: 4, index: 1 },
  { room: 'Room 403', label: 'Room 403', floor: 4, index: 2 },
  { room: 'Room 404', label: 'Room 404', floor: 4, index: 3 },

  { room: 'Roofdeck', label: 'Roofdeck', floor: 5, index: 0 },
].map(({ room, label, floor, index }) => {
  // Rooms on the same floor fan out along X so their corridors don't overlap on
  // screen; the roof deck sits alone above the 4th floor.
  const y = (floor - 1) * FLOOR_HEIGHT;
  const x = 10 + index * 4;
  const z = 5 + (index % 2) * 3;

  return {
    id: room.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label,
    building: BUILDING,
    room,
    // Encodes the room number, so a printed code stays valid even if the
    // display name is later changed.
    qrValue: ROOM_PREFIX_FACTORY(
      room.toUpperCase().replace(/[^A-Z0-9]+/g, '-')
    ),
    waypoints: [
      { position: [0, 0, 0], label: 'Main Lobby', stage: 1, cameraOffset: [-3, 3, -3] },
      { position: [5, 0, 3], label: 'Hallway A', stage: 1, cameraOffset: [-2, 2, -2] },
      { position: [8, 0, 4], label: floor <= 2 ? 'Stairwell 2F' : `Elevator ${floor}F`, stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [8, y, 4], label: `${floor === 5 ? 'Roof' : floor + 'th'} Floor Landing`, stage: 2, cameraOffset: [-1, 2, -2] },
      { position: [x, y, z], label: `Corridor ${String.fromCharCode(65 + index)}`, stage: 3, cameraOffset: [-2, 2, -1] },
      { position: [x + 2, y, z + 2], label: room, stage: 3, cameraOffset: [-3, 3, -2] },
    ],
  } satisfies DestinationRoute;
});

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
  | { kind: 'room'; roomNumber: string; routeId: string }
  | null;

/** Strips the punctuation so 'room 304' matches 'ROOM-304'. */
function normalise(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** The part of a room code after the prefix, e.g. `ROOM-304`. */
function roomCodeValue(qrValue: string): string {
  return qrValue.slice(ROOM_PREFIX.length).replace(/^[:\-]/, '');
}

/**
 * Works out which of the two kinds of QR code was scanned.
 *
 * Room codes encode the room number (`HYT-ROOM-01:ROOM-304`), which is the
 * authoritative identifier - the display name is a placeholder that may change.
 *
 * Returns null for anything unrecognised rather than guessing, because the
 * difference between the two is what decides whether attendance is touched.
 */
export function parseQrValue(value: string): ParsedQr {
  const trimmed = value.trim();

  if (ROOM_PREFIX_RE.test(trimmed)) {
    const encoded = trimmed.slice(ROOM_PREFIX.length).replace(/^[:\-]/, '').trim();
    if (!encoded) return null;

    // Match on the encoded room number, so a code survives a display-name change.
    const match = DESTINATION_ROUTES.find(
      (r) => normalise(roomCodeValue(r.qrValue)) === normalise(encoded)
    );
    // An unknown room code is still a room code, but we can't say which room, so
    // treat it as unrecognised rather than guessing a destination.
    return match
      ? { kind: 'room', roomNumber: match.room, routeId: match.id }
      : null;
  }

  if (trimmed.startsWith(ATTENDANCE_PREFIX)) return { kind: 'attendance' };

  return null;
}

/**
 * The route to draw for someone who just clocked in.
 *
 * The ground floor code carries no room, so this resolves from the person's
 * assigned room instead, falling back to the default route when they have not
 * been assigned one. Matches on the room number first, then the display label,
 * so an admin who stored either form resolves correctly.
 */
export function routeIdForDestination(destination?: string | null): string {
  if (!destination) return DEFAULT_ROUTE_ID;
  const key = normalise(destination);
  const match =
    DESTINATION_ROUTES.find((r) => normalise(r.room) === key) ??
    DESTINATION_ROUTES.find((r) => normalise(r.label) === key) ??
    DESTINATION_ROUTES.find((r) => normalise(r.id) === key);
  return match?.id ?? DEFAULT_ROUTE_ID;
}