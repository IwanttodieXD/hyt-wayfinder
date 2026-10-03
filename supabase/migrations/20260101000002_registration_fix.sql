-- ============================================================================
-- HYT Wayfinder - registration fix
--
-- Run this if you ALREADY ran 20260101000001_full_schema.sql.
-- Re-running that file is not safe (the tables already exist), so the
-- self-registration fix lives here on its own.
--
-- Problem: signing up for yourself could never create a profile row.
-- The only INSERT policy was "admins insert users" (WITH CHECK is_admin()),
-- and no trigger existed on auth.users to create the row on your behalf, so
-- registration failed with:
--
--   Failed to create user profile: permission denied for table users
--
-- Also fixes the registration form's purpose picker, which was always empty
-- because the purposes policy required an authenticated session and the form
-- runs before anyone signs in.
--
-- Safe to run more than once: every statement is IF EXISTS / OR REPLACE.
-- ============================================================================


-- 1. Table privileges.
--
-- THIS IS THE ACTUAL BUG BEING FIXED. Registration was failing with:
--
--   { code: '42501',
--     hint: 'Grant the required privileges to the current role ...
--            INSERT, UPDATE ON public.users TO authenticated;',
--     message: 'permission denied for table users' }
--
-- RLS and GRANT are two separate gates. The full schema enabled RLS and wrote
-- every policy, but never granted any table privileges, so Postgres rejected
-- every statement with 42501 before the policies were ever evaluated. The
-- policies were completely inert.
--
-- Grants are deliberately narrow:
--   * No DELETE anywhere. Attendance and presence history cannot be removed.
--   * users is SELECT/INSERT/UPDATE only, matching archive-not-delete.
--   * rooms/purposes readable by anyone (the registration form needs them
--     pre-sign-in), writable by admins.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.rooms    TO anon, authenticated;
GRANT SELECT ON public.purposes TO anon, authenticated;
GRANT INSERT, UPDATE ON public.rooms    TO authenticated;
GRANT INSERT, UPDATE ON public.purposes TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.clock_in_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_visits     TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- 2. Create the profile automatically when the auth user is created.
--
-- SECURITY DEFINER because the inserting role is `supabase_auth_admin`, which
-- has no grants on public.users.
--
-- The role is hardcoded to 'visitor' and deliberately ignores
-- raw_user_meta_data: self-registration must never be able to mint an admin,
-- which would be a privilege escalation. Elevated roles are granted by an
-- admin through /admin/users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    'visitor'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Fallback for a profile that is somehow still missing.
--
-- Scoped tightly: a user may only insert a row for their own id, and only with
-- the 'visitor' role, so this cannot be used to grant anyone elevated access.
--
-- Both the old and the new name are dropped first: the same policy is also
-- declared in the full-schema file, so running these two in either order must
-- not collide with "policy already exists" (SQLSTATE 42710).
DROP POLICY IF EXISTS "users insert own row" ON public.users;

CREATE POLICY "users insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'visitor');


-- 4. Let the registration form read the purposes list before sign-in.
--
-- Safe to open up: purposes is a fixed list of labels, no user data in it.
DROP POLICY IF EXISTS "purposes readable when signed in" ON public.purposes;
DROP POLICY IF EXISTS "purposes readable by anyone" ON public.purposes;

CREATE POLICY "purposes readable by anyone"
  ON public.purposes FOR SELECT
  USING (TRUE);


-- 5. Backfill any profile rows that the missing trigger never created.
--
-- Without this, people who registered while the bug was live have an auth login
-- but no profile, so they cannot sign in at all.
--
-- There is no existing role to preserve here - by definition these rows have no
-- profile - so everyone becomes 'visitor'. Elevated roles are granted by an
-- admin afterwards via /admin/users.
INSERT INTO public.users (id, email, name, role)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    split_part(au.email, '@', 1)
  ),
  'visitor'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;