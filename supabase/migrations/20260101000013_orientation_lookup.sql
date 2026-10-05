-- ============================================================================
-- HYT Wayfinder - look up an orientation verdict by email
--
-- Supports the rule from 20260101000012: a returning student from the last
-- orientation should see APPROVED or DECLINED as soon as they register, rather
-- than being told to wait.
--
-- Why a function rather than a client-side read
-- ----------------------------------------------
-- `public.users` has RLS: `USING (auth.uid() = id OR is_admin())`. Someone
-- registering has no session yet, so a direct `.from('users').select()` from
-- the browser returns nothing. That is the correct behaviour - the table holds
-- every visitor in the building, and anonymous visitors must not be able to
-- enumerate it. So the lookup goes through a SECURITY DEFINER function that
-- returns exactly three fields for exactly one email, and nothing else.
--
-- SECURITY TRADEOFF (deliberate, please read before widening this)
-- ----------------------------------------------------------------
-- SECURITY DEFINER bypasses RLS, so this function exposes, for any email a
-- caller can guess: whether that person is in the cohort, their display name,
-- their programme, and their verdict. That is a deliberate enumeration surface
-- - someone could script a list of common addresses and map names to verdicts.
--
-- It is accepted because the feature cannot work without it (the visitor must
-- be told their own status before they have an account), and because the data
-- exposed is exactly the data the front desk already displays to anyone who
-- asks at the desk. If that tradeoff stops being acceptable, the fix is to move
-- the lookup behind an authenticated API route with the service key rather
-- than to grant more to this function.
--
-- The function returns no rows (not an error) for an unknown email, so it
-- cannot be used to distinguish "no such person" from "lookup failed".
--
-- Safe to re-run: CREATE OR REPLACE.
-- ============================================================================


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