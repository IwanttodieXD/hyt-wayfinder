/**
 * Phone formatting.
 *
 * Deliberately locale-agnostic. HYT is in the Philippines, but the people at the
 * front desk are not the only ones typing here: an international visitor, or a
 * landline with an extension, must survive being typed without being rewritten
 * into a local format it does not match. So this does NOT assume a country code,
 * does not add or remove a `+63`, and does not regroup digits into a shape the
 * user did not choose.
 *
 * What it does is tidy: collapse ragged whitespace, stop a space drifting away
 * from a dash, and keep a `+` or `(` tight against what follows it. `0917-123-4567`
 * and `(02) 8123 4567` both come back exactly as typed; `+63  917 -  123-4567`
 * comes back as `+63 917 - 123-4567`.
 *
 * Safe to run on every keystroke: it never reorders or drops characters, so the
 * caret cannot jump and a half-typed number is never mangled.
 */

/**
 * Long enough for the longest sensible entry: a country code, an extension, and
 * punctuation. Beyond this the value is a paste accident rather than a number.
 */
const MAX_LENGTH = 30;

/**
 * The characters a phone field accepts.
 *
 * Digits, plus the punctuation that carries meaning: `+` for a country code, and
 * `-` / `(` / `)` / `.` / `/` / spaces because `formatPhone` deliberately respects a
 * grouping the user chose rather than overriding it. Letters and every other symbol
 * are rejected.
 *
 * The set is deliberately the same one `formatPhone` treats as "the user chose this
 * layout". If a character were accepted here but treated as formatting there - or
 * vice versa - the field would silently discard something it had just permitted.
 *
 * Note this is NOT "digits only" despite the field being a phone number: blocking
 * `+` would make `+63 917 123 4567` untypeable, which is the common way someone
 * abroad writes their own number. Everything else is closed off.
 */
const DISALLOWED = /[^\d+\-()./\s]/g;

// Separate non-global copy for `.test()`. A global regex carries `lastIndex`
// between calls, so using the same object for test() would alternate true/false
// on successive keystrokes and let letters through every other keypress.
const DISALLOWED_SINGLE = /[^\d+\-()./\s]/;

/**
 * Strips anything that is not a valid phone character, then tidies.
 *
 * Used as the onChange filter so a paste or a stray keystroke cannot introduce a
 * letter. Pairs with `isAllowedPhoneKey`, which blocks the keystroke before it is
 * ever rendered - filtering alone makes characters blink out after appearing,
 * which reads as a broken field.
 *
 * `tidyPhone` already caps at MAX_LENGTH, but it runs before this one removed
 * anything, so the cap is applied again here.
 */
export function sanitisePhone(raw: string | null | undefined): string {
  return tidyPhone((raw ?? '').replace(DISALLOWED, '')).slice(0, MAX_LENGTH);
}

/**
 * True when the key that produced this event may be typed into a phone field.
 *
 * Callers should `preventDefault()` when this is false. Editing keys, navigation,
 * and any Ctrl/Cmd combination are always allowed: Cmd+A to select-all and
 * Cmd+V to paste must keep working, and a paste that carried letters is already
 * cleaned by `sanitisePhone`.
 */
export function isAllowedPhoneKey(key: string, ctrlOrMeta: boolean): boolean {
  if (ctrlOrMeta) return true;
  if (key.length !== 1) return true; // Backspace, Tab, arrows, Enter...
  return !DISALLOWED_SINGLE.test(key);
}

/**
 * Normalises whitespace and punctuation spacing in a phone number.
 *
 * Returns `''` for nullish input so callers can pass form state straight through.
 */
export function tidyPhone(raw: string | null | undefined): string {
  if (!raw) return '';

  let out = raw
    // Whitespace runs (including tabs and non-breaking spaces people paste in)
    // collapse to a single space.
    .replace(/\s+/g, ' ')
    // Repeated dashes collapse to one, so holding the key doesn't produce ----.
    .replace(/-{2,}/g, '-')
    // A `+` or `(` binds to what follows it: "+63" not "+ 63", "(02)" not "( 02".
    .replace(/\+\s+/g, '+')
    .replace(/\(\s+/g, '(')
    // Dashes: the result is made symmetric. A dash with a space on BOTH sides is a
    // deliberate grouping ("0917 - 1234") and is preserved; a space on only one
    // side is almost always a slip and is removed ("0917- 1234" and "0917 -1234"
    // both become "0917-1234"). Matching both sides in one pass is what makes
    // this decidable - collapsing the spaces first would destroy the very
    // evidence needed to tell a deliberate group from a mistyped one.
    .replace(/(\S)( ?)-( ?)(\S)/g, (_m, before, spaceBefore, spaceAfter, after) =>
      spaceBefore && spaceAfter ? `${before} - ${after}` : `${before}-${after}`
    )
    .trim();

  // Trim again: collapsing whitespace can leave a leading or trailing space.
  out = out.trim();

  // Hard stop rather than silent truncation: a pasted paragraph should look
  // wrong in the box so it gets noticed, not appear to be a valid number.
  if (out.length > MAX_LENGTH) return out.slice(0, MAX_LENGTH);

  return out;
}

/**
 * True when the value is worth storing.
 *
 * Only rules out the obviously-not-a-number cases. Requiring a digit count would
 * reject legitimate short or extension-bearing numbers, and this field is
 * descriptive - nothing sends an SMS or dials it.
 */
export function isReasonablePhone(raw: string | null | undefined): boolean {
  const value = tidyPhone(raw);

  // Empty is fine: the column is optional everywhere it appears.
  if (!value) return true;

  // Any digit at all. Letters and stray symbols are a paste accident, not a
  // number, and would only ever confuse a front desk member reading the row.
  return /\d/.test(value) && !/[^\d+\-()\s./]/.test(value);
}

/**
 * Adds readable grouping to a bare run of digits.
 *
 * `tidyPhone` deliberately never regroups - it only tidies spacing - because it
 * runs on every keystroke and reordering characters mid-type moves the caret.
 * That left a bare `09171234567` sitting there unformatted, which reads as broken
 * rather than as "leave it alone".
 *
 * This is the counterpart, and is only safe to call on BLUR, when no caret
 * position matters:
 *
 * - If the number already carries punctuation the user chose (`-`, `(`, `)`,
 *   `+`, `.`, `/`), it is left exactly as typed. Someone entering
 *   `+63 (02) 8123-4567` has already told us the grouping they want, and
 *   second-guessing it is the thing this whole file exists to avoid.
 * - Otherwise the bare digits are grouped 3-3-4, which is how a Philippine
 *   mobile number reads (`0917 123 4567`) and stays legible for an 11-digit
 *   international number too.
 *
 * Idempotent: formatting an already-formatted bare value is a no-op, so this is
 * safe to call repeatedly.
 */
export function formatPhone(raw: string | null | undefined): string {
  const value = tidyPhone(raw);
  if (!value) return '';

  // Respect any punctuation the user typed. A bare `+` is not a deliberate
  // grouping - "+63 9171234567" should still get spaced - but a dash, bracket or
  // dot is the user telling us how they want it read.
  if (/[-()./]/.test(value)) return value;

  // `+` is meaningful and must survive. Working from `digits` alone would drop it
  // and silently turn an international number into something unrecognisable.
  const plus = value.startsWith('+') ? '+' : '';
  let digits = value.replace(/\D/g, '');

  // Too short to group meaningfully.
  if (digits.length < 7) return value;

  // A country code of 63 followed by a Philippine mobile number is the common
  // international form (+63 917 123 4567): 2 + 10 = 12 digits. Peel the 63 off so
  // the national number is grouped on its own terms - without this the leading
  // `63` gets swallowed into the first group and reads as "+6391 7123 4567".
  if (digits.startsWith('63') && digits.length === 12) {
    digits = digits.slice(2);
    return `${plus}63 ${formatPhone(digits)}`.trim();
  }

  const grouped =
    digits.length === 11
      ? // 0917 123 4567 - how a Philippine mobile number reads.
        [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].join(' ')
      : digits.length === 10
        ? // Landline without an area-code bracket: 917 123 4567.
          [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].join(' ')
        : // Longer international number: 4s from the left so it stays readable
          // rather than arriving as one unbroken wall.
          digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

  return `${plus}${grouped}`.trim();
}