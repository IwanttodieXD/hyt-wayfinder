/**
 * Wayfinding route registry.
 *
 * Each destination has its own check-in QR code and its own set of 3D
 * waypoints, so the station can print one QR per room and the phone can draw
 * the matching route after scanning it.
 *
 * A QR value is always `HYT-KIOSK-<station>:ROUTE_ID`. The station id is the
 * physical terminal; the route id selects which route to draw. Both the kiosk
 * and the phone scanner derive everything from this list, so adding a room is a
 * matter of adding one entry here.
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
  /** Encoded into the printed QR code. */
  qrValue: string;
  waypoints: RouteWaypoint[];
}

const QR_PREFIX = 'HYT-KIOSK-01-CHECKIN-STATION';

export const DESTINATION_ROUTES: DestinationRoute[] = [
  {
    id: 'electronics-lab',
    label: 'TESDA Electronics Lab',
    building: 'HYT-Business Center',
    room: 'Room 304',
    qrValue: `${QR_PREFIX}:ELECTRONICS-LAB`,
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
    qrValue: `${QR_PREFIX}:TRAINING-HALL`,
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
    qrValue: `${QR_PREFIX}:COMPUTER-LAB`,
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
    qrValue: `${QR_PREFIX}:LIBRARY`,
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
    qrValue: `${QR_PREFIX}:MAIN-OFFICE`,
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
    qrValue: `${QR_PREFIX}:CONFERENCE-ROOM-A`,
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

/** Reads the route id back out of a scanned QR value. */
export function routeIdFromQr(value: string): string | null {
  if (!value.startsWith('HYT-KIOSK-')) return null;

  const id = value.split(':')[1]?.trim().toUpperCase();
  if (!id) return DEFAULT_ROUTE_ID;

  const match = DESTINATION_ROUTES.find(
    (r) => r.id.toUpperCase().replace(/-/g, '') === id.replace(/-/g, '')
  );

  return match?.id ?? DEFAULT_ROUTE_ID;
}