/**
 * Trainee-facing wording and rules.
 *
 * The product is designed around trainees, but the data model still separates
 * two ideas:
 *
 *   - `role` is the permission level (`admin` | `visitor`). Trainees never get
 *     a separate permission role; they are ordinary visitors.
 *   - `visitor_types.label` is the descriptive classification ("Trainee",
 *     "Trainer", "VIP", ...).
 *
 * These helpers keep trainee-specific copy and course rules in one place so the
 * register form, the entrance check and the admin filters cannot drift apart.
 */

/** Visitor types that are enrolled in a course. */
const COURSE_TYPES = ['trainee', 'trainer'] as const;

/** Normalises a lookup label for comparison. */
function normaliseLabel(label: string | null | undefined): string {
  return (label ?? '').trim().toLowerCase();
}

/** True when the label is exactly "Trainee" (case/space insensitive). */
export function isTraineeType(label: string | null | undefined): boolean {
  return normaliseLabel(label) === 'trainee';
}

/**
 * True when this visitor type takes a course.
 *
 * Trainers are included because they are attached to the course they teach;
 * everyone else (VIP, contractor, guest, ...) is not enrolled in one.
 */
export function requiresCourse(label: string | null | undefined): boolean {
  return (COURSE_TYPES as readonly string[]).includes(normaliseLabel(label));
}

/**
 * The short label shown to the person themselves.
 *
 * Unclassified accounts fall back to "Guest" rather than inventing a trainee
 * classification they do not have, or using the generic system word "visitor".
 * A real Trainee label is preserved exactly.
 */
export function personLabel(label: string | null | undefined): string {
  const trimmed = (label ?? '').trim();
  return trimmed || 'Guest';
}

export interface AttendanceGuidance {
  /** Short headline for the status card. */
  title: string;
  /** One plain-language sentence telling the person what to do next. */
  body: string;
}

/**
 * The next step shown on the trainee check-in screen.
 *
 * `checkedIn` is the attendance state, not room presence: someone can be
 * checked in and still in the lobby. `roomLabel` is only used when a room is
 * known, so the copy never claims a room that was not recorded.
 */
export function attendanceGuidance(params: {
  checkedIn: boolean;
  roomLabel?: string | null;
}): AttendanceGuidance {
  if (!params.checkedIn) {
    return {
      title: 'Ready when you are',
      body: 'Scan the entrance QR code to start your attendance for today.',
    };
  }

  if (params.roomLabel) {
    return {
      title: 'You are checked in',
      body: `You are recorded in ${params.roomLabel}. Scan another room door to move, or the entrance code to check out.`,
    };
  }

  return {
    title: 'You are checked in',
    body: 'Scan a room door code to record where you are, or the entrance code again to check out.',
  };
}
