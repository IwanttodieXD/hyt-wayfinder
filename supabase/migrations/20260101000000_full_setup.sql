-- ============================================================================
-- HYT Wayfinder - complete database setup (single migration)
-- ============================================================================
--
-- This is the ONLY migration needed for a fresh Supabase project. It creates
-- the complete schema, functions, RLS policies, grants, and seed data in one
-- pass. It supersedes the old 20260101000001 ... 20260101000021 migrations and
-- supabase/seed.sql; do not run those files as well.
--
-- WHERE TO RUN IT
-- ---------------
-- Supabase Dashboard -> SQL Editor -> New query. The script uses auth.users,
-- auth.uid() and auth.role(), so it must run inside a Supabase project, not on
-- a plain Postgres database.
--
-- PREREQUISITES
-- -------------
-- Supabase enables the uuid-ossp and pgcrypto extensions by default. If you
-- are on a project where they were removed, enable them first:
--
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
--   CREATE EXTENSION IF NOT EXISTS pgcrypto      WITH SCHEMA extensions;
--
-- WHAT IT CREATES
-- ---------------
--   * user_role and orientation_status enums
--   * rooms, purposes, visitor_types, courses, users, clock_in_records,
--     room_visits
--   * generated duration/status columns, integrity constraints and indexes
--   * is_admin(), handle_new_user(), verify_visitor(),
--     orientation_status_for()
--   * RLS policies and table/column grants for anon, authenticated and
--     service_role
--   * reference data: purposes, visitor types, courses, 11 rooms
--   * the 131-person orientation roster (auth logins + profile rows)
--
-- AFTER RUNNING
-- -------------
--   1. Promote your first administrator (see the end of this file).
--   2. If the REST API does not see the new tables, run:
--        NOTIFY pgrst, 'reload schema';
--
-- The script is intentionally written to be safe to re-run on the same
-- database: tables use IF NOT EXISTS, columns use ADD COLUMN IF NOT EXISTS,
-- reference rows use ON CONFLICT, and policies are dropped before creation.
-- ============================================================================


-- ============================================================================
-- 1. Enums
-- ============================================================================

DO $$
BEGIN
  -- System permission level. Only 'admin' and 'visitor' are written by the
  -- application. 'trainer' and 'trainee' are retired but remain declared
  -- because Postgres cannot remove an enum label without rebuilding the type,
  -- and public.users.role is the column all attendance history hangs off.
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'user_role' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'trainer', 'trainee', 'visitor');
  END IF;

  -- Orientation verdict used by the entrance verification flow.
  --   approved - cleared to enter
  --   declined - did not attend / did not pass
  --   pending  - not evaluated yet; the default for self-registration
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'orientation_status' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.orientation_status AS ENUM ('approved', 'declined', 'pending');
  END IF;
END
$$;


-- ============================================================================
-- 2. updated_at helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rooms - single source of truth for every room in the building
-- ----------------------------------------------------------------------------
-- Nothing stores a room name as free text. Attendance and presence rows hold a
-- room_id and join back here. qr_value is what is printed on the door; it is
-- unique, so two doors can never scan identically.
CREATE TABLE IF NOT EXISTS public.rooms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number  TEXT NOT NULL UNIQUE,          -- 'Room 304', 'Roofdeck'
  name         TEXT NOT NULL,                 -- display name shown to people
  floor        TEXT NOT NULL,                 -- 'G' | '2' | '3' | '4' | 'Roof'
  building     TEXT NOT NULL DEFAULT 'HYT-Business Center',
  qr_value     TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rooms_floor_check CHECK (floor IN ('G', '2', '3', '4', 'Roof'))
);


-- ----------------------------------------------------------------------------
-- purposes - why someone is in the building on a given visit
-- ----------------------------------------------------------------------------
-- A lookup table rather than an enum: the list grows with the institute.
CREATE TABLE IF NOT EXISTS public.purposes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,            -- 'Interview', 'Orientation'
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- visitor_types - how a visitor relates to the building
-- ----------------------------------------------------------------------------
-- Descriptive only. Every visitor type has identical permissions; the column
-- exists so the front desk can distinguish trainees, trainers, VIPs, etc.
CREATE TABLE IF NOT EXISTS public.visitor_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  -- Marks the handful worth surfacing as tiles on the register form / filters.
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- courses - the catalogue of programmes a visitor can be enrolled in
-- ----------------------------------------------------------------------------
-- room_id is the default room for a course. It is NOT the authoritative room
-- for a visit: clock_in_records.room_id still records where the person
-- actually went. An explicit pending_room_id / manual choice always wins.
CREATE TABLE IF NOT EXISTS public.courses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  room_id    UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- users - profile row, one per Supabase Auth user
-- ----------------------------------------------------------------------------
-- id matches auth.users.id. Supabase Auth owns the password; this table owns
-- the profile. Email is nullable in the final schema: 23 orientation roster
-- rows had no usable address, and NULL states that honestly. A UNIQUE column
-- permits multiple NULLs, so nobody can share an address.
--
-- `name` remains the canonical display string. The name-part columns are what
-- the forms read/write and what the entrance check matches on; `name` is NOT
-- recomputed from them, because the roster stores full middle names while the
-- forms collect only an initial.
CREATE TABLE IF NOT EXISTS public.users (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT UNIQUE,
  name               TEXT NOT NULL,
  role               public.user_role NOT NULL DEFAULT 'visitor',

  -- Soft delete. Attendance history survives someone leaving, so rows are
  -- archived rather than removed. Filter on archived_at IS NULL for "current".
  archived_at        TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Descriptive visitor fields. All nullable and free of behaviour.
  visitor_type_id    UUID REFERENCES public.visitor_types(id) ON DELETE SET NULL,
  company            TEXT,
  host_name          TEXT,
  phone              TEXT,
  valid_until        TIMESTAMPTZ DEFAULT (
    date_trunc('day', now()) + interval '1 day' - interval '1 second'
  ),
  notes              TEXT,

  -- What the visitor is EXPECTED to do on arrival. The real room/purpose are
  -- written to clock_in_records at check-in, one row per visit.
  pending_room_id    UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  pending_purpose_id UUID REFERENCES public.purposes(id) ON DELETE SET NULL,

  course_id          UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  orientation_status public.orientation_status NOT NULL DEFAULT 'pending',

  -- Name parts. middle_initial is a bare upper-case letter, no period.
  first_name         TEXT,
  middle_name        TEXT,
  middle_initial     TEXT,
  name_extension     TEXT,
  last_name          TEXT
);


-- ----------------------------------------------------------------------------
-- clock_in_records - ATTENDANCE. Ground floor code only.
-- ----------------------------------------------------------------------------
-- "Was this person in the building, and for how long." One row per visit. Room
-- codes must never write here; that is room_visits' job.
CREATE TABLE IF NOT EXISTS public.clock_in_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  room_id     UUID REFERENCES public.rooms(id) ON DELETE RESTRICT,
  purpose_id  UUID REFERENCES public.purposes(id) ON DELETE RESTRICT,

  time_in     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out    TIMESTAMPTZ,

  -- Derived. Postgres rejects NOW() in a generated column (not immutable), so
  -- duration stays NULL while the visit is open and the app shows a live timer.
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN time_out IS NULL THEN NULL
         ELSE FLOOR(EXTRACT(EPOCH FROM (time_out - time_in)) / 60)::INT
    END
  ) STORED,

  status      TEXT GENERATED ALWAYS AS (
    CASE WHEN time_out IS NULL THEN 'active' ELSE 'completed' END
  ) STORED,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clock_in_time_order CHECK (time_out IS NULL OR time_out >= time_in)
);


-- ----------------------------------------------------------------------------
-- room_visits - PRESENCE. Room door codes only.
-- ----------------------------------------------------------------------------
-- Append-only: a scan opens a row, the next scan closes it. Never affects
-- attendance. A person can be in at most one room at a time, enforced by the
-- partial unique index below.
CREATE TABLE IF NOT EXISTS public.room_visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  -- Links this room entry to the attendance visit it happened under.
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


-- ============================================================================
-- 4. Columns added by later migrations
-- ============================================================================
-- These are already present in the CREATE TABLE statements above. The ALTERs
-- make this file safe to apply to a database created by an older migration
-- set; on a fresh database they are no-ops.

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
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS orientation_status
  public.orientation_status NOT NULL DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS middle_initial TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name_extension TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS room_id UUID
  REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Pass expiry: a DEFAULT, not a constraint. It applies only when a writer
-- omits the column, so an admin can still grant a long pass by sending an
-- explicit date (or NULL for "never expires").
ALTER TABLE public.users
  ALTER COLUMN valid_until SET DEFAULT (
    date_trunc('day', now()) + interval '1 day' - interval '1 second'
  );

-- NULL means "no usable address on file"; it does not mean "never expires".
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN public.users.email IS
  'Nullable. NULL means no usable address is on file, so this person cannot '
  'sign in until the registrar supplies one. verify_visitor returns '
  'has_email=false for these and /verify sends them to the front desk.';
COMMENT ON COLUMN public.users.first_name IS
  'Given name. Backfilled from the first word of name when absent; written by '
  'the registration and admin forms.';
COMMENT ON COLUMN public.users.middle_initial IS
  'Single upper-case letter, or NULL when there is no middle name. No period.';
COMMENT ON COLUMN public.users.last_name IS
  'Surname. Backfilled from the last word of name when absent.';


-- ============================================================================
-- 5. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS rooms_floor_idx ON public.rooms (floor) WHERE is_active;
CREATE INDEX IF NOT EXISTS rooms_active_idx ON public.rooms (is_active);

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_active_idx ON public.users (archived_at);
CREATE INDEX IF NOT EXISTS users_visitor_type_idx ON public.users (visitor_type_id);
CREATE INDEX IF NOT EXISTS users_valid_until_idx ON public.users (valid_until)
  WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_course_idx ON public.users (course_id)
  WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_orientation_status_idx
  ON public.users (orientation_status);
CREATE INDEX IF NOT EXISTS users_first_last_idx
  ON public.users (lower(first_name), lower(last_name));

CREATE INDEX IF NOT EXISTS courses_room_idx ON public.courses (room_id)
  WHERE room_id IS NOT NULL;

-- Postgres does NOT index foreign keys automatically.
CREATE INDEX IF NOT EXISTS clock_in_user_idx    ON public.clock_in_records (user_id);
CREATE INDEX IF NOT EXISTS clock_in_room_idx    ON public.clock_in_records (room_id);
CREATE INDEX IF NOT EXISTS clock_in_purpose_idx ON public.clock_in_records (purpose_id);
CREATE INDEX IF NOT EXISTS clock_in_time_in_idx ON public.clock_in_records (time_in DESC);
-- Serves "who is in the building right now".
CREATE INDEX IF NOT EXISTS clock_in_open_idx    ON public.clock_in_records (user_id)
  WHERE time_out IS NULL;

CREATE INDEX IF NOT EXISTS room_visits_user_idx     ON public.room_visits (user_id);
CREATE INDEX IF NOT EXISTS room_visits_room_idx     ON public.room_visits (room_id);
CREATE INDEX IF NOT EXISTS room_visits_clock_in_idx ON public.room_visits (clock_in_id);
CREATE INDEX IF NOT EXISTS room_visits_entered_idx  ON public.room_visits (entered_at DESC);
-- Serves "who is in this room right now".
CREATE INDEX IF NOT EXISTS room_visits_open_idx     ON public.room_visits (room_id)
  WHERE exited_at IS NULL;

-- A double-tap on the entrance code, or a second device, must not open two
-- concurrent attendance rows. Refuses to build if duplicates already exist;
-- resolving which row is real is a human decision.
CREATE UNIQUE INDEX IF NOT EXISTS clock_in_one_open_per_user
  ON public.clock_in_records (user_id)
  WHERE time_out IS NULL;

-- A person can be in at most one room at a time. Scanning a new door closes
-- the previous open row first; a race fails loudly instead of double-counting.
CREATE UNIQUE INDEX IF NOT EXISTS room_visits_one_open_per_user
  ON public.room_visits (user_id)
  WHERE exited_at IS NULL;

-- The 'trainer' and 'trainee' roles granted nothing that 'visitor' did not.
-- The application only writes 'admin' and 'visitor'; normalise any rows that
-- still carry a retired label. The enum labels stay declared because Postgres
-- cannot drop them without rebuilding the type.
UPDATE public.users
SET role = 'visitor'
WHERE role IN ('trainer', 'trainee');

-- Exactly one administrator. The front desk does not need a list of admins,
-- and a second admin is a liability: anyone who can edit users could grant
-- themselves the keys. Oldest wins if more than one exists.
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


-- ============================================================================
-- 6. Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS rooms_touch_updated_at ON public.rooms;
CREATE TRIGGER rooms_touch_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS users_touch_updated_at ON public.users;
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS clock_in_touch_updated_at ON public.clock_in_records;
CREATE TRIGGER clock_in_touch_updated_at
  BEFORE UPDATE ON public.clock_in_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 7. Reference data
-- ============================================================================

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

INSERT INTO public.visitor_types (label, is_primary) VALUES
  ('Trainee', TRUE),
  ('Trainer', TRUE),
  ('VIP', TRUE),
  ('Guest', FALSE),
  ('Contractor', FALSE),
  ('Intern', FALSE),
  ('Observer', FALSE)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.courses (label) VALUES
  ('Orientation'),
  ('Safety Training'),
  ('Leadership'),
  ('Technical Skills'),
  ('Onboarding'),
  ('Barista NC II'),
  ('Event Management Services NC II'),
  ('Housekeeping NC II'),
  ('Hilot (Wellness) Services NC II'),
  ('Massage NC II')
ON CONFLICT (label) DO NOTHING;

-- The 11 rooms. qr_value is what gets printed on each door; the room number is
-- encoded in it so a code stays readable even if the display name changes.
-- Format: HYT-ROOM-01:ROOM-<number> (see lib/wayfinding.ts).
INSERT INTO public.rooms (room_number, name, floor, qr_value) VALUES
  ('Room 201', 'Tech Room 201', '2',    'HYT-ROOM-01:ROOM-201'),
  ('Room 202', 'Tech Room 202', '2',    'HYT-ROOM-01:ROOM-202'),
  ('Room 301', 'Room 301',      '3',    'HYT-ROOM-01:ROOM-301'),
  ('Room 302', 'Room 302',      '3',    'HYT-ROOM-01:ROOM-302'),
  ('Room 303', 'Room 303',      '3',    'HYT-ROOM-01:ROOM-303'),
  ('Room 304', 'Room 304',      '3',    'HYT-ROOM-01:ROOM-304'),
  ('Room 401', 'Room 401',      '4',    'HYT-ROOM-01:ROOM-401'),
  ('Room 402', 'Room 402',      '4',    'HYT-ROOM-01:ROOM-402'),
  ('Room 403', 'Room 403',      '4',    'HYT-ROOM-01:ROOM-403'),
  ('Room 404', 'Room 404',      '4',    'HYT-ROOM-01:ROOM-404'),
  ('Roofdeck', 'Roofdeck',      'Roof', 'HYT-ROOM-01:ROOFDECK')
ON CONFLICT (room_number) DO UPDATE
  SET name     = EXCLUDED.name,
      floor    = EXCLUDED.floor,
      qr_value = EXCLUDED.qr_value;

-- Default room per course. Matched by rooms.room_number, which is what the app
-- resolves with getRoomByNumber - NOT the display name. A pair whose course
-- label or room number does not exist is silently skipped.
--
-- Note: the room seed above has no 'Room 101', so the Hilot and Massage
-- mappings only take effect after an admin creates that room. "Events" in the
-- original 0018 was a typo for "Event"; it is corrected here so the Event
-- Management course actually maps.
UPDATE public.courses c
SET room_id = r.id
FROM (VALUES
  ('Barista NC II',                    'Roofdeck'),
  ('Event Management Services NC II',  'Room 403'),
  ('Hilot (Wellness) Services NC II',  'Room 101'),
  ('Massage NC II',                    'Room 101'),
  ('Housekeeping NC II',               'Room 201')
) AS m(course_label, room_number)
JOIN public.rooms r ON r.room_number = m.room_number
WHERE c.label = m.course_label;


-- ============================================================================
-- 8. Functions
-- ============================================================================

-- Admin is checked against public.users rather than JWT claims, so a role
-- change takes effect immediately instead of waiting for the token to refresh.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND archived_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- Create a profile row automatically when an auth user is created. SECURITY
-- DEFINER because the inserting role is supabase_auth_admin, which has no
-- grants on public.users.
--
-- The role is hardcoded to 'visitor' and deliberately ignores raw_user_meta_data
-- roles: self-registration must never be able to mint an admin. Elevated roles
-- are granted by an admin through /admin/users.
--
-- ON CONFLICT (id) DO NOTHING is essential: /verify may create a login for an
-- imported roster profile whose row already exists, and that must not abort
-- with a primary-key violation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Visitor'
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

-- Backfill any profile rows that predate the trigger (for example, accounts
-- created while an older schema was in place). On a fresh database this is a
-- no-op.
INSERT INTO public.users (id, email, name, role)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    NULLIF(split_part(au.email, '@', 1), ''),
    'Visitor'
  ),
  'visitor'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- verify_visitor - IDENTIFICATION ONLY, never authentication
-- ----------------------------------------------------------------------------
-- Resolves a first + last name and a course to an orientation record so the UI
-- can show a verdict. It does NOT create a session: the session is established
-- by the magic link sent to the address on file. It returns EVERY match, and
-- the caller MUST refuse when there is more than one; picking one would show a
-- stranger another visitor's verdict.
--
-- Matches users.first_name / users.last_name, falling back to the first and
-- last word of users.name for rows the backfill skipped. `recognized` is true
-- when the row is approved, or pending but the linked auth login has signed in
-- before. `declined` is never recognized. Archived rows are excluded.
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, UUID);
DROP FUNCTION IF EXISTS public.verify_visitor(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.verify_visitor(
  p_first_name TEXT,
  p_last_name  TEXT,
  p_course_id  UUID
)
RETURNS TABLE (
  id                 UUID,
  orientation_status public.orientation_status,
  full_name          TEXT,
  programme          TEXT,
  course_id          UUID,
  email              TEXT,
  -- False when the roster gave this person no address. The caller MUST NOT
  -- promise a sign-in link it cannot deliver; route them to the front desk.
  has_email          BOOLEAN,
  recognized         BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
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
           WHERE a.id = u.id
             AND a.last_sign_in_at IS NOT NULL
        )
      )
    )
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE u.course_id = p_course_id
    AND u.archived_at IS NULL
    AND (
      -- Normal case: the split columns are populated.
      (
        lower(btrim(u.first_name)) = lower(btrim(p_first_name))
        AND lower(btrim(u.last_name)) = lower(btrim(p_last_name))
      )
      OR
      -- Safety net for a row the backfill skipped (both parts still NULL).
      (
        u.first_name IS NULL
        AND u.last_name IS NULL
        AND lower(split_part(btrim(u.name), ' ', 1)) = lower(btrim(p_first_name))
        AND lower(reverse(split_part(reverse(btrim(u.name)), ' ', 1)))
              = lower(btrim(p_last_name))
      )
    );
$$;

COMMENT ON FUNCTION public.verify_visitor(TEXT, TEXT, UUID) IS
  'IDENTIFICATION ONLY - resolves a first + last name and a course to an '
  'orientation record. Matches users.first_name / users.last_name, falling back '
  'to the first and last word of users.name for rows where those are NULL. Does '
  'not create a session. Returns EVERY match (the caller refuses ambiguity). '
  'has_email is false when no address is on file; recognized is approved, or '
  'pending but already signed in before, and never true for declined.';

REVOKE ALL ON FUNCTION public.verify_visitor(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_visitor(TEXT, TEXT, UUID)
  TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- orientation_status_for - verdict lookup by email
-- ----------------------------------------------------------------------------
-- Used by the public entrance page. SECURITY DEFINER means callers can
-- enumerate cohort membership by guessing addresses; that is accepted because
-- this returns only a verdict and display name, never a session.
CREATE OR REPLACE FUNCTION public.orientation_status_for(p_email TEXT)
RETURNS TABLE (
  orientation_status public.orientation_status,
  full_name         TEXT,
  programme         TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.orientation_status,
    u.name,
    c.label
  FROM public.users u
  LEFT JOIN public.courses c ON c.id = u.course_id
  WHERE lower(u.email) = lower(btrim(p_email))
    -- Archived rows are excluded deliberately: a left-behind account from a
    -- previous cohort must not surface as "approved" to a new owner.
    AND u.archived_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.orientation_status_for(TEXT) IS
  'Returns the orientation verdict for one email. SECURITY DEFINER: callers '
  'can enumerate cohort membership by guessing addresses. Returns no session.';

REVOKE ALL ON FUNCTION public.orientation_status_for(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.orientation_status_for(TEXT)
  TO anon, authenticated;


-- ============================================================================
-- 9. Table privileges
-- ============================================================================
-- RLS and GRANT are two separate gates. Without a table-level privilege,
-- Postgres rejects the statement with 42501 before any policy is evaluated.
-- Grants are deliberately narrow:
--   * No DELETE on users/attendance/presence: history is archived, not removed.
--   * rooms/purposes/visitor_types/courses are readable before sign-in, because
--     the registration form needs them.
--   * authenticated may only update the close-out timestamp on its own visit
--     rows (set below).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.rooms         TO anon, authenticated;
GRANT SELECT ON public.purposes      TO anon, authenticated;
GRANT SELECT ON public.visitor_types TO anon, authenticated;
GRANT SELECT ON public.courses       TO anon, authenticated;

GRANT INSERT, UPDATE ON public.rooms TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.purposes      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.visitor_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses       TO authenticated;

-- Profiles. No DELETE: accounts are archived, never removed.
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Attendance and presence. No DELETE, so a visit cannot be destroyed through
-- the API even by an admin.
GRANT SELECT, INSERT ON public.clock_in_records TO authenticated;
GRANT SELECT, INSERT ON public.room_visits      TO authenticated;

-- Least privilege on UPDATE: visitors may only set the close-out timestamp on
-- their own open visit/presence rows, not rewrite time_in / room_id.
REVOKE UPDATE ON public.clock_in_records FROM authenticated;
GRANT  UPDATE (time_out)  ON public.clock_in_records TO authenticated;
REVOKE UPDATE ON public.room_visits FROM authenticated;
GRANT  UPDATE (exited_at) ON public.room_visits      TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- service_role is used by /api/admin/users and /api/verify. It bypasses RLS,
-- so requireAdmin() in the route is the gate. Still no DELETE on history.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users             TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.clock_in_records  TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.room_visits       TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.rooms             TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.purposes          TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.visitor_types     TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ============================================================================
-- 10. Row Level Security
-- ============================================================================

ALTER TABLE public.rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visits      ENABLE ROW LEVEL SECURITY;

-- --- rooms ---------------------------------------------------------------
DROP POLICY IF EXISTS "rooms readable when signed in" ON public.rooms;
DROP POLICY IF EXISTS "rooms readable by anyone"     ON public.rooms;
CREATE POLICY "rooms readable by anyone"
  ON public.rooms FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "admins manage rooms" ON public.rooms;
CREATE POLICY "admins manage rooms"
  ON public.rooms FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- purposes ------------------------------------------------------------
DROP POLICY IF EXISTS "purposes readable when signed in" ON public.purposes;
DROP POLICY IF EXISTS "purposes readable by anyone"       ON public.purposes;
CREATE POLICY "purposes readable by anyone"
  ON public.purposes FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "admins manage purposes" ON public.purposes;
CREATE POLICY "admins manage purposes"
  ON public.purposes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- visitor_types -------------------------------------------------------
DROP POLICY IF EXISTS "visitor_types readable when signed in" ON public.visitor_types;
DROP POLICY IF EXISTS "visitor_types readable by anyone"      ON public.visitor_types;
CREATE POLICY "visitor_types readable by anyone"
  ON public.visitor_types FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "visitor_types manageable by admins" ON public.visitor_types;
CREATE POLICY "visitor_types manageable by admins"
  ON public.visitor_types FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- courses -------------------------------------------------------------
DROP POLICY IF EXISTS "courses readable by anyone" ON public.courses;
CREATE POLICY "courses readable by anyone"
  ON public.courses FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "courses manageable by admins" ON public.courses;
CREATE POLICY "courses manageable by admins"
  ON public.courses FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- users ---------------------------------------------------------------
DROP POLICY IF EXISTS "users read own row" ON public.users;
CREATE POLICY "users read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "users update own row" ON public.users;
CREATE POLICY "users update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fallback for a profile that is somehow absent. Scoped tightly: a user may
-- only insert a row for their own id, and only with the 'visitor' role, so this
-- cannot be used to grant anyone elevated access.
DROP POLICY IF EXISTS "users insert own row" ON public.users;
CREATE POLICY "users insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'visitor');

DROP POLICY IF EXISTS "admins insert users" ON public.users;
CREATE POLICY "admins insert users"
  ON public.users FOR INSERT
  WITH CHECK (is_admin());

-- No DELETE policy on purpose. Accounts are archived via archived_at, so
-- attendance history can never be destroyed through the API.

-- --- clock_in_records ----------------------------------------------------
DROP POLICY IF EXISTS "read own attendance" ON public.clock_in_records;
CREATE POLICY "read own attendance"
  ON public.clock_in_records FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "open own attendance" ON public.clock_in_records;
CREATE POLICY "open own attendance"
  ON public.clock_in_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the clock-out path is permitted: the row must still be open, and the
-- column grant above means only time_out can be written.
DROP POLICY IF EXISTS "close own open attendance" ON public.clock_in_records;
CREATE POLICY "close own open attendance"
  ON public.clock_in_records FOR UPDATE
  USING (auth.uid() = user_id AND time_out IS NULL)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage attendance" ON public.clock_in_records;
CREATE POLICY "admins manage attendance"
  ON public.clock_in_records FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- room_visits ---------------------------------------------------------
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
  USING (is_admin())
  WITH CHECK (is_admin());


-- ============================================================================
-- 11. Orientation cohort
-- ============================================================================
-- Seeds the 131 students from the last TESDA orientation so the QR flow can
-- gate entry. Every row starts 'pending'; flip the verdict afterwards, e.g.:
--
--   UPDATE public.users SET orientation_status = 'approved'
--    WHERE course_id = (SELECT id FROM public.courses WHERE label = 'Barista NC II');
--
-- Password for every seeded login: HytOrient2026!
-- Rotate it, or drop the auth rows and let each student register themselves,
-- before this reaches a real event.
--
-- The 23 rows whose source sheet had no usable email are given a synthetic
-- *.pending@orientation.hyt.local address so the auth row can be created; the
-- script sets both copies to NULL below, because a placeholder cannot receive
-- a sign-in link.
--
-- The temporary table keeps the roster in one place. It is dropped at the end
-- of this section.

DROP TABLE IF EXISTS _orientation_roster;
CREATE TEMP TABLE _orientation_roster (
  programme      TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  middle_name    TEXT,
  middle_initial TEXT,
  name_extension TEXT,
  email          TEXT NOT NULL
);

INSERT INTO _orientation_roster (
  programme, last_name, first_name, middle_name, middle_initial, name_extension, email
) VALUES
  ('Barista NC II', 'Aranda', 'Gemmalyn', 'Ocbina', 'O.', NULL, 'gemmaaranda05@gmail.com'),
  ('Barista NC II', 'Marquez', 'Prince Jhazkhie', 'Asis', 'A.', NULL, 'marquezprincejhazkie@gmail.com'),
  ('Barista NC II', 'Antalan', 'Mary Grace', 'Miclat', 'M.', NULL, 'maryysmiclat@gmail.com'),
  ('Barista NC II', 'Corsanes', 'Chryss Jericho', 'Nalla', 'N.', NULL, 'chryssjerichocorsanes12@gmail.com'),
  ('Barista NC II', 'Gardoce', 'Jeffrey', 'Antipuesto', 'A.', NULL, 'jefgardoce12@gmail.com'),
  ('Barista NC II', 'Ilagan', 'Jhay', NULL, NULL, NULL, 'jhaylynilagan532@gmail.com'),
  ('Barista NC II', 'Lucero', 'Ana Mae', 'Samentar', 'S.', NULL, 'lucero.ana.mae.pending@orientation.hyt.local'),
  ('Barista NC II', 'Sta. Romana', 'Richard', 'Bello', 'B.', NULL, 'staromanarichard@gmail.com'),
  ('Barista NC II', 'Onelongo', 'Veronica', 'Manapat', 'M.', NULL, 'vonelongo@gmail.com'),
  ('Barista NC II', 'Canes', 'Daniel', 'Manging', 'M.', NULL, 'canes.daniel.pending@orientation.hyt.local'),
  ('Barista NC II', 'Puntual', 'Judah', 'Aggabao', 'A.', NULL, 'judahpuntual7@gmail.com'),
  ('Barista NC II', 'Santos', 'Maui', 'Natalicio', 'M.', NULL, 'mauikengkay@gmail.com'),
  ('Barista NC II', 'Zuela', 'Jasmine Chlouie', 'Sapu-an', 'S.', NULL, 'zuelajasmine@gmail.com'),
  ('Barista NC II', 'Padilla', 'Gabrielle', 'Tagle', 'T.', NULL, 'padilla.gabrielle.pending@orientation.hyt.local'),
  ('Barista NC II', 'Casinto', 'Lance', 'Davocol', 'D.', NULL, 'lancecasinto1407@gmail.com'),
  ('Barista NC II', 'Olog', 'Marca Angela', 'Liberato', 'L.', NULL, 'ologmarca@gmail.com'),
  ('Barista NC II', 'Mapalad', 'Veronica', 'Agsangre', 'A.', NULL, 'mapalad2005@gmail.com'),
  ('Barista NC II', 'Borja', 'Shaira Marie', 'Bernardino', 'B.', NULL, 'marieborja@yahoo.com'),
  ('Barista NC II', 'Bulalacao', 'Annie', 'Pamintuan', 'A.', NULL, 'anniebulalacao048@gmail.com'),
  ('Barista NC II', 'Maestre', 'John Carlo', 'Logenic', 'L.', NULL, 'johncarlomaestre0807@gmail.com'),
  ('Barista NC II', 'Quibin', 'Angelica Marie', NULL, NULL, NULL, 'angelicaquibin30@gmail.com'),
  ('Barista NC II', 'Firmalino', 'Ma. Isabel', 'Parulan', 'P.', NULL, 'mipfirmadino@gmail.com'),
  ('Barista NC II', 'Quijada', 'Rodel', 'Camelotes', 'C.', NULL, 'rodelcamelotesquijada@gmail.com'),
  ('Barista NC II', 'Palo', 'Joancen', 'Rodriguez', 'R.', NULL, 'joancenfame@gmail.com'),
  ('Barista NC II', 'Escalera', 'Buenafe', 'Visca', 'V.', NULL, 'buenafe71escalera@yahoo.com'),
  ('Barista NC II', 'Tuazon', 'Francis', 'Pigar', 'P.', NULL, 'francistuazon234@gmail.com'),
  ('Barista NC II', 'Evans', 'May', 'Valdez', 'V.', NULL, 'mayvaldezqc@yahoo.com'),
  ('Barista NC II', 'Casiano', 'Daniella', NULL, NULL, NULL, 'casiano.daniella.pending@orientation.hyt.local'),
  ('Barista NC II', 'Carpio', 'John Lloyd', 'Yadawon', 'Y.', NULL, 'johnlloydcarpio0246@gmail.com'),
  ('Barista NC II', 'Artesano', 'Shanlege Nicole', 'Tortusia', 'T.', NULL, 'artesanoshanlegh@gmail.com'),
  ('Barista NC II', 'Fernandez', 'Zyraclaire', 'Carillo', 'C.', NULL, 'zyrafernandez73@gmail.com'),
  ('Barista NC II', 'Patso', 'Julia Mae', 'Tordecilla', 'T.', NULL, 'juliapateo0@gmail.com'),
  ('Barista NC II', 'Mabato', 'Ruby Ann', 'Maquimot', 'M.', NULL, 'bmaquimot@gmail.com'),
  ('Barista NC II', 'Carillo', 'Railey', 'Mandapat', 'M.', NULL, 'raileycarillois@gmail.com'),
  ('Barista NC II', 'Samolden', 'Esrafil', 'Madlawi', 'E.', NULL, 'esrafilmadlawi2026@gmail.com'),
  ('Barista NC II', 'Ramos', 'Chevie Sheen', 'Zamora', 'Z.', NULL, 'ramoschevie@gmail.com'),
  ('Barista NC II', 'Cruz', 'Romel Jhon Nickelson', 'Cruz', 'C.', NULL, 'nickelsonos@gmail.com'),
  ('Barista NC II', 'Subalisid', 'Erwin', 'Deinla', 'D.', NULL, 'erwinmahiligsumisio069@gmail.com'),
  ('Barista NC II', 'Corpuz', 'Joshua Miguel', NULL, NULL, NULL, 'corpuz.joshua.miguel.pending@orientation.hyt.local'),
  ('Barista NC II', 'Cortez', 'Diana', 'Camento', 'C.', NULL, 'cortez.diana.pending@orientation.hyt.local'),
  ('Barista NC II', 'Marmita', 'Reinmah Iya', 'Tabor', 'T.', NULL, 'reinnahiyatabormarmita@gmail.com'),
  ('Barista NC II', 'Perez', 'Lester', 'Dapi', 'D.', NULL, 'perezlester029@gmail.com'),
  ('Barista NC II', 'Molina', 'Donnadel', 'Benavidez', 'B.', NULL, 'mrichynicho0301@gmail.com'),
  ('Barista NC II', 'Plotria', 'Sheila', 'Ajos', 'A.', NULL, 'splotria@gmail.com'),
  ('Barista NC II', 'Ramirez', 'Alyza', 'Ann', 'A.', NULL, 'ramirez.alyza.pending@orientation.hyt.local'),
  ('Barista NC II', 'Canete', 'Cyrill', 'Divinaflor', 'D.', NULL, 'cyrill.divinaflor.canete@gmail.com'),
  ('Barista NC II', 'Reyes', 'Kimberly Shine', 'Bago', 'B.', NULL, 'rkim09391@gmail.com'),
  ('Barista NC II', 'Rojas', 'Stephanie', 'Omalza', 'O.', NULL, 'rojas.stephanie.pending@orientation.hyt.local'),
  ('Barista NC II', 'Manozo', 'John', 'Patrick', 'S.', NULL, 'johnpatrickmanozo@gmail.com'),
  ('Barista NC II', 'Simon', 'Jocelle', 'Diaz', 'D.', NULL, 'simonjocelle.diaz@gmail.com'),
  ('Barista NC II', 'Hernandez', 'Ciauel', 'Lozada', 'L.', NULL, 'ciauelhernandez0@gmail.com'),
  ('Barista NC II', 'Geronimo', 'Chrizelle Kelly', NULL, NULL, NULL, 'chrizellekellygeronimo@gmail.com'),
  ('Barista NC II', 'Derueda', 'Quincie Jell', 'Davocol', 'D.', NULL, 'quinciejell02@gmail.com'),
  ('Barista NC II', 'Mercado', 'Carmina', 'Gerona', 'G.', NULL, 'carminagerano@gmail.com'),
  ('Barista NC II', 'Oro', 'Gaveriell', NULL, NULL, NULL, 'oro.gaveriell.pending@orientation.hyt.local'),
  ('Barista NC II', 'Hernandez', 'Kyra Isabel', 'Carolino', 'C.', NULL, 'kyraisabel.h@gmail.com'),
  ('Barista NC II', 'Yebra', 'Angel', 'Ann', 'O.', NULL, 'yebra.angelann.oroi@gmail.com'),
  ('Barista NC II', 'Jamito', 'Kylle', 'Justine', 'J.', NULL, 'kyllejustine.jamito08@gmail.com'),
  ('Event Management Services NC II', 'Ramos', 'Marites', 'Antonino', 'A.', NULL, 'maritesaramos70@gmail.com'),
  ('Event Management Services NC II', 'Uy', 'Athena Karyle', 'Daliposon', 'D.', NULL, 'athenakaryvevy@gmail.com'),
  ('Event Management Services NC II', 'Bautista', 'Maria Michelle', 'Esteban', 'E.', NULL, 'bautistamariemichelle0923@gmail.com'),
  ('Event Management Services NC II', 'Barcelona', 'Lourdes', 'Bartolome', 'B.', NULL, 'barcelona.lourdes.pending@orientation.hyt.local'),
  ('Event Management Services NC II', 'Jadulco', 'Genrina', 'Peralta', 'P.', NULL, 'genrinajadulco@gmail.com'),
  ('Event Management Services NC II', 'Bismonte', 'Jemuel', 'Banzale', 'B.', NULL, 'jemuelbanzalebismonte@gmail.com'),
  ('Event Management Services NC II', 'Barbin', 'Aldrin', 'Bayoca', 'B.', NULL, 'aldrinbarbib467@gmail.com'),
  ('Event Management Services NC II', 'Nadal', 'Ma. Shangrila', 'Santos', 'S.', NULL, 'shanna.nadal.v2@gmail.com'),
  ('Event Management Services NC II', 'Bantug', 'Shine', 'Mary', 'C.', NULL, 'bantugshinemary@gmail.com'),
  ('Event Management Services NC II', 'Amargo', 'Jade', 'Russel', 'Y.', NULL, 'jaderussel.jra@gmail.com'),
  ('Housekeeping NC II', 'Prendol', 'Maria Michelle', 'Melchor', 'M.', NULL, 'atchiethienekoh@gmail.com'),
  ('Housekeeping NC II', 'Lanas', 'Maria Flor', 'Deguit', 'D.', NULL, 'mariaflordeguitlanas02@gmail.com'),
  ('Housekeeping NC II', 'Ocampo', 'Rodora', 'Balhag', 'B.', NULL, 'rodora0512@gmail.com'),
  ('Housekeeping NC II', 'Ocampo', 'Adryan', 'Sales', 'S.', NULL, 'adryan1026@gmail.com'),
  ('Housekeeping NC II', 'Daban', 'Rosanna', 'Valdez', 'V.', NULL, 'annasordaban@gmail.com'),
  ('Housekeeping NC II', 'Tuazon', 'Anghellina', 'Pigar', 'P.', NULL, 'tuazon.anghellina.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Latorre', 'Judy Ann', 'Delmonte', 'D.', NULL, 'jalatorre2022@gmail.com'),
  ('Housekeeping NC II', 'Pepe', 'Jannet', 'Maestre', 'M.', NULL, 'pepe.jannet.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Abuda', 'Abbigayle', 'Olivar', 'O.', NULL, 'abuda.abbigayle.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Galvez', 'Ginalyn', 'Canes', 'G.', NULL, 'galvezginalyn8@gmail.com'),
  ('Housekeeping NC II', 'Tuazon', 'Marialyn', 'Pigar', 'M.', NULL, 'tuazon.marialyn.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Rublica', 'Kelvin', 'Delima', 'K.', NULL, 'rublica.kelvin.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Mariot', 'Maria Carmen', 'Torres', 'T.', NULL, 'mariot.maria.carmen.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Dela Cruz', 'Amelia', 'Rocacorba', 'R.', NULL, 'dela.cruz.amelia.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Rowaya', 'Julan', NULL, NULL, NULL, 'rowayajulan@gmail.com'),
  ('Housekeeping NC II', 'Valenciado', 'Joyce Mar', 'Albesa', 'A.', NULL, 'valenciadojoycemar@gmail.com'),
  ('Housekeeping NC II', 'Lalic', 'Joses Kyle', NULL, NULL, NULL, 'joky.lalicshc@phinmaed.com'),
  ('Housekeeping NC II', 'Dacayo', 'Nicko', 'Saturnino', 'S.', NULL, 'nsd.prosperity@gmail.com'),
  ('Housekeeping NC II', 'Aranda', 'Edmond', 'Ocbina', 'O.', NULL, 'edmondaranda97@gmail.com'),
  ('Housekeeping NC II', 'Doria', 'Lourdes', 'Lontoc', 'L.', NULL, 'lourdesairod252@gmail.com'),
  ('Housekeeping NC II', 'Macapagal', 'Joel', 'Dela Cruz', 'D.', NULL, 'macapagalj@gmail.com'),
  ('Housekeeping NC II', 'Gutierrez', 'Bea Marie', 'Traboc', 'B.', NULL, 'beamariegutierrez2@gmail.com'),
  ('Housekeeping NC II', 'Estrella', 'Lyra', 'Gonzales', 'G.', NULL, 'lyragonzales1824@gmail.com'),
  ('Housekeeping NC II', 'Cano', 'Jomer Boy', 'Enero', 'J.', NULL, 'jomercano54@gmail.com'),
  ('Housekeeping NC II', 'Cano', 'James Hooper', 'Enero', 'J.', NULL, 'jameshoopercano03@gmail.com'),
  ('Housekeeping NC II', 'Palo', 'Brian Griffin', 'Rodriguez', 'B.', NULL, 'nairbolap.0824@gmail.com'),
  ('Housekeeping NC II', 'Longasa', 'Rhica Shaira', 'Jimenez', 'R.', NULL, 'longasarhicashaira@gmail.com'),
  ('Housekeeping NC II', 'Lim', 'Cielo', 'De La Cruz', 'D.', NULL, 'cielolim1423271994@gmail.com'),
  ('Housekeeping NC II', 'Marasigan', 'Riana Jean', 'Dumantay', 'R.', NULL, 'rianajean08@gmail.com'),
  ('Housekeeping NC II', 'Teniente', 'Vea Rafhaela', 'Betita', 'V.', NULL, 'veateniente091528@gmail.com'),
  ('Housekeeping NC II', 'Recoco', 'Reina Mae', 'Plaza', 'R.', NULL, 'reinarecoco@gmail.com'),
  ('Housekeeping NC II', 'Daisog', 'Mary Joy', 'Masilang', 'M.', NULL, 'daisogmaryjoy123@gmail.com'),
  ('Housekeeping NC II', 'Labuntog', 'Ma. Cleotelde', 'Navalle', 'N.', NULL, 'mariacleotilde18@yahoo.com'),
  ('Housekeeping NC II', 'Lotero', 'Krishea', 'Mae', 'M.', NULL, 'krishamaedanaslotero@gmail.com'),
  ('Housekeeping NC II', 'Labuntog', 'Vanessa', 'Mae', 'M.', NULL, 'labuntog.vanessa.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Magabulo', 'Nicole', NULL, NULL, NULL, 'nicolemagabulo17@gmail.com'),
  ('Housekeeping NC II', 'Requiroso', 'Loida', NULL, 'B.', NULL, 'requiroso.loida.pending@orientation.hyt.local'),
  ('Housekeeping NC II', 'Aquino', 'Blessie', NULL, 'E.', NULL, 'blessie.aquino0730@gmail.com'),
  ('Housekeeping NC II', 'Navarro', 'Jonalie', NULL, 'P.', NULL, 'jonaliemaenavarro@gmail.com'),
  ('Housekeeping NC II', 'Infestan', 'Patrick', NULL, NULL, NULL, 'infestanpatrick147@gmail.com'),
  ('Housekeeping NC II', 'Sinner', 'Dianne', 'Cacho', 'D.', NULL, 'dianneainner2@gmail.com'),
  ('Housekeeping NC II', 'Narte', 'Annalyn', 'Bernardino', 'B.', NULL, 'annabernardino@gmail.com'),
  ('Housekeeping NC II', 'Tizon', 'Ivy', NULL, 'N.', NULL, 'ibyoungs17@gmail.com'),
  ('Housekeeping NC II', 'Custodio', 'Jhelene', 'Clyde', 'C.', NULL, 'jheleneclyde.custudio@tup.edu.ph'),
  ('Housekeeping NC II', 'Sulla', 'Rendelyn', NULL, 'B.', NULL, 'rendelynsulla@gmail.com'),
  ('Housekeeping NC II', 'Galang', 'Elgine', NULL, NULL, NULL, 'galangelgine@gmail.com'),
  ('Housekeeping NC II', 'Janito', 'Lyndie', NULL, 'A.', NULL, 'lyndiejanitoiiii@gmail.com'),
  ('Housekeeping NC II', 'Carmona', 'Mark', NULL, 'R.', NULL, 'kramanomrac42@gmail.com'),
  ('Housekeeping NC II', 'Binamira', 'Ronald', NULL, NULL, NULL, 'onatbinamira000@gmail.com'),
  ('Housekeeping NC II', 'Garcia', 'Cecillia', NULL, 'P.', NULL, 'cg4512933@gmail.com'),
  ('Housekeeping NC II', 'Dollaga', 'Henrietta', NULL, 'M.', NULL, 'henriemdollaga@gmail.com'),
  ('Housekeeping NC II', 'Dollaga', 'Ailene', NULL, 'L.', NULL, 'ailenedollaga0922@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Yu', 'Jane', 'Godezano', 'G.', NULL, 'janeyu12@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Pamana', 'Jose Romel', 'Dellova', 'D.', NULL, 'pamana.jose.romel.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Dela Cruz', 'Marjorie', 'Acedera', 'A.', NULL, 'dela.cruz.marjorie.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Bajada', 'Honey Beth', 'Jabineao', 'J.', NULL, 'bajada.honey.beth.pending@orientation.hyt.local'),
  ('Hilot (Wellness) Services NC II', 'Guerrero', 'Ma. Alexa', 'Asuncion', 'A.', NULL, 'asuncionalexa420@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Rojas', 'Sharon', NULL, 'B.', NULL, 'baconawasharonrojas@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Dadis', 'Erjielyn', NULL, 'C.', NULL, 'erjiedadis6@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Lorenzana', 'Alma', NULL, 'C.', NULL, 'almalorenzana911@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Oblipias', 'Rissa', NULL, 'A.', NULL, 'rissaoblipias88@gmail.com'),
  ('Hilot (Wellness) Services NC II', 'Fernandez', 'Erwin', NULL, 'D.', NULL, 'erwindgfernandez@gmail.com'),
  ('Massage NC II', 'Pamintuan', 'Mario', 'Pingul', 'P.', NULL, 'pamintuan.mario.pending@orientation.hyt.local')
;

-- Create the auth logins first. The on_auth_user_created trigger then creates
-- the matching public.users rows. Skip the whole block if any roster login is
-- already present, so a re-run cannot duplicate the cohort.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users a
    JOIN _orientation_roster r ON a.email = r.email
  ) THEN
    RAISE NOTICE 'Orientation cohort logins already exist; skipping auth seed.';
  ELSE
    INSERT INTO auth.users (
      id, email, encrypted_password, raw_user_meta_data,
      created_at, updated_at, email_confirmed_at
    )
    SELECT
      gen_random_uuid(),
      r.email,
      crypt('HytOrient2026!', gen_salt('bf')),
      jsonb_build_object(
        'name', btrim(concat_ws(' ', r.first_name, r.middle_name, r.last_name)),
        'provider', 'email',
        'email_confirmed', true
      ),
      NOW(),
      NOW(),
      NOW()
    FROM _orientation_roster r;
  END IF;
END
$$;

-- Fill the profile rows the trigger just created. COALESCE keeps any value an
-- admin has already corrected; on a fresh database every value is NULL.
UPDATE public.users u
SET
  first_name = COALESCE(u.first_name, r.first_name),
  middle_name = COALESCE(u.middle_name, r.middle_name),
  middle_initial = COALESCE(
    u.middle_initial,
    CASE
      WHEN r.middle_initial IS NOT NULL AND btrim(r.middle_initial) <> ''
        THEN upper(left(btrim(r.middle_initial), 1))
      WHEN r.middle_name IS NOT NULL AND btrim(r.middle_name) <> ''
        THEN upper(left(btrim(r.middle_name), 1))
      ELSE NULL
    END
  ),
  name_extension = COALESCE(u.name_extension, r.name_extension),
  last_name = COALESCE(u.last_name, r.last_name),
  name = COALESCE(
    NULLIF(u.name, ''),
    btrim(concat_ws(' ', r.first_name, r.middle_name, r.last_name))
  ),
  visitor_type_id = COALESCE(
    u.visitor_type_id,
    (SELECT id FROM public.visitor_types WHERE label = 'Trainee')
  ),
  course_id = COALESCE(
    u.course_id,
    (SELECT id FROM public.courses WHERE label = r.programme)
  )
FROM _orientation_roster r
WHERE u.email = r.email;

-- Repair a partial load where the profile rows exist but course_id is still
-- NULL and the email may already have been cleared. users.name is NOT NULL, so
-- matching on the assembled full name is safe and is the same key the original
-- repair migration used.
UPDATE public.users u
SET course_id = COALESCE(
  u.course_id,
  (SELECT id FROM public.courses c WHERE c.label = r.programme)
)
FROM _orientation_roster r
WHERE u.name = btrim(concat_ws(' ', r.first_name, r.middle_name, r.last_name))
  AND u.course_id IS NULL;

-- Retire the synthetic addresses. The profile row is what the app reads; the
-- auth row is what proves identity, so both must be cleared.
UPDATE auth.users
SET email = NULL
WHERE email LIKE '%.pending@orientation.hyt.local';

UPDATE public.users
SET email = NULL
WHERE email LIKE '%.pending@orientation.hyt.local';

-- Generic backfill for any other profile rows (for example, accounts that
-- existed before this script ran). A heuristic, not a source of truth: the
-- last word is the surname and the word before it is the middle initial.
WITH parts AS (
  SELECT
    u.id,
    array_remove(string_to_array(btrim(u.name), ' '), '') AS w
  FROM public.users u
  WHERE u.first_name IS NULL
    AND u.last_name IS NULL
    AND btrim(u.name) <> ''
)
UPDATE public.users u
SET
  first_name = p.w[1],
  last_name = p.w[array_length(p.w, 1)],
  middle_initial = CASE
    WHEN array_length(p.w, 1) >= 3
      THEN upper(left(p.w[array_length(p.w, 1) - 1], 1))
    ELSE NULL
  END
FROM parts p
WHERE u.id = p.id
  AND array_length(p.w, 1) >= 1;

-- Normalise any middle initial already written: one upper-case letter, no
-- period, and no empty string.
UPDATE public.users
SET middle_initial = upper(left(btrim(middle_initial), 1))
WHERE middle_initial IS NOT NULL
  AND btrim(middle_initial) <> ''
  AND middle_initial IS DISTINCT FROM upper(left(btrim(middle_initial), 1));

UPDATE public.users
SET middle_initial = NULL
WHERE middle_initial IS NOT NULL
  AND btrim(middle_initial) = '';

DROP TABLE IF EXISTS _orientation_roster;


-- ============================================================================
-- 12. Reload PostgREST and verify
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- Expect 11 rooms, 8 purposes, 7 visitor types, 10 courses.
SELECT 'rooms' AS table_name, COUNT(*) AS rows FROM public.rooms
UNION ALL
SELECT 'purposes',         COUNT(*) FROM public.purposes
UNION ALL
SELECT 'visitor_types',    COUNT(*) FROM public.visitor_types
UNION ALL
SELECT 'courses',          COUNT(*) FROM public.courses;

-- Expect the five TESDA programmes with 58 / 10 / 52 / 10 / 1 students, and
-- the number of cohort rows that still have no email address.
SELECT
  c.label AS programme,
  COUNT(*) AS people,
  COUNT(*) FILTER (WHERE u.email IS NULL) AS no_email
FROM public.users u
JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN (
  'Barista NC II',
  'Event Management Services NC II',
  'Housekeeping NC II',
  'Hilot (Wellness) Services NC II',
  'Massage NC II'
)
GROUP BY c.label
ORDER BY c.label;


-- ============================================================================
-- 13. Create the first administrator
-- ============================================================================
-- There is exactly one admin, enforced by users_single_admin_idx. Create the
-- account through /register, the Supabase Auth dashboard, or /admin/users, then
-- promote it once:
--
--   UPDATE public.users
--      SET role = 'admin'
--    WHERE email = 'you@example.com';
--
-- A second UPDATE that would create another admin fails with a unique
-- violation, by design.
-- ============================================================================
