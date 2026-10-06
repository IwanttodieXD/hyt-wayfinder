-- ============================================================================
-- HYT Wayfinder - handle_new_user must tolerate an existing profile row
--
-- WHY
-- ---
-- /verify signs a visitor in by minting a Supabase session for the matched
-- profile (app/api/verify/route.ts). When a profile row exists but its auth
-- login does not - the normal case for the imported orientation roster, whose
-- accounts were never created - the route provisions one with
-- `id = public.users.id` so the login and the profile stay the same person.
--
-- That only works if handle_new_user tolerates that id already existing. The
-- function currently installed in this database does a PLAIN INSERT into
-- public.users, so the auth-user INSERT aborts with a primary-key violation and
-- the Admin API reports the generic:
--
--   "Database error creating new user"
--
-- Reproduced directly: creating two auth users with the same id (the second
-- with a fresh email) fails, which can only happen if the trigger is not using
-- ON CONFLICT (id). This restores the definition the schema was always meant to
-- have (see 20260101000001 / 000002 / 000010), which does.
--
-- AFTER THIS
-- ----------
--   admin.createUser({ id: <existing profile id>, email, email_confirm: true })
--   -> the trigger sees the profile row already present and does nothing.
--   A brand-new id still inserts normally, and a genuine duplicate EMAIL under
--   a different id still fails loudly (only the id conflict is absorbed).
--
-- The route only calls createUser when generateLink reports the login is
-- missing, so nothing changes for accounts that already have one.
--
-- Safe to re-run: CREATE OR REPLACE, and the trigger is dropped first.
--
-- Run it from the Supabase SQL editor (or psql).
-- ============================================================================

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
  -- The whole point: a profile row created before the login (imported roster)
  -- must not block the login from being created for the same id.
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Remove EVERY user-defined trigger on auth.users, whatever it is called and
-- whatever function it runs, then install the one we want.
--
-- Matching only on `handle_new_user` was not enough: this database has a trigger
-- on auth.users that creates the profile with a plain INSERT, and it is not the
-- function above - so replacing that function changed nothing and the insert
-- kept failing. Dropping by name or by function leaves it in place; dropping
-- every non-internal trigger cannot. `tgisinternal` skips Postgres' own
-- constraint triggers, which must stay.
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trg.tgname);
  END LOOP;
END
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


NOTIFY pgrst, 'reload schema';
