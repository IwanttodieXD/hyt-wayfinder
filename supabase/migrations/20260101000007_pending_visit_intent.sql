-- ----------------------------------------------------------------------------
-- 20260101000007_pending_visit_intent.sql
--
-- Why this exists
-- ---------------
-- The register form collects an assigned room and a purpose, but `users` has no
-- column to put them in. They were carried in the registrant's browser session
-- only, which works for self-registration - the person filling the form is the
-- person who checks in, so their own session is there at the scanner.
--
-- That breaks the moment staff create an account for somebody else. There is no
-- session belonging to the new visitor, so an admin-entered room and purpose had
-- nowhere to go and were silently discarded. This adds the two columns that make
-- an admin-entered intent survive until the visitor actually arrives.
--
-- Deliberately PENDING, not authoritative
-- --------------------------------------
-- These record what someone is expected to be here for. The real room and
-- purpose are written to `clock_in_records.room_id` / `.purpose_id` at check-in,
-- one row per visit, because a person can attend a Meeting today and an
-- Orientation next week. These two columns only SEED that first visit.
--
-- They are deliberately NOT `users.destination` / `users.purpose` renamed back
-- into existence: those belong to a visit. Naming them "pending" keeps it
-- obvious at every call site that this is an expectation, not a record.
--
-- Nulls are the normal state - most visitors have no assigned room - so both
-- columns are nullable and no backfill is needed.
--
-- Re-runnable: ADD COLUMN IF NOT EXISTS is a no-op when already present.
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pending_room_id UUID
    REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pending_purpose_id UUID
    REFERENCES public.purposes(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Confirm the end state.
-- ----------------------------------------------------------------------------

-- Deliberately two plain checks rather than a VALUES list: a list needs a column
-- alias, and `column` is a reserved word in Postgres (42601). An earlier version
-- of this block used `AS expected(column)` and failed for exactly that reason.
-- Two scalar lookups cannot hit that class of problem at all.
DO $$
DECLARE
  has_room    BOOLEAN;
  has_purpose BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'pending_room_id'
  ) INTO has_room;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'pending_purpose_id'
  ) INTO has_purpose;

  IF NOT has_room OR NOT has_purpose THEN
    RAISE EXCEPTION
      'FAILED: users.pending_room_id present=%, users.pending_purpose_id present=%',
      has_room, has_purpose;
  END IF;

  RAISE NOTICE 'users now has pending_room_id and pending_purpose_id';
END $$;