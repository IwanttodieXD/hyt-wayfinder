-- HYT Global / Wayfinder: canonical fresh-database schema
--
-- Run this once in the Supabase SQL Editor for a NEW/EMPTY project after
-- Supabase has initialized its auth schema. This creates the current app schema,
-- grants, RLS policies, helper functions, and non-personal lookup data.
--
-- IMPORTANT:
--   * This is a fresh-install script, not a migration or a safe reset script.
--   * It does not DROP existing tables or erase existing data.
--   * It intentionally does not contain visitor/student roster data or
--     credentials. Load approved roster data separately through a secure,
--     reviewed process.
--   * Keep SUPABASE_SERVICE_ROLE_KEY server-side only.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'trainer', 'trainee', 'visitor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.orientation_status AS ENUM ('approved', 'declined', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  floor       TEXT NOT NULL CHECK (floor IN ('G', '2', '3', '4', 'Roof')),
  building    TEXT NOT NULL DEFAULT 'HYT-Business Center',
  qr_value    TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rooms_floor_idx ON public.rooms (floor) WHERE is_active;
CREATE INDEX IF NOT EXISTS rooms_active_idx ON public.rooms (is_active);

CREATE TABLE IF NOT EXISTS public.purposes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visitor_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  room_id    UUID REFERENCES public.rooms(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS courses_room_idx ON public.courses (room_id) WHERE room_id IS NOT NULL;

-- A visitor profile is linked to Supabase Auth. Visitors use the verification
-- flow; the server provisions/reuses the linked Auth identity when approved.
CREATE TABLE IF NOT EXISTS public.users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT UNIQUE,
  name             TEXT NOT NULL,
  role             public.user_role NOT NULL DEFAULT 'visitor',
  archived_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visitor_type_id  UUID REFERENCES public.visitor_types(id) ON DELETE SET NULL,
  company          TEXT,
  host_name        TEXT,
  phone            TEXT,
  valid_until       TIMESTAMPTZ DEFAULT (date_trunc('day', NOW()) + INTERVAL '1 day' - INTERVAL '1 second'),
  notes            TEXT,
  pending_room_id  UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  pending_purpose_id UUID REFERENCES public.purposes(id) ON DELETE SET NULL,
  course_id        UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  orientation_status public.orientation_status NOT NULL DEFAULT 'pending',
  first_name       TEXT,
  middle_name      TEXT,
  middle_initial   TEXT,
  last_name        TEXT,
  name_extension   TEXT
);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_active_idx ON public.users (archived_at);
CREATE INDEX IF NOT EXISTS users_visitor_type_idx ON public.users (visitor_type_id);
CREATE INDEX IF NOT EXISTS users_valid_until_idx ON public.users (valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_course_idx ON public.users (course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_orientation_status_idx ON public.users (orientation_status);
CREATE INDEX IF NOT EXISTS users_first_last_idx ON public.users (lower(first_name), lower(last_name));
CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_idx ON public.users ((TRUE)) WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS public.clock_in_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  room_id     UUID REFERENCES public.rooms(id) ON DELETE RESTRICT,
  purpose_id  UUID REFERENCES public.purposes(id) ON DELETE RESTRICT,
  time_in     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out    TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN time_out IS NULL THEN NULL
      ELSE FLOOR(EXTRACT(EPOCH FROM (time_out - time_in)) / 60)::INT
    END
  ) STORED,
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN time_out IS NULL THEN 'active' ELSE 'completed' END
  ) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clock_in_time_order CHECK (time_out IS NULL OR time_out >= time_in)
);
CREATE INDEX IF NOT EXISTS clock_in_user_idx ON public.clock_in_records (user_id);
CREATE INDEX IF NOT EXISTS clock_in_room_idx ON public.clock_in_records (room_id);
CREATE INDEX IF NOT EXISTS clock_in_purpose_idx ON public.clock_in_records (purpose_id);
CREATE INDEX IF NOT EXISTS clock_in_time_in_idx ON public.clock_in_records (time_in DESC);
CREATE UNIQUE INDEX IF NOT EXISTS clock_in_one_open_per_user
  ON public.clock_in_records (user_id) WHERE time_out IS NULL;

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
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NULL THEN 'inside' ELSE 'left' END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_visit_time_order CHECK (exited_at IS NULL OR exited_at >= entered_at)
);
CREATE INDEX IF NOT EXISTS room_visits_user_idx ON public.room_visits (user_id);
CREATE INDEX IF NOT EXISTS room_visits_room_idx ON public.room_visits (room_id);
CREATE INDEX IF NOT EXISTS room_visits_clock_in_idx ON public.room_visits (clock_in_id);
CREATE INDEX IF NOT EXISTS room_visits_entered_idx ON public.room_visits (entered_at DESC);
CREATE INDEX IF NOT EXISTS room_visits_open_idx ON public.room_visits (room_id) WHERE exited_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS room_visits_one_open_per_user
  ON public.room_visits (user_id) WHERE exited_at IS NULL;

DROP TRIGGER IF EXISTS rooms_touch_updated_at ON public.rooms;
CREATE TRIGGER rooms_touch_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS users_touch_updated_at ON public.users;
CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS clock_in_touch_updated_at ON public.clock_in_records;
CREATE TRIGGER clock_in_touch_updated_at BEFORE UPDATE ON public.clock_in_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND archived_at IS NULL
  );
$$;

-- Supabase Auth creates a matching profile for newly created Auth identities.
-- ON CONFLICT permits the verification endpoint to provision Auth for an
-- already-imported visitor profile using that profile's existing UUID.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
    'visitor'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Anonymous identification lookup for the verification endpoint. This function
-- only resolves a roster match and its approval state; the server endpoint is
-- responsible for deciding access and establishing the Supabase session.
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, UUID);
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, TEXT, UUID);
CREATE FUNCTION public.verify_visitor(
  p_first_name TEXT,
  p_last_name TEXT,
  p_course_id UUID
)
RETURNS TABLE (
  id UUID,
  orientation_status public.orientation_status,
  full_name TEXT,
  programme TEXT,
  course_id UUID,
  email TEXT,
  has_email BOOLEAN,
  recognized BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.orientation_status,
    u.name,
    c.label,
    u.course_id,
    u.email,
    (u.email IS NOT NULL),
    (
      u.orientation_status = 'approved'
      OR (
        u.orientation_status = 'pending'
        AND EXISTS (
          SELECT 1 FROM auth.users a
          WHERE a.id = u.id AND a.last_sign_in_at IS NOT NULL
        )
      )
    )
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE u.course_id = p_course_id
    AND u.archived_at IS NULL
    AND (
      (lower(btrim(u.first_name)) = lower(btrim(p_first_name))
       AND lower(btrim(u.last_name)) = lower(btrim(p_last_name)))
      OR
      (u.first_name IS NULL AND u.last_name IS NULL
       AND lower(split_part(btrim(u.name), ' ', 1)) = lower(btrim(p_first_name))
       AND lower(reverse(split_part(reverse(btrim(u.name)), ' ', 1))) = lower(btrim(p_last_name)))
    );
$$;
REVOKE ALL ON FUNCTION public.verify_visitor(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_visitor(TEXT, TEXT, UUID) TO anon, authenticated;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visits ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.rooms, public.purposes, public.visitor_types, public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms, public.purposes, public.visitor_types, public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users, public.clock_in_records, public.room_visits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users, public.clock_in_records, public.room_visits,
  public.rooms, public.purposes, public.visitor_types, public.courses TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Only allow visitors to close their own open records, not rewrite historical
-- timestamps, user IDs, or room assignments.
REVOKE UPDATE ON public.clock_in_records FROM authenticated;
GRANT UPDATE (time_out) ON public.clock_in_records TO authenticated;
REVOKE UPDATE ON public.room_visits FROM authenticated;
GRANT UPDATE (exited_at) ON public.room_visits TO authenticated;

DROP POLICY IF EXISTS "rooms readable by anyone" ON public.rooms;
CREATE POLICY "rooms readable by anyone" ON public.rooms FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admins manage rooms" ON public.rooms;
CREATE POLICY "admins manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "purposes readable by anyone" ON public.purposes;
CREATE POLICY "purposes readable by anyone" ON public.purposes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "admins manage purposes" ON public.purposes;
CREATE POLICY "admins manage purposes" ON public.purposes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "visitor_types readable by anyone" ON public.visitor_types;
CREATE POLICY "visitor_types readable by anyone" ON public.visitor_types FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "visitor_types manageable by admins" ON public.visitor_types;
CREATE POLICY "visitor_types manageable by admins" ON public.visitor_types FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses readable by anyone" ON public.courses;
CREATE POLICY "courses readable by anyone" ON public.courses FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "courses manageable by admins" ON public.courses;
CREATE POLICY "courses manageable by admins" ON public.courses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users read own row" ON public.users;
CREATE POLICY "users read own row" ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "users update own row" ON public.users;
CREATE POLICY "users update own row" ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users insert own row" ON public.users;
CREATE POLICY "users insert own row" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'visitor');
DROP POLICY IF EXISTS "admins insert users" ON public.users;
CREATE POLICY "admins insert users" ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "read own attendance" ON public.clock_in_records;
CREATE POLICY "read own attendance" ON public.clock_in_records FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "open own attendance" ON public.clock_in_records;
CREATE POLICY "open own attendance" ON public.clock_in_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "close own open attendance" ON public.clock_in_records;
CREATE POLICY "close own open attendance" ON public.clock_in_records FOR UPDATE
  USING (auth.uid() = user_id AND time_out IS NULL) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins manage attendance" ON public.clock_in_records;
CREATE POLICY "admins manage attendance" ON public.clock_in_records FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "read own presence" ON public.room_visits;
CREATE POLICY "read own presence" ON public.room_visits FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "create own presence" ON public.room_visits;
CREATE POLICY "create own presence" ON public.room_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "close own presence" ON public.room_visits;
CREATE POLICY "close own presence" ON public.room_visits FOR UPDATE
  USING (auth.uid() = user_id AND exited_at IS NULL) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins manage presence" ON public.room_visits;
CREATE POLICY "admins manage presence" ON public.room_visits FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Non-personal lookup defaults. Edit these rows to match the building and
-- active programmes. No visitor/student roster is bundled in this script.
INSERT INTO public.purposes (label) VALUES
  ('Interview'), ('Orientation'), ('Meeting'), ('Training'),
  ('Consultation'), ('Maintenance'), ('Delivery'), ('Other')
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.visitor_types (label, is_primary) VALUES
  ('Trainee', TRUE), ('Trainer', TRUE), ('VIP', TRUE), ('Guest', FALSE),
  ('Contractor', FALSE), ('Intern', FALSE), ('Observer', FALSE)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.courses (label) VALUES
  ('Barista NC II'), ('Event Management Services NC II'),
  ('Housekeeping NC II'), ('Hilot (Wellness) Services NC II'),
  ('Massage NC II')
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.rooms (room_number, name, floor, qr_value) VALUES
  ('Room 201', 'Tech Room 201', '2', 'HYT-ROOM-01:ROOM-201'),
  ('Room 202', 'Tech Room 202', '2', 'HYT-ROOM-01:ROOM-202'),
  ('Room 301', 'Room 301', '3', 'HYT-ROOM-01:ROOM-301'),
  ('Room 302', 'Room 302', '3', 'HYT-ROOM-01:ROOM-302'),
  ('Room 303', 'Room 303', '3', 'HYT-ROOM-01:ROOM-303'),
  ('Room 304', 'Room 304', '3', 'HYT-ROOM-01:ROOM-304'),
  ('Room 401', 'Room 401', '4', 'HYT-ROOM-01:ROOM-401'),
  ('Room 402', 'Room 402', '4', 'HYT-ROOM-01:ROOM-402'),
  ('Room 403', 'Room 403', '4', 'HYT-ROOM-01:ROOM-403'),
  ('Room 404', 'Room 404', '4', 'HYT-ROOM-01:ROOM-404'),
  ('Roofdeck', 'Roofdeck', 'Roof', 'HYT-ROOM-01:ROOFDECK')
ON CONFLICT (room_number) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
