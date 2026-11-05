-- ============================================================================
-- HYT Global - lookup management
--
-- /admin/lookups lets an admin create, edit, retire and delete rows in
-- `purposes`, `visitor_types` and `courses`. Those tables already had
-- SELECT/INSERT/UPDATE grants, but two things were missing for the page to work:
--
--   1. No DELETE grant on any of the three tables, so a delete failed with
--      42501 (permission denied) before RLS was even consulted.
--   2. `visitor_types` had no admin FOR ALL policy at all. It was readable by
--      anyone (the register form needs it before sign-in) but no role could
--      write to it. Purposes and courses already had their admin policy.
--
-- Deletion is still guarded by the schema, not by this grant: a purpose
-- referenced by `clock_in_records.purpose_id` uses ON DELETE RESTRICT, so the
-- page falls back to deactivation when Postgres raises 23503. Visitor types and
-- courses use ON DELETE SET NULL, so deleting one simply clears it from any
-- visitor who had it.
--
-- Safe to run more than once: grants are idempotent and the policy is dropped
-- before being recreated.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Table privileges
-- ----------------------------------------------------------------------------
--
-- INSERT/UPDATE are repeated for visitor_types so this file is self-contained
-- even on a database that only ran migration 004 (which granted SELECT alone).

GRANT INSERT, UPDATE, DELETE ON public.purposes      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.visitor_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses       TO authenticated;


-- ----------------------------------------------------------------------------
-- Admin manage policy for visitor_types
-- ----------------------------------------------------------------------------
--
-- Same shape as `admins manage purposes` and `courses manageable by admins`:
-- FOR ALL covers INSERT/UPDATE/DELETE, and is_admin() is checked against
-- public.users rather than the JWT so a demotion takes effect immediately.

DROP POLICY IF EXISTS "visitor_types manageable by admins" ON public.visitor_types;

CREATE POLICY "visitor_types manageable by admins"
  ON public.visitor_types FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ----------------------------------------------------------------------------
-- Confirm the end state
-- ----------------------------------------------------------------------------
--
-- Expect DELETE for all three tables, and one FOR ALL policy on visitor_types.
-- If DELETE is missing, the admin page will report "permission denied" instead
-- of deleting even though the UI offers the action.

SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN ('purposes', 'visitor_types', 'courses')
ORDER BY table_name, privilege_type;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('purposes', 'visitor_types', 'courses')
ORDER BY tablename, policyname;
