/**
 * Public-facing URLs, for QR codes that get printed and scanned by a phone.
 *
 * Built from the browser's own origin at runtime rather than hardcoded. A QR
 * printed on a poster is physical: re-printing it to change a hostname is a
 * trip to the printer, and a stale hardcoded domain is worse than no QR at all
 * because it looks correct. Deriving it means the code is right on localhost,
 * on a preview deploy, and on production without anyone editing a constant.
 */

/**
 * Fallback when there is no browser (SSR) and no configured origin.
 *
 * Matches the value already documented in `.env.example`, so this file needs no
 * new environment variable to work.
 */
export const DEFAULT_SITE_ORIGIN = 'http://localhost:3000';

/**
 * The origin to build absolute URLs from.
 *
 * `NEXT_PUBLIC_APP_URL` WINS when set, which is the opposite of the usual
 * "prefer the live origin" instinct and deliberate here.
 *
 * The output of this function goes into a QR code that gets printed on a poster
 * and stuck to a wall. That artefact outlives the browser tab that created it,
 * and often outlives the deployment too. If the live origin won, an admin who
 * opened /station on a Vercel *preview* build would print a poster encoding
 * something like hyt-wayfinder-git-fix-qr.vercel.app - a URL that stops
 * resolving the moment the preview is replaced. The configured value is the one
 * guaranteed to point at the deployment you intend to keep.
 *
 * When it is unset - local dev, or a deployment that forgot to set it - the live
 * origin is used, which is correct for that environment even if not durable.
 */
export function siteOrigin(): string {
  const configured =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL
      : undefined;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_SITE_ORIGIN;
}

/**
 * Absolute URL of the self-registration page.
 *
 * `/register` and not `/station`: the station is admin-only and bounces
 * non-admins to /admin, so a poster pointing there would dead-end a walk-in
 * with a redirect they cannot follow.
 */
export function registrationUrl(): string {
  return `${siteOrigin()}/register`;
}

// ---------------------------------------------------------------------------
// Orientation verdict lookup
// ---------------------------------------------------------------------------

/** The three states from migration 20260101000012. */
export type OrientationStatus = 'approved' | 'declined' | 'pending';

export interface OrientationRecord {
  orientation_status: OrientationStatus;
  full_name: string;
  programme: string | null;
}

/**
 * Looks up an orientation verdict by email.
 *
 * Returns null when the address is not in the cohort - which is the normal case
 * for a genuine walk-in and is NOT an error. Callers must not treat null as
 * "declined": a stranger registering for the first time is neither approved nor
 * declined, and the UI should say so rather than guess.
 *
 * Also returns null on any failure. This runs against an RLS-protected table via
 * a SECURITY DEFINER function (migration 20260101000013); if that migration has
 * not been applied yet the call rejects, and the registration form must still
 * work. A failed lookup degrades to "no verdict", never to a blocked sign-up.
 */
export async function fetchOrientationStatus(
  email: string,
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }
): Promise<OrientationRecord | null> {
  const trimmed = email.trim();
  // Cheap client-side guard. An address with no '@' is a typo, and calling the
  // function for it is a wasted round trip on every keystroke.
  if (!trimmed || !trimmed.includes('@')) return null;

  try {
    const { data, error } = await supabase.rpc('orientation_status_for', {
      p_email: trimmed,
    });
    if (error) return null;
    // PostgREST returns [] for a function matching no rows.
    const rows = Array.isArray(data) ? data : [];
    const row = rows[0] as OrientationRecord | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}