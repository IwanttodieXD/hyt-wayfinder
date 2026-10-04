-- ============================================================================
-- HYT Wayfinder - attendance integrity + least-privilege updates
--
-- Two independent problems, both about the same two tables.
--
-- 1. clock_in_records had no "one open row per user" constraint. room_visits
--    has room_visits_one_open_per_user, but attendance only had a non-unique
--    partial index. A double-tap on the entrance code, or a second device, can
--    therefore open two concurrent check-ins. The app then closes only the one
--    it holds the id for (activeRecordId), so the other stays open forever and
--    is counted by "who is in the building" for good.
--
-- 2. The RLS UPDATE policies for attendance and presence only checked that the
--    row belongs to the caller (WITH CHECK auth.uid() = user_id). They did not
--    constrain WHICH columns changed, despite the comment in migration 001
--    claiming the row "may only be gaining a time_out". A visitor could
--    UPDATE their own open row to rewrite time_in or room_id and falsify their
--    attendance. Column-level GRANTs close this: the table privilege is removed
--    and only the timestamp column that clock-out/leave actually write is
--    granted back.
--
-- Safe to run more than once: the index is IF NOT EXISTS and GRANT/REVOKE are
-- idempotent. See 20260101000001_full_schema.sql for the schema being amended.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. One open attendance row per user
-- ----------------------------------------------------------------------------

-- Refuse to build the index if duplicate open rows already exist, rather than
-- silently mutating history. This migration never closes a visit on its own:
-- which of two open rows is the "real" one is a human decision. The message
-- names the remediation query so the operator can resolve it and re-run.
DO $$
DECLARE
  dup_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_users
  FROM (
    SELECT user_id
    FROM public.clock_in_records
    WHERE time_out IS NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) d;

  IF dup_users > 0 THEN
    RAISE EXCEPTION
      'Cannot create clock_in_one_open_per_user: % user(s) already have more than one open attendance row. Inspect with: SELECT user_id, id, time_in FROM public.clock_in_records WHERE time_out IS NULL ORDER BY user_id, time_in DESC; then close the stale rows (set time_out) and re-run this migration.',
      dup_users;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS clock_in_one_open_per_user
  ON public.clock_in_records (user_id)
  WHERE time_out IS NULL;


-- ----------------------------------------------------------------------------
-- 2. Least-privilege UPDATE on the two visit tables
-- ----------------------------------------------------------------------------
-- Migration 001 granted table-wide UPDATE to authenticated. RLS decided who,
-- but nothing decided which columns, so "close my own row" was really "rewrite
-- any column of my own row". Restrict the privilege to the one column each
-- clock-out path writes.
--
-- INSERT is left table-wide on purpose: an INSERT must supply every NOT NULL
-- column, so a column-scoped INSERT grant would be unusable. SELECT is
-- unchanged - it is governed by the read policies.
--
-- service_role is untouched here; the admin API writes users only, and its
-- grants are managed in 20260101000005_service_role_grants.sql.

REVOKE UPDATE ON public.clock_in_records FROM authenticated;
GRANT  UPDATE (time_out)  ON public.clock_in_records TO authenticated;

REVOKE UPDATE ON public.room_visits FROM authenticated;
GRANT  UPDATE (exited_at) ON public.room_visits TO authenticated;
