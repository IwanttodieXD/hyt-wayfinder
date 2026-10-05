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
-- So this function is deliberately IDENTIFICATION ONLY. It resolves an address
-- to a row so the UI can say "we found you, here's your verdict, check your
-- email to continue". The session is then established by Supabase's magic-link
-- email, which proves the visitor controls the mailbox and cannot be replayed
-- by somebody standing at the door.
--
-- If you later decide a self-service kiosk genuinely needs to admit someone
-- without email, that is a different feature with a different threat model.
-- It needs a service-role route, an audit trail, a short token lifetime and a
-- physical-assumption argument. Do not do it by weakening this function.
--
-- SECURITY TRADEOFF
-- ----------------
-- SECURITY DEFINER bypasses RLS, so callers can enumerate the cohort by
-- guessing addresses. The full reasoning, and the alternative if it stops being
-- acceptable, are in 20260101000013. This function widens that surface slightly
-- by also matching on name, so it is kept to returning the minimum needed to
-- drive the UI.
--
-- Safe to re-run: CREATE OR REPLACE.
-- ============================================================================


CREATE OR REPLACE FUNCTION public.verify_visitor(
  p_email TEXT,
  p_name  TEXT DEFAULT NULL
)
RETURNS TABLE (
  orientation_status public.orientation_status,
  full_name         TEXT,
  programme         TEXT,
  course_id         UUID,
  email             TEXT
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
    u.email
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE lower(u.email) = lower(btrim(p_email))
    AND u.archived_at IS NULL
    -- Optional second factor. When a name is supplied it must match the row.
    -- This is NOT a secret and does not authenticate anybody - it exists to
    -- catch the case where someone typed the wrong address and to catch a
    -- mistyped name, not to prove identity.
    AND (
      p_name IS NULL
      OR btrim(p_name) = ''
      OR lower(u.name) = lower(btrim(p_name))
    )
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.verify_visitor(TEXT, TEXT) IS
  'IDENTIFICATION ONLY - resolves an email to an orientation record so the UI '
  'can show a verdict. Does not create a session. See the migration header for '
  'why name+course must never be treated as authentication.';

REVOKE ALL ON FUNCTION public.verify_visitor(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_visitor(TEXT, TEXT) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------------------
--
-- Correct address, correct name -> one row.
--   SELECT * FROM public.verify_visitor('gemmaaranda05@gmail.com', 'Gemmalyn Ocbina Aranda');
--
-- Correct address, wrong name -> zero rows, NOT an error:
--   SELECT count(*) FROM public.verify_visitor('gemmaaranda05@gmail.com', 'Wrong Name');
--
-- Unknown address -> zero rows:
--   SELECT count(*) FROM public.verify_visitor('nobody@example.com');


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