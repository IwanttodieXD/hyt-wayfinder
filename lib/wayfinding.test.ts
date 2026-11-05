import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseQrValue,
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
    assert.deepEqual(parseQrValue('HYT-KIOSK-CHECKIN-STATION'), {
      kind: 'attendance',
    });
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
  test('resolves a canonical room door code to its room number', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
    });
  });

  test('accepts the hyphen separator as well as the colon', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01-ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
    });
  });

  test('is tolerant of punctuation inside the room token', () => {
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM 304'), {
      kind: 'room',
      roomNumber: 'Room 304',
    });
  });

  test('round-trips every registered room code', () => {
    const rooms = [
      ['ROOM-201', 'Room 201'],
      ['ROOM-202', 'Room 202'],
      ['ROOM-301', 'Room 301'],
      ['ROOM-304', 'Room 304'],
      ['ROOM-405', 'Room 405'],
      ['ROOFDECK', 'Roofdeck'],
    ];

    for (const [encoded, roomNumber] of rooms) {
      assert.deepEqual(
        parseQrValue(ROOM_PREFIX_FACTORY(encoded)),
        { kind: 'room', roomNumber },
        `failed for ${encoded}`
      );
    }
  });

  test('does not guess a room for an empty room code', () => {
    assert.equal(parseQrValue('HYT-ROOM-01:'), null);
  });

  test('resolves a room code that is in the DB but not in a hardcoded list', () => {
    // Rooms are managed via the admin room management UI and come from the
    // `rooms` table. The parser must still recognise a well-formed code so the
    // scanner can resolve it from the DB.
    assert.deepEqual(parseQrValue('HYT-ROOM-01:ROOM-405'), {
      kind: 'room',
      roomNumber: 'Room 405',
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
    });
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION-ROOM-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
    });
  });

  test('handles the legacy roofdeck code', () => {
    assert.deepEqual(parseQrValue('HYT-KIOSK-01-CHECKIN-STATION:ROOFDECK'), {
      kind: 'room',
      roomNumber: 'Roofdeck',
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
    assert.deepEqual(parseQrValue('hyt-kiosk-checkin-station'), {
      kind: 'attendance',
    });
  });

  test('accepts a lowercased room code', () => {
    assert.deepEqual(parseQrValue('hyt-room-01:room-304'), {
      kind: 'room',
      roomNumber: 'Room 304',
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
  test('every supported room code parses as a room', () => {
    const codes = [
      ROOM_PREFIX_FACTORY('ROOM-201'),
      ROOM_PREFIX_FACTORY('ROOM-304'),
      ROOM_PREFIX_FACTORY('ROOM-405'),
      ROOM_PREFIX_FACTORY('ROOFDECK'),
      'HYT-KIOSK-01-CHECKIN-STATION:ROOM-304',
    ];

    for (const code of codes) {
      const parsed = parseQrValue(code);
      assert.equal(parsed?.kind, 'room', `${code} parsed as ${parsed?.kind}`);
    }
  });
});

describe('ROOM_PREFIX_FACTORY', () => {
  test('builds door codes in the format the parser expects', () => {
    assert.equal(ROOM_PREFIX_FACTORY('ROOM-304'), 'HYT-ROOM-01:ROOM-304');
    assert.deepEqual(parseQrValue(ROOM_PREFIX_FACTORY('ROOM-304')), {
      kind: 'room',
      roomNumber: 'Room 304',
    });
  });
});
