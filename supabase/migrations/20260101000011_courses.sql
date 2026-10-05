-- ============================================================================
-- HYT Wayfinder - courses reference table
--
-- Adds a `courses` lookup table (mirroring `purposes` / `visitor_types`) and a
-- `course_id` FK on `users`, so a visitor's course is a stable, managed value
-- rather than free text. The register form and the admin add/edit user modal
-- both present it as a required picker.
--
-- Safe to run more than once: every statement is IF NOT EXISTS / ON CONFLICT.
-- After running, reload the PostgREST schema cache so the REST API can see the
-- new table and column:
--
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================


-- ----------------------------------------------------------------------------
-- courses - the catalogue of courses a visitor can be enrolled in
-- ----------------------------------------------------------------------------
--
-- A lookup table, not an enum, for the same reason `purposes` is one: the list
-- is expected to grow, and adding a value must not require a type migration.

CREATE TABLE IF NOT EXISTS public.courses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.courses (label) VALUES
  ('Orientation'),
  ('Safety Training'),
  ('Leadership'),
  ('Technical Skills'),
  ('Onboarding')
ON CONFLICT (label) DO NOTHING;


-- ----------------------------------------------------------------------------
-- users.course_id - the course a visitor is enrolled in
-- ----------------------------------------------------------------------------
--
-- Nullable so existing visitors aren't broken, but the register and admin
-- forms enforce it as required. ON DELETE SET NULL so retiring a course
-- doesn't lose the visitor's row.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS course_id UUID
  REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_course_idx
  ON public.users (course_id)
  WHERE course_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- RLS and grants - same shape as `purposes` / `visitor_types`
-- ----------------------------------------------------------------------------
--
-- Readable by anyone because the register form runs before sign-in and its
-- picker would otherwise be empty for a brand-new visitor. The list contains
-- no user data, just labels.

GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE ON public.courses TO authenticated;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses readable by anyone" ON public.courses;
DROP POLICY IF EXISTS "courses manageable by admins" ON public.courses;

CREATE POLICY "courses readable by anyone"
  ON public.courses FOR SELECT
  USING (TRUE);

CREATE POLICY "courses manageable by admins"
  ON public.courses FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- Confirm the end state.
SELECT COUNT(*) AS course_count FROM public.courses;
