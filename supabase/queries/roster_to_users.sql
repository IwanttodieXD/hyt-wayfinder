-- ============================================================================
-- Orientation roster - AUDIT, not a loader
-- ============================================================================
--
-- READ THIS FIRST
-- ---------------
-- The 131-person cohort is ALREADY in public.users. It was loaded by
-- supabase/migrations/20260101000012_orientation_students.sql.
--
-- That load was PARTIAL. The users exist, but the five name-part columns it
-- names (last_name, first_name, middle_name, middle_initial, name_extension)
-- are created by no migration, so its INSERT raised 42703 and aborted - taking
-- the courses and every course_id with it.
--
-- supabase/migrations/20260101000014_repair_cohort_load.sql is the fix. It
-- creates the missing columns, inserts the programmes, backfills course_id, and
-- retires the placeholder addresses. Run that FIRST, then use this file to
-- confirm the result.
--
-- DO NOT run the projection below as an INSERT. The rows already exist.
--
-- NULL EMAIL
-- ----------
-- Since 20260101000014 the placeholders are NULL and users.email is nullable.
-- The 24 affected people therefore CANNOT sign in: there is no address to send a
-- magic link to, and /verify sends them to the front desk rather than promising
-- a link that cannot arrive.
--
-- WHAT THIS FILE CONTAINS
-- -----------------------
--   1. The projection you asked for: full_name, email, course_id, read from
--      public.users.
--   2. Audit queries - the 24 who cannot sign in, the backfill, and the
--      checks that catch a bad load.
--
-- SAFE TO RE-RUN: every statement below is a SELECT.
-- ============================================================================


-- ============================================================================
-- 1. THE PROJECTION YOU ASKED FOR: full_name, email, course_id
-- ============================================================================
--
-- Read straight from public.users, which is what the app actually uses. Note
-- the name format, which is NOT "Last, First M.I.":
--
--   users.name was built by 20260101000012 as "First Middle Last"
--   ('Gemmalyn Ocbina Aranda').
--
-- That is deliberate - /verify matches what a visitor types, and people type
-- their name the way it is on the roster. Changing the stored format would
-- silently break every one of those lookups.
--
-- The middle initial is appended only where users.middle_initial is set.
SELECT
  TRIM(BOTH ' ' FROM CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name))
    || COALESCE(' ' || u.middle_initial, '')                     AS full_name,
  u.email,
  c.id                                                          AS course_id,
  -- Review columns, not part of the requested output.
  c.label                                                       AS course,
  u.orientation_status,
  (u.email IS NULL)                                             AS needs_email,
  (u.archived_at IS NOT NULL)                                   AS is_archived
FROM public.users u
LEFT JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN (
  'Barista NC II', 'Event Management Services NC II', 'Housekeeping NC II',
  'Hilot (Wellness) Services NC II', 'Massage NC II'
)
ORDER BY c.label, u.last_name, u.first_name;


-- ============================================================================
-- 2. AUDIT QUERIES - run these against the live table
-- ============================================================================

-- 2a. THE 24 WHO CANNOT SIGN IN. This is the list to work from when collecting
--     addresses. They are on the roster and may well be approved, but with no
--     address there is no way to prove who they are, so /verify will send them
--     to the front desk.
--
--       SELECT c.label AS programme, u.name, u.last_name, u.first_name
--       FROM public.users u
--       LEFT JOIN public.courses c ON c.id = u.course_id
--       WHERE u.email IS NULL AND u.archived_at IS NULL
--       ORDER BY 1, u.last_name, u.first_name;

-- 2b. BACKFILL after collecting an address. Both writes are required: the
--     profile row is what the app reads, the auth row is what proves identity.
--     Doing only the first produces a person who looks registered but cannot
--     ever sign in, which is the exact failure the placeholder was hiding.
--
--       BEGIN;
--       UPDATE public.users SET email = 'real@example.com'
--        WHERE email IS NULL AND last_name = 'Casiano' AND first_name = 'Daniella';
--       -- verify the row you just changed before committing:
--       SELECT id, email FROM public.users
--        WHERE last_name = 'Casiano' AND first_name = 'Daniella';
--       COMMIT;
--
--     Then set the same address on the auth row. That one cannot be done in
--     SQL from here: it needs the service_role key, so use the Supabase
--     dashboard (Authentication -> Users) or the admin UI at /admin/users,
--     which already writes both.

-- 2c. THE TWO PLACES auth.users AND public.users DISAGREE. Migration
--     20260101000014 nulled the profile copy for the placeholder rows but
--     Auth's own rows are updated separately, so this is worth confirming.
--
--       SELECT u.id, u.name, u.email AS profile_email, a.email AS auth_email
--       FROM public.users u
--       JOIN auth.users a ON a.id = u.id
--       WHERE u.email IS DISTINCT FROM a.email;

-- 2d. Count reconciliation against the sheets. Expect:
--       58  Barista NC II
--       10  Event Management Services NC II
--       52  Housekeeping NC II
--       10  Hilot (Wellness) Services NC II
--        1  Massage NC II
--      ---
--      131  total
--     The Massage NC II sheet was truncated in the source, so 1 is a floor.
--
--       SELECT c.label AS programme, count(*) AS people,
--              count(*) FILTER (WHERE u.email IS NULL) AS no_email
--       FROM public.users u
--       JOIN public.courses c ON c.id = u.course_id
--       WHERE c.label IN (
--         'Barista NC II', 'Event Management Services NC II',
--         'Housekeeping NC II', 'Hilot (Wellness) Services NC II',
--         'Massage NC II')
--       GROUP BY 1 ORDER BY 1;

-- 2e. Name + course collisions. These are the only duplicates that affect
--     /verify: it matches on both and refuses when more than one row returns,
--     so a repeat here means those people can never self-verify.
--
--       SELECT c.label, u.name, count(*)
--       FROM public.users u
--       JOIN public.courses c ON c.id = u.course_id
--       WHERE u.archived_at IS NULL
--       GROUP BY 1, 2 HAVING count(*) > 1;

-- 2f. Addresses that will bounce. The three known from the sheets are typos in
--     the source data, NOT corrected here - picking between two plausible
--     spellings is the registrar's call. One of these three is corrected
--     relative to the sheets ('lourdesairod252gmail.com' ->
--     'lourdesairod252@gmail.com'); confirm with the person before relying on
--     it.
--
--       SELECT name, email FROM public.users
--       WHERE email IS NOT NULL
--         AND (email NOT LIKE '%_@_%._%' OR email LIKE '%orientation.hyt.local')
--       ORDER BY name;

