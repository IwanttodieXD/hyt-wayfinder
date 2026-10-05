import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseQrValue,
  routeIdForDestination,
  getRouteByRoom,
  getRoute,
  DESTINATION_ROUTES,
  DEFAULT_ROUTE_ID,
  ATTENDANCE_QR_VALUE,
  ROOM_PREFIX_FACTORY,
} from './wayfinding.ts';

/**
 * The QR parser decides whether a scan touches attendance or only records
 * presence. Getting it wrong is not cosmetic: a room poster misread as
 * attendance silently checks someone into the building. These tests pin the
 * contract so a future edit to the prefixes cannot quietly change it.
 *
 * Run with `npm test` (Node's built-in runner + native TypeScript support).
 */

describe('parseQrValue - attendance', () => {
  test('recognises the ground floor check-in code', () => {
    assert.deepEqual(parseQrValue(ATTENDANCE_QR_VALUE), { kind: 'attendance' });
    assert.deepEqual(parseQrValue('HYT-KIOSK-CHECKIN-STATION'), { kind: 'attendance' });
  });

  test('accepts a padded code', () => {
    assert.deepEqual(parseQrValue('  HYT-KIOSK-CHECKIN-STATION  '), {
      kind: 'attendance',
    });
  });

  test('treats an old station-numbered attendance code as attendance, not a room', () => {
    // No ROOM suffix, so this is still plain check-in.
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION'), {
      kind: 'attendance',
    });
  });
});

describe('parseQrValue - room presence', () => {
  test('resolves a canonical room door code to its room number and route id', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });

  test('accepts the hyphen separator as well as the colon', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01-ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });

  test('is tolerant of punctuation inside the room token', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM 304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });

  test('round-trips every registered room code', () => {
    for (const route of DESTINATION_ROUTES) {
      assert.deepEqual(
        parseQrValue(route.qrValue),
        { kind: 'room', roomNumber: route.room, routeId: route.id },
        `failed for ${route.qrValue}`
      );
    }
  });

  test('does not guess a room for an empty room code', () => {
    assert.equal(parseQrValue('HYT-ROOM-01:'), null);
  });

  test('resolves a room code that is in the DB but not in DESTINATION_ROUTES', () => {
    // Room 405 is managed via the admin room management UI and exists in the
    // `rooms` table, but has no entry in the geometry registry. The parser
    // must still recognise it as a room so the scanner can resolve it from
    // the DB; the 3D route falls back to the default.
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM-405'), {
      kind: 'room',
      roomNumber: 'Room 405',
      routeId: DEFAULT_ROUTE_ID,
    });
  });
});

describe('parseQrValue - legacy room codes', () => {
  test('reads an old-format room poster as its room, not as attendance', () => {
    // These start with the attendance prefix, so they must resolve to a room
    // BEFORE the attendance branch or a door scan would toggle check-in/out.
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION:ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION-ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });

  test('handles the legacy roofdeck code', () => {
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION:ROOFDECK'), {
      kind: 'room',
      roomNumber: 'Roofdeck',
      routeId: 'roofdeck',
    });
  });

  test('a legacy room code is never attendance', () => {
    // The value starts with HYT-KIOSK-, so without the room resolution a door
    // scan would check the person out of the building.
    const parsed = parseQrValue('HYT-KIOSK-01-CHECKIN-STATION:ROOM-304');
    assert.notEqual(parsed?.kind, 'attendance');
  });
});

describe('parseQrValue - case-insensitive codes', () => {
  test('accepts a lowercased attendance code', () => {
    assert.deepEqual(parseQrValue('hyt-kiosk-checkin-station'), { kind: 'attendance' });
  });

  test('accepts a lowercased room code', () => {
    assert.deepEqual(parseQrValue('hyt-room-01:room-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });
});

describe('parseQrValue - not ours', () => {
  test('returns null for unrecognised input rather than guessing', () => {
    assert.equal(parseQrValue(''), null);
    assert.equal(parseQrValue('   '), null);
    assert.equal(parseQrValue('https://example.com'), null);
    assert.equal(parseQrValue('ROOM-304'), null);
    assert.equal(parseQrValue('HYT-USER:abc'), null);
  });
});

/**
 * The load-bearing invariant: a door code is never read as attendance. If this
 * ever fails, a visitor scanning a room poster gets clocked into the building.
 */
describe('invariant: room codes never parse as attendance', () => {
  test('every registered room code parses as a room', () => {
    for (const route of DESTINATION_ROUTES) {
      const parsed = parseQrValue(route.qrValue);
      assert.equal(parsed?.kind, 'room', `${route.qrValue} parsed as ${parsed?.kind}`);
    }
  });
});

describe('routeIdForDestination', () => {
  test('falls back to the default route when nothing is assigned', () => {
    assert.equal(routeIdForDestination(null), DEFAULT_ROUTE_ID);
    assert.equal(routeIdForDestination(undefined), DEFAULT_ROUTE_ID);
    assert.equal(routeIdForDestination(''), DEFAULT_ROUTE_ID);
  });

  test('resolves a room number, a display label, or an id to the same route', () => {
    assert.equal(routeIdForDestination('Room 304'), 'room-304');
    assert.equal(routeIdForDestination('room-304'), 'room-304');
    assert.equal(routeIdForDestination('Tech Room 201'), 'room-201');
  });

  test('falls back to the default for an unknown destination', () => {
    assert.equal(routeIdForDestination('Narnia'), DEFAULT_ROUTE_ID);
  });
});

describe('registry lookups', () => {
  test('finds a route by its room number', () => {
    assert.equal(getRouteByRoom('Room 304')?.id, 'room-304');
  });

  test('returns undefined for a room that is not registered', () => {
    assert.equal(getRouteByRoom('Room 999'), undefined);
  });

  test('falls back to the first route for an unknown id', () => {
    assert.equal(getRoute('does-not-exist'), DESTINATION_ROUTES[0]);
    assert.equal(getRoute(null), DESTINATION_ROUTES[0]);
  });

  test('builds door codes in the format the parser expects', () => {
    assert.equal(ROOM_PREFIX_FACTORY('ROOM-304'), 'HYT-ROOM-01:ROOM-304');
    assert.deepEqual(parseQrValue(ROOM_PREFIX_FACTORY('ROOM-304')), {
      kind: 'room',
      roomNumber: 'Room 304',
      routeId: 'room-304',
    });
  });
});
