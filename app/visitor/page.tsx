import { redirect } from 'next/navigation';

/**
 * The trainee overview has been retired.
 *
 * The scanner is the only trainee landing page now: it already shows the
 * person, their assigned room, their attendance state and the next action.
 * Keeping a second dashboard meant two places to explain the same visit, so a
 * bookmarked /visitor URL simply forwards to it. `/check-in` still applies the
 * role guard, so an admin landing here is sent on to the admin dashboard.
 */
export default function VisitorPortal() {
  redirect('/check-in');
}
