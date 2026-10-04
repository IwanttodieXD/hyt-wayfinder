-- ============================================================================
-- HYT Wayfinder - retire the trainer and trainee roles
--
-- Run this if you ALREADY ran 20260101000001_full_schema.sql and/or
-- 20260101000002_registration_fix.sql.
--
-- The 'trainer' and 'trainee' roles granted nothing that 'visitor' did not.
-- Every RLS policy either checked auth.uid() or called is_admin(), which only
-- recognises 'admin'; the trainer and trainee portal pages were byte-identical
-- to the visitor one. They were a distinction in the UI and nothing else.
--
-- Only 'admin' and 'visitor' remain in the application.
--
-- The enum labels are deliberately LEFT IN PLACE. Postgres cannot drop a value
-- from an enum, and every alternative is destructive:
--   * Renaming 'trainer' to 'visitor' fails, because 'visitor' already exists.
--   * Recreating the type means dropping and re-adding public.users.role, which
--     is the column all attendance history hangs off.
-- A retired enum label that nothing writes is harmless. The API route rejects
-- both values, and the UPDATE below normalises any rows that already carry them.
--
-- Safe to run more than once: the UPDATE is idempotent.
-- ============================================================================


-- 1. Fold the retired roles into 'visitor'.
--
-- Only the profile role changes. clock_in_records and room_visits are untouched:
-- they join to users by id and never stored a role, so attendance history and
-- every room visit survive this untouched.
UPDATE public.users
SET role = 'visitor'
WHERE role IN ('trainer', 'trainee');


-- 2. Confirm the end state.
--
-- Expect one row per distinct role, each of which must be 'admin' or 'visitor'.
-- If this returns any trainer/trainee row, step 1 did not run.
SELECT role, COUNT(*)
FROM public.users
GROUP BY role
ORDER BY role;