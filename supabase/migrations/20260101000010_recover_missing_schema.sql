-- ============================================================================
-- HYT Wayfinder - recover missing schema
--
-- Why this exists
-- ----------------
-- The live Supabase database is missing the `rooms`, `purposes`,
-- `room_visits`, and `visitor_types` tables, plus several `users` columns
-- the app reads/writes (visitor_type_id, company, host_name, phone,
-- valid_until, notes, pending_room_id, pending_purpose_id, destination,
-- purpose). As a result:
--
--   * The Kiosk Station page shows "No rooms yet" and renders no room QR
--     codes, so scanning a room code can never succeed.
--   * The registration form's room and purpose pickers are empty.
--   * Check-in writes to clock_in_records but a room scan can never record
--     presence, because room_visits does not exist.
--   * Admin edits to visitor type / company / host / phone / pass expiry
--     silently fail to save.
--
-- This script is a single, idempotent recovery you can paste into the
-- Supabase SQL Editor (Dashboard -> SQL Editor -> New query). It creates
-- every missing table, column, policy, grant, and seed row that the
-- migrations 001-009 plus seed.sql were supposed to provide. Anything that
-- already exists is left alone (IF NOT EXISTS / OR REPLACE / ON CONFLICT).
--
-- Run the whole thing once. It is safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. rooms - single source of truth for every room in the building
-- ----------------------------------------------------------------------------
-- The door QR code value lives here. The scanner resolves a scanned code to
-- a room row by matching this value, so without this table the QR codes the
-- kiosk page renders are exactly the ones that are missing.

CREATE TABLE IF NOT EXISTS public.rooms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number  TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  floor        TEXT NOT NULL,
  building     TEXT NOT NULL DEFAULT 'HYT-Business Center',
  qr_value     TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rooms_floor_check CHECK (floor IN ('G', '2', '3', '4', 'Roof'))
);

CREATE INDEX IF NOT EXISTS rooms_floor_idx ON public.rooms (floor) WHERE is_active;
CREATE INDEX IF NOT EXISTS rooms_active_idx ON public.rooms (is_active);


-- ----------------------------------------------------------------------------
-- 2. purposes - why someone is in the building on a given visit
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purposes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.purposes (label) VALUES
  ('Interview'),
  ('Orientation'),
  ('Meeting'),
  ('Training'),
  ('Consultation'),
  ('Maintenance'),
  ('Delivery'),
  ('Other')
ON CONFLICT (label) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. visitor_types - how a visitor relates to the building (descriptive only)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.visitor_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.visitor_types (label, is_primary) VALUES
  ('Trainee', TRUE),
  ('Trainer', TRUE),
  ('VIP', TRUE),
  ('Guest', FALSE),
  ('Contractor', FALSE),
  ('Intern', FALSE),
  ('Observer', FALSE)
ON CONFLICT (label) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3b. courses - the catalogue of courses a visitor can be enrolled in
-- ----------------------------------------------------------------------------
-- Mirrors purposes/visitor_types. Added by migration 20260101000011; included
-- here too so a live DB recovered with this script gets the table and column
-- in one pass.

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


-- ----------------------------------------------------------------------------
-- 4. room_visits - PRESENCE. Room door codes only.
-- ----------------------------------------------------------------------------
-- Append-only: a scan opens a row, the next scan closes it. Never affects
-- attendance. One person can be in at most one room at a time, enforced by
-- the partial unique index below.

CREATE TABLE IF NOT EXISTS public.room_visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  clock_in_id UUID REFERENCES public.clock_in_records(id) ON DELETE SET NULL,
  entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at   TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NULL THEN NULL
         ELSE FLOOR(EXTRACT(EPOCH FROM (exited_at - entered_at)) / 60)::INT
    END
  ) STORED,
  status      TEXT GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NULL THEN 'inside' ELSE 'left' END
  ) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_visit_time_order CHECK (exited_at IS NULL OR exited_at >= entered_at)
);

CREATE INDEX IF NOT EXISTS room_visits_user_idx   ON public.room_visits (user_id);
CREATE INDEX IF NOT EXISTS room_visits_room_idx   ON public.room_visits (room_id);
CREATE INDEX IF NOT EXISTS room_visits_clock_in_idx ON public.room_visits (clock_in_id);
CREATE INDEX IF NOT EXISTS room_visits_entered_idx ON public.room_visits (entered_at DESC);
CREATE INDEX IF NOT EXISTS room_visits_open_idx   ON public.room_visits (room_id)
  WHERE exited_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS room_visits_one_open_per_user
  ON public.room_visits (user_id)
  WHERE exited_at IS NULL;


-- ----------------------------------------------------------------------------
-- 5. users - descriptive visitor fields
-- ----------------------------------------------------------------------------
-- All nullable, all free of behaviour. The app writes these from the
-- register form and the admin users page; without the columns the writes
-- silently no-op. destination/purpose are looked up by the scanner from
-- the pending_*_id columns (migration 007).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS visitor_type_id UUID
  REFERENCES public.visitor_types(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_room_id UUID
  REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_purpose_id UUID
  REFERENCES public.purposes(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS course_id UUID
  REFERENCES public.courses(id) ON DELETE SET NULL;
-- destination/purpose are not stored; the scanner derives them from
-- pending_*_id at sign-in. Kept off the schema intentionally (see
-- authStore.pendingFromProfile).

-- Default pass expiry: end of the registering day. A DEFAULT only applies
-- when the writer omits the column, so an admin can still grant a long pass
-- by sending an explicit date (or NULL for never).
ALTER TABLE public.users
  ALTER COLUMN valid_until SET DEFAULT (date_trunc('day', now()) + interval '1 day' - interval '1 second');

CREATE INDEX IF NOT EXISTS users_visitor_type_idx ON public.users (visitor_type_id);
CREATE INDEX IF NOT EXISTS users_valid_until_idx  ON public.users (valid_until)
  WHERE valid_until IS NOT NULL;

-- Normalise any retired roles into 'visitor' (migration 003).
UPDATE public.users SET role = 'visitor' WHERE role IN ('trainer', 'trainee');

-- Exactly one admin (migration 004). Oldest wins.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.users
  WHERE role = 'admin'
)
UPDATE public.users
SET role = 'visitor'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_idx
  ON public.users ((TRUE))
  WHERE role = 'admin';


-- ----------------------------------------------------------------------------
-- 6. RLS - enable on every table that doesn't already have it
-- ----------------------------------------------------------------------------
-- RLS is two gates: ALTER ... ENABLE ROW LEVEL SECURITY, and the policies
-- below. Both must exist or the policies are inert.

ALTER TABLE public.rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visits   ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 7. Table privileges (GRANT) - the other gate, equally easy to forget
-- ----------------------------------------------------------------------------
-- Without these, Postgres rejects with 42501 before any policy is evaluated.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.rooms          TO anon, authenticated;
GRANT SELECT ON public.purposes       TO anon, authenticated;
GRANT SELECT ON public.visitor_types  TO anon, authenticated;
GRANT INSERT, UPDATE ON public.rooms         TO authenticated;
GRANT INSERT, UPDATE ON public.purposes      TO authenticated;
GRANT INSERT, UPDATE ON public.visitor_types TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.users            TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clock_in_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_visits      TO authenticated;

-- service_role (server route /api/admin/users). Bypasses RLS, so the
-- requireAdmin check in the route is the only gate.
GRANT SELECT, INSERT, UPDATE ON public.users            TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.clock_in_records TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.room_visits      TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.rooms            TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.purposes         TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.visitor_types    TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Least-privilege UPDATE: visitors may only set the close-out timestamp on
-- their own open visit/presence rows, not rewrite any other column.
REVOKE UPDATE ON public.clock_in_records FROM authenticated;
GRANT  UPDATE (time_out) ON public.clock_in_records TO authenticated;
REVOKE UPDATE ON public.room_visits FROM authenticated;
GRANT  UPDATE (exited_at) ON public.room_visits TO authenticated;


-- ----------------------------------------------------------------------------
-- 8. Helper functions and policies
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND archived_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Auto-create a profile row when an auth user is created. SECURITY DEFINER
-- because the inserting role is supabase_auth_admin.
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

-- Backfill any profile rows the missing trigger never created.
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


-- rooms: readable by anyone (the registration form and the scanner both
-- need rows before sign-in).
DROP POLICY IF EXISTS "rooms readable when signed in" ON public.rooms;
DROP POLICY IF EXISTS "rooms readable by anyone"     ON public.rooms;
CREATE POLICY "rooms readable by anyone"
  ON public.rooms FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admins manage rooms" ON public.rooms;
CREATE POLICY "admins manage rooms"
  ON public.rooms FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- purposes: same.
DROP POLICY IF EXISTS "purposes readable when signed in" ON public.purposes;
DROP POLICY IF EXISTS "purposes readable by anyone"       ON public.purposes;
CREATE POLICY "purposes readable by anyone"
  ON public.purposes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admins manage purposes" ON public.purposes;
CREATE POLICY "admins manage purposes"
  ON public.purposes FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- visitor_types: same.
DROP POLICY IF EXISTS "visitor_types readable when signed in" ON public.visitor_types;
DROP POLICY IF EXISTS "visitor_types readable by anyone"      ON public.visitor_types;
CREATE POLICY "visitor_types readable by anyone"
  ON public.visitor_types FOR SELECT USING (TRUE);

-- users: own row + admin visibility. Self-insert for anyone whose profile
-- is missing and self-update for the visitor's own row.
DROP POLICY IF EXISTS "users read own row" ON public.users;
CREATE POLICY "users read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "users update own row" ON public.users;
CREATE POLICY "users update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users insert own row" ON public.users;
CREATE POLICY "users insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'visitor');
DROP POLICY IF EXISTS "admins insert users" ON public.users;
CREATE POLICY "admins insert users"
  ON public.users FOR INSERT
  WITH CHECK (is_admin());

-- clock_in_records: open / close your own; admins manage all.
DROP POLICY IF EXISTS "read own attendance" ON public.clock_in_records;
CREATE POLICY "read own attendance"
  ON public.clock_in_records FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "open own attendance" ON public.clock_in_records;
CREATE POLICY "open own attendance"
  ON public.clock_in_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "close own open attendance" ON public.clock_in_records;
CREATE POLICY "close own open attendance"
  ON public.clock_in_records FOR UPDATE
  USING (auth.uid() = user_id AND time_out IS NULL)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins manage attendance" ON public.clock_in_records;
CREATE POLICY "admins manage attendance"
  ON public.clock_in_records FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- room_visits: same shape.
DROP POLICY IF EXISTS "read own presence" ON public.room_visits;
CREATE POLICY "read own presence"
  ON public.room_visits FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "create own presence" ON public.room_visits;
CREATE POLICY "create own presence"
  ON public.room_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "close own presence" ON public.room_visits;
CREATE POLICY "close own presence"
  ON public.room_visits FOR UPDATE
  USING (auth.uid() = user_id AND exited_at IS NULL)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins manage presence" ON public.room_visits;
CREATE POLICY "admins manage presence"
  ON public.room_visits FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- One open attendance row per user. Refuses to build if duplicates already
-- exist; resolution of those is a human decision.
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
      'Cannot create clock_in_one_open_per_user: % user(s) already have more than one open attendance row. Inspect with: SELECT user_id, id, time_in FROM public.clock_in_records WHERE time_out IS NULL ORDER BY user_id, time_in DESC; then close the stale rows (set time_out) and re-run this script.',
      dup_users;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS clock_in_one_open_per_user
  ON public.clock_in_records (user_id)
  WHERE time_out IS NULL;


-- ----------------------------------------------------------------------------
-- 9. Seed the rooms
-- ----------------------------------------------------------------------------
-- These qr_value strings are what gets printed on each door and what the
-- scanner matches. The format is documented in lib/wayfinding.ts:
--   HYT-ROOM-01:ROOM-<number>   (colon separator)
-- Idempotent: re-running leaves the rows as they were.

INSERT INTO public.rooms (room_number, name, floor, qr_value) VALUES
  ('Room 201', 'Tech Room 201', '2', 'HYT-ROOM-01:ROOM-201'),
  ('Room 202', 'Tech Room 202', '2', 'HYT-ROOM-01:ROOM-202'),
  ('Room 301', 'Room 301',      '3', 'HYT-ROOM-01:ROOM-301'),
  ('Room 302', 'Room 302',      '3', 'HYT-ROOM-01:ROOM-302'),
  ('Room 303', 'Room 303',      '3', 'HYT-ROOM-01:ROOM-303'),
  ('Room 304', 'Room 304',      '3', 'HYT-ROOM-01:ROOM-304'),
  ('Room 401', 'Room 401',      '4', 'HYT-ROOM-01:ROOM-401'),
  ('Room 402', 'Room 402',      '4', 'HYT-ROOM-01:ROOM-402'),
  ('Room 403', 'Room 403',      '4', 'HYT-ROOM-01:ROOM-403'),
  ('Room 404', 'Room 404',      '4', 'HYT-ROOM-01:ROOM-404'),
  ('Roofdeck', 'Roofdeck',      'Roof', 'HYT-ROOM-01:ROOFDECK')
ON CONFLICT (room_number) DO UPDATE
  SET name     = EXCLUDED.name,
      floor    = EXCLUDED.floor,
      qr_value = EXCLUDED.qr_value;


-- ----------------------------------------------------------------------------
-- 10. Confirm the end state
-- ----------------------------------------------------------------------------
-- After running, this should print 11 rooms, 8 purposes, 7 visitor_types.

SELECT 'rooms' AS table_name, COUNT(*) AS rows FROM public.rooms
UNION ALL
SELECT 'purposes',       COUNT(*) FROM public.purposes
UNION ALL
SELECT 'visitor_types',  COUNT(*) FROM public.visitor_types;
