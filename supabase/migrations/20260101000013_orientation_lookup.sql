-- ============================================================================
-- HYT Wayfinder - identity lookup for the entrance verification page
--
-- Companion to 20260101000013. The QR poster now points at /verify, where a
-- visitor types who they are and the system resolves them against the roster.
--
-- WHY THIS DOES NOT AUTHENTICATE ANYONE
-- -------------------------------------
-- Read this before changing anything here.
--
-- The obvious shape for this feature is "type your name and course, get let
-- in". That is not authentication, it is a lookup followed by a trust decision
-- based on two public strings: this cohort's names and courses are printed on
-- the orientation roster, and are guessable anyway. Anyone could type
-- "Gemmalyn Aranda / Barista NC II" and be handed that person's session,
-- check-in record and room access. On a system that tracks who is physically
-- inside a building, that is an impersonation backdoor, not a convenience.
--
-- So this function is deliberately IDENTIFICATION ONLY. It resolves a name and
-- course to a row so the UI can say "we found you, here's your verdict, check the
-- email on file to continue". The session is then established by Supabase's
-- magic-link email, which proves the visitor controls the mailbox and cannot be
-- replayed by somebody standing at the door.
--
-- Note that the email is OUTPUT, never INPUT. The visitor no longer types it -
-- they pick a course - and the address is read back off the matched row, so the
-- link always goes to the address on file and cannot be redirected by whoever is
-- holding the phone.
--
-- If you later decide a self-service kiosk genuinely needs to admit someone
-- without email, that is a different feature with a different threat model.
-- It needs a service-role route, an audit trail, a short token lifetime and a
-- physical-assumption argument. Do not do it by weakening this function.
--
-- SECURITY TRADEOFF
-- ----------------
-- SECURITY DEFINER bypasses RLS, so callers can enumerate the cohort by guessing
-- name + course. The full reasoning, and the alternative if it stops being
-- acceptable, are in 20260101000013. It is kept to returning the minimum needed
-- to drive the UI.
--
-- AMBIGUITY
-- ---------
-- A course is not a unique key - a cohort holds many people, and two of them can
-- share a name. So this returns ALL matching rows and the caller is required to
-- refuse when there is more than one. Picking the first row would show somebody
-- another visitor's verdict and send them that stranger's sign-in link.
--
-- Safe to re-run: CREATE OR REPLACE.
-- ============================================================================


-- Postgres identifies a function by its argument TYPES, so the (TEXT, TEXT) form
-- from the email-keyed version is a different function and CREATE OR REPLACE
-- would leave it in place, still callable. Dropped explicitly rather than left
-- behind. The (TEXT, UUID) form is replaced in place, so it needs no drop.
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, TEXT);


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
  -- False when the roster gave this person no address (migration
  -- 20260101000014). The caller MUST NOT offer to email a sign-in link it
  -- cannot deliver: the visitor would sit in front of a phone waiting for mail
  -- that was never sent, which is worse than being sent to the front desk.
  has_email         BOOLEAN
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
    (u.email IS NOT NULL)
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE u.course_id = p_course_id
    AND lower(u.name) = lower(btrim(p_name))
    AND u.archived_at IS NULL;
$$;

COMMENT ON FUNCTION public.verify_visitor(TEXT, UUID) IS
  'IDENTIFICATION ONLY - resolves a name + course to an orientation record so the '
  'UI can show a verdict. Does not create a session. Returns EVERY match rather '
  'than LIMIT 1: two people can share a name in one cohort, and silently picking '
  'one would show a stranger another visitor''s verdict. has_email is false when '
  'no address is on file, in which case no magic link can be sent.';

REVOKE ALL ON FUNCTION public.verify_visitor(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_visitor(TEXT, UUID) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------------------
--
-- Correct name, correct course -> one row.
--   SELECT * FROM public.verify_visitor('Gemmalyn Ocbina Aranda', '<course uuid>');
--
-- Two people sharing a name in one cohort -> TWO rows. The caller must treat
-- this as ambiguous rather than picking one:
--   SELECT count(*) FROM public.verify_visitor('Juan Dela Cruz', '<course uuid>');
--
-- Wrong course, or a name not in that course -> zero rows, NOT an error:
--   SELECT count(*) FROM public.verify_visitor('Wrong Name', '<course uuid>');


CREATE OR REPLACE FUNCTION public.orientation_status_for(p_email TEXT)
RETURNS TABLE (
  orientation_status public.orientation_status,
  full_name         TEXT,
  programme         TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.orientation_status,
    u.name,
    c.label
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE lower(u.email) = lower(btrim(p_email))
    -- Archived rows are excluded deliberately: a left-behind account from a
    -- previous cohort must not surface as "approved" to whoever now owns that
    -- address.
    AND u.archived_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.orientation_status_for(TEXT) IS
  'Returns the orientation verdict for one email. SECURITY DEFINER: callers '
  'can enumerate cohort membership by guessing addresses. See the migration '
  'header for why that is accepted and what to do if it stops being so.';

-- Granted explicitly rather than relying on PUBLIC execute, which is the
-- default on new functions.
REVOKE ALL ON FUNCTION public.orientation_status_for(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.orientation_status_for(TEXT) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------------------
--
-- Should return one row per known cohort member. Run it with a real address:
--
--   SELECT * FROM public.orientation_status_for('gemmaaranda05@gmail.com');
--
-- An address that is not in the cohort must return zero rows, not an error:
--
--   SELECT count(*) FROM public.orientation_status_for('nobody@example.com');