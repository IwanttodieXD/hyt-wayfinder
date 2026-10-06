-- ============================================================================
-- HYT Wayfinder - verify_visitor learns who is already a recognized account
--
-- WHY
-- ---
-- verify_visitor returned only users.orientation_status. Every roster row is
-- loaded as 'pending' (migration 20260101000012) and nothing flips it except a
-- manual admin UPDATE, so a person who is already a real, working account -
-- one that has signed in before - was still told "Awaiting review". The page
-- never asked the one question that matters: is this already a recognized user?
--
-- WHAT
-- ----
-- Adds `recognized` (BOOLEAN). True when the row is NOT archived and either:
--   * orientation_status = 'approved', or
--   * orientation_status = 'pending' AND the linked auth login has signed in
--     before (auth.users.last_sign_in_at IS NOT NULL). That person already
--     proved mailbox control and the app does not gate login on
--     orientation_status, so holding them in review achieves nothing.
--
-- 'declined' is NEVER recognized: a declined/revoked verdict keeps its existing
-- flow. Archived rows are excluded by the WHERE clause already.
--
-- THIS STILL DOES NOT AUTHENTICATE ANYONE. `recognized` only tells the page to
-- send the magic link to the address on file instead of showing "review". The
-- session is still established by the emailed link. See 20260101000013.
--
-- Only a boolean is returned; last_sign_in_at itself is not exposed.
--
-- Safe to re-run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.verify_visitor(
  p_name      TEXT,
  p_course_id UUID
)
RETURNS TABLE (
  orientation_status public.orientation_status,
  full_name         TEXT,
  programme         TEXT,
  course_id         UUID,
  email             TEXT,
  has_email         BOOLEAN,
  recognized        BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.orientation_status,
    u.name,
    c.label,
    u.course_id,
    u.email,
    (u.email IS NOT NULL),
    (
      u.orientation_status = 'approved'
      OR (
        u.orientation_status = 'pending'
        AND EXISTS (
          SELECT 1 FROM auth.users a
           WHERE a.id = u.id
             AND a.last_sign_in_at IS NOT NULL
        )
      )
    )
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE u.course_id = p_course_id
    AND lower(u.name) = lower(btrim(p_name))
    AND u.archived_at IS NULL;
$$;

COMMENT ON FUNCTION public.verify_visitor(TEXT, UUID) IS
  'IDENTIFICATION ONLY - resolves name + course to a record. Does not create a '
  'session. Returns every match (caller refuses ambiguity). recognized = approved, '
  'or pending but already signed in before; never true for declined.';

REVOKE ALL ON FUNCTION public.verify_visitor(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_visitor(TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
