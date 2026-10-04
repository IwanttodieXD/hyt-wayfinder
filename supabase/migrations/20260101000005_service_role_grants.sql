-- ============================================================================
-- HYT Wayfinder - service_role table privileges
--
-- Run this after 20260101000001 and before using /admin/users.
--
-- Problem: every admin API call fails with
--
--   { code: '42501',
--     message: 'permission denied for table users',
--     hint: 'Grant the required privileges to the current role with:
--             GRANT SELECT ON public.users TO service_role;' }
--
-- Cause: /api/admin/users authenticates as `service_role`, which is what lets it
-- create auth logins, ban users, and edit other people's rows. RLS is bypassed
-- for that role, but RLS is NOT a grant - Postgres still requires the table
-- privilege. The earlier migrations granted anon/authenticated only, so the
-- service role had no privileges at all.
--
-- Consequence: create, edit and archive silently did nothing on a database set
-- up this way. The UI reported success because it trusted the 2xx, or showed a
-- generic failure with no hint as to why.
--
-- This is safe to run more than once: GRANT is idempotent.
-- ============================================================================


-- Full access to the four tables the admin route touches.
--
-- Deliberately NOT granted to anon or authenticated: this role bypasses RLS
-- entirely, so anything it can read, it can read regardless of who is asking.
-- It is only ever used from the server route, where `requireAdmin` has already
-- verified the caller is an admin using the caller's own token.
--
-- Still no DELETE on `users`, `clock_in_records` or `room_visits`: attendance
-- and presence history must survive someone leaving. Archiving is the supported
-- way to remove access.
GRANT SELECT, INSERT, UPDATE ON public.users             TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.clock_in_records  TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.room_visits       TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.rooms             TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.purposes          TO service_role;

-- visitor_types arrives in migration 004. Granted conditionally so this file can
-- be applied first on a database that has not had 004 yet - an unconditional
-- GRANT on a missing table aborts the whole script, taking the grants above
-- down with it.
DO $$
BEGIN
  IF to_regclass('public.visitor_types') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.visitor_types TO service_role';
  END IF;
END
$$;

-- Nothing here writes a sequence directly (every id is a uuid default), but the
-- admin route may need to insert into visitor_types in future, and Supabase
-- commonly reports a missing sequence grant as an opaque 42501.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- Confirm the end state.
--
-- Expect four rows, one per table. If any table is missing, the admin API will
-- keep failing on it.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN ('users', 'rooms', 'clock_in_records', 'room_visits')
ORDER BY table_name, privilege_type;