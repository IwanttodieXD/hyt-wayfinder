-- ----------------------------------------------------------------------------
-- 20260101000006_default_pass_expiry.sql
--
-- Why this exists
-- ---------------
-- The register form sets `valid_until` to the end of the registering day, so a
-- walk-in account cannot quietly stay valid for months. That logic lives in the
-- client today, which means it is only as trustworthy as the client: a modified
-- bundle, a curl call, or a future code path that forgets the field would all
-- create a pass with no expiry at all.
--
-- `valid_until` NULL means "never expires", so the failure mode is silent and
-- permanent. Enforcing the default in the database makes the one-day rule a
-- property of the schema rather than a convention every writer has to remember.
--
-- This is a DEFAULT, not a constraint
-- ----------------------------------
-- A DEFAULT only applies when a writer OMITS the column. It deliberately does
-- NOT overwrite an explicit value, which is what keeps the admin form working:
--
--   - register        -> omits it, or sends end-of-today  -> 1 day
--   - admin, no date  -> sends explicit NULL              -> never expires
--   - admin, a date   -> sends that date                  -> as chosen
--
-- Using a CHECK or a BEFORE trigger instead would clobber the admin's choice,
-- because an explicit NULL is indistinguishable from "not supplied" once the
-- row is being written. That would make a long pass impossible to create, which
-- is the opposite of what the admin form promises.
--
-- Existing rows are NOT touched. A pass written before this migration keeps the
-- expiry it already had; the default applies to inserts from now on. Backfilling
-- would silently lock out anyone currently holding a pass.
--
-- Re-runnable: SET DEFAULT on a column that already has it is a no-op.
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
  ALTER COLUMN valid_until SET DEFAULT (date_trunc('day', now()) + interval '1 day' - interval '1 second');

-- ----------------------------------------------------------------------------
-- Confirm the end state.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  col_default TEXT;
BEGIN
  SELECT column_default INTO col_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'valid_until';

  IF col_default IS NULL THEN
    RAISE EXCEPTION 'FAILED: users.valid_until has no default';
  END IF;

  RAISE NOTICE 'users.valid_until now defaults to end of the current day';
END $$;