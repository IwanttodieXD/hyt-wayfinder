/**
 * QR code parsing.
 *
 * There are two kinds of QR code in this system, and they are deliberately
 * different things:
 *
 * 1. ATTENDANCE - exactly one code, printed at the ground floor station.
 *    Scanning it is the only way to clock in or out. It carries no room, so
 *    the assigned room comes from the person's destination instead.
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

/**
 * Matches the room prefix followed by either a colon or a hyphen.
 *
 * Case-insensitive: a QR retyped by hand, or re-encoded by a different tool,
 * may not preserve case, and rejecting it as "not an HYT QR code" would be a
 * pointless failure.
 */
const ROOM_PREFIX_RE = /^HYT-ROOM-01[:-]/i;

/**
 * The LEGACY room code format: `HYT-KIOSK-01-CHECKIN-STATION:ROOM-304`.
 *
 * Room codes used to be minted under the attendance prefix, with the room number
 * after it. Posters in that format are still on doors, and the value begins
 * `HYT-KIOSK-`, so a parser that only checked the prefix read a room poster as
 * ATTENDANCE - silently toggling the visitor's check-in/check-out instead of
 * recording the room.
 *
 * The suffix (`ROOM-304`, `ROOFDECK`) is what makes it unambiguously a room, so
 * it is captured and resolved to that room here, BEFORE the attendance branch.
 * A bare `HYT-KIOSK-CHECKIN-STATION` has no room suffix and does NOT match,
 * which is what keeps ordinary check-in/check-out working.
 */
const LEGACY_ROOM_CODE_RE = /^HYT-KIOSK-.*[:-](ROOM|ROOFDECK)[- ]?([0-9]+)?/i;

/**
 * Builds the door code for a room number, e.g. `ROOM-304` ->
 * `HYT-ROOM-01:ROOM-304`. Shared with the admin rooms page so a room created
 * there gets exactly the code the scanner will recognise.
 */
export const ROOM_PREFIX_FACTORY = (encodedRoomNumber: string): string =>
  `${ROOM_PREFIX}:${encodedRoomNumber}`;

/**
 * The single ground floor attendance code. Scanning this is the only thing that
 * clocks someone in or out.
 */
export const ATTENDANCE_QR_VALUE = `${ATTENDANCE_PREFIX}CHECKIN-STATION`;

/**
 * What a scanned QR code turned out to be.
 *
 * `attendance` is the ground floor code and the only thing that clocks someone
 * in or out. `room` is a door code and only records presence. `null` means the
 * code isn't one of ours.
 */
export type ParsedQr =
  | { kind: 'attendance' }
  | { kind: 'room'; roomNumber: string }
  | null;

/**
 * Turns the encoded part of a room code into a display room number.
 *
 * `ROOM-405` -> `Room 405`, `ROOFDECK` -> `Roofdeck`. Returns null for
 * something that doesn't look like a room identifier, so the parser can
 * reject it rather than guessing.
 */
function encodedToRoomNumber(encoded: string): string | null {
  const upper = encoded.toUpperCase();
  if (upper === 'ROOFDECK') return 'Roofdeck';
  const digits = upper.match(/(\d+)/);
  return digits ? `Room ${digits[1]}` : null;
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

  // Checked BEFORE the attendance branch. These values start with the attendance
  // prefix, so without this they would toggle check-in/out instead of recording
  // the room. The room suffix is what makes them unambiguously room posters.
  const legacy = trimmed.match(LEGACY_ROOM_CODE_RE);
  if (legacy) {
    const [, suffix, digits] = legacy;
    const roomNumber =
      suffix.toUpperCase() === 'ROOFDECK'
        ? 'Roofdeck'
        : digits
          ? `Room ${digits}`
          : null;
    // A room suffix we cannot turn into a room number is not ours to guess.
    if (!roomNumber) return null;

    return { kind: 'room', roomNumber };
  }

  if (ROOM_PREFIX_RE.test(trimmed)) {
    const encoded = trimmed
      .slice(ROOM_PREFIX.length)
      .replace(/^[:\-]/, '')
      .trim();
    if (!encoded) return null;

    // The rooms table is the source of truth for which rooms exist, so any
    // well-formed room code is valid here; the scanner resolves the room number
    // against that table.
    const roomNumber = encodedToRoomNumber(encoded);
    return roomNumber ? { kind: 'room', roomNumber } : null;
  }

  // Case-insensitive, matching ROOM_PREFIX_RE. A lowercased kiosk code would
  // otherwise fall through to "not an HYT QR code" and confuse someone who had
  // done nothing wrong.
  if (trimmed.toUpperCase().startsWith(ATTENDANCE_PREFIX)) {
    return { kind: 'attendance' };
  }

  return null;
}
