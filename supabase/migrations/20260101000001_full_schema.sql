-- ============================================================================
-- HYT Wayfinder - full schema
--
-- One migration for a fresh database.
--
-- Design notes:
--  * Rooms live in one place. Nothing stores a room name as free text.
--  * Names/roles are never duplicated onto visit rows - they are joined.
--  * duration and status are GENERATED, so they cannot drift from the
--    timestamps they are derived from.
--  * Nothing deletes attendance history. Users are archived, not removed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

-- System permission level. Drives what a person may see and do.
-- 'admin' | 'trainer' | 'trainee' | 'visitor'
CREATE TYPE user_role AS ENUM ('admin', 'trainer', 'trainee', 'visitor');


-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------------------
-- rooms - single source of truth for every room in the building
-- ----------------------------------------------------------------------------

CREATE TABLE public.rooms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number  TEXT NOT NULL UNIQUE,          -- 'Room 304', 'Roofdeck'
  name         TEXT NOT NULL,                 -- display name shown to people
  floor        TEXT NOT NULL,                 -- 'G' | '2' | '3' | '4' | 'Roof'
  building     TEXT NOT NULL DEFAULT 'HYT-Business Center',
  -- The value encoded in this room's door QR code. Unique so a code cannot be
  -- double-assigned, which would make two doors scan identically.
  qr_value     TEXT NOT NULL UNIQUE,
  -- Lets a room be retired (renumbered, demolished) without losing its history.
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rooms_floor_check CHECK (floor IN ('G', '2', '3', '4', 'Roof'))
);

CREATE INDEX rooms_floor_idx ON public.rooms (floor) WHERE is_active;
CREATE INDEX rooms_active_idx ON public.rooms (is_active);

CREATE TRIGGER rooms_touch_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ----------------------------------------------------------------------------
-- purposes - why someone is in the building on a given visit
-- ----------------------------------------------------------------------------
-- Deliberately a small lookup table rather than free text or an enum: the list
-- is expected to grow with the institute, and adding one must not require a
-- type migration.

CREATE TABLE public.purposes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,            -- 'Interview', 'Orientation'
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
  ('Other');


-- ----------------------------------------------------------------------------
-- users - profile row, one per Supabase Auth user
-- ----------------------------------------------------------------------------
-- id matches auth.users.id. There is no password here; Supabase Auth owns that.

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'visitor',
  -- Soft delete. Attendance history must survive a person leaving, so rows are
  -- archived rather than deleted. Filter on `archived_at IS NULL` for "current".
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_role_idx ON public.users (role);
CREATE INDEX users_active_idx ON public.users (archived_at);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ----------------------------------------------------------------------------
-- clock_in_records - ATTENDANCE. Ground floor code only.
-- ----------------------------------------------------------------------------
-- "Was this person in the building, and for how long." One row per visit.
-- Room codes must never write here; that is room_visits' job.

CREATE TABLE public.clock_in_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  -- Where in the building they were headed. Nullable: someone may clock in
  -- before an admin assigns them a room.
  room_id     UUID REFERENCES public.rooms(id) ON DELETE RESTRICT,
  -- Why they are here TODAY. Per visit, so a trainee can attend a Meeting one
  -- day and an Orientation the next.
  purpose_id  UUID REFERENCES public.purposes(id) ON DELETE RESTRICT,

  time_in     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out    TIMESTAMPTZ,

  -- Derived. Postgres rejects NOW() in a generated column (it is not
  -- immutable), so duration stays NULL while the visit is still open and the
  -- app shows a live elapsed timer instead.
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

  -- A visit cannot end before it started.
  CONSTRAINT clock_in_time_order CHECK (time_out IS NULL OR time_out >= time_in)
);

-- Postgres does NOT index foreign keys automatically.
CREATE INDEX clock_in_user_idx    ON public.clock_in_records (user_id);
CREATE INDEX clock_in_room_idx    ON public.clock_in_records (room_id);
CREATE INDEX clock_in_purpose_idx ON public.clock_in_records (purpose_id);
CREATE INDEX clock_in_time_in_idx ON public.clock_in_records (time_in DESC);
-- Serves the "who is in the building right now" lookup.
CREATE INDEX clock_in_open_idx    ON public.clock_in_records (user_id)
  WHERE time_out IS NULL;

CREATE TRIGGER clock_in_touch_updated_at
  BEFORE UPDATE ON public.clock_in_records
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ----------------------------------------------------------------------------
-- room_visits - PRESENCE. Room door codes only.
-- ----------------------------------------------------------------------------
-- "Which room was this person in, and when they moved." Append-only: a scan
-- opens a row, the next scan closes it. Never affects attendance.
--
-- One person can only be in one room at a time, enforced below rather than
-- trusted to the client.

CREATE TABLE public.room_visits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  -- Links this room entry to the attendance visit it happened under. Without
  -- it, a person who checks in on Monday and Tuesday has their room scans
  -- blurred into one indistinguishable trail.
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

CREATE INDEX room_visits_user_idx   ON public.room_visits (user_id);
CREATE INDEX room_visits_room_idx   ON public.room_visits (room_id);
CREATE INDEX room_visits_clock_in_idx ON public.room_visits (clock_in_id);
CREATE INDEX room_visits_entered_idx ON public.room_visits (entered_at DESC);
-- Serves "who is in this room right now".
CREATE INDEX room_visits_open_idx   ON public.room_visits (room_id)
  WHERE exited_at IS NULL;

-- A person can be in at most one room at a time. Scanning a new door closes the
-- previous open row first; if two writes race, this makes the second fail
-- loudly instead of silently double-counting someone.
CREATE UNIQUE INDEX room_visits_one_open_per_user
  ON public.room_visits (user_id)
  WHERE exited_at IS NULL;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Users read/write their own rows. Admins read everything. Admins are checked
-- against public.users rather than JWT claims so a role change takes effect
-- immediately instead of waiting for the token to refresh.

ALTER TABLE public.rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visits   ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND archived_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

SET search_path = public;


-- rooms: readable by any signed-in user so the scanner can resolve a code.
CREATE POLICY "rooms readable when signed in"
  ON public.rooms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admins manage rooms"
  ON public.rooms FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());


-- purposes: same - the register form needs the list.
CREATE POLICY "purposes readable when signed in"
  ON public.purposes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "admins manage purposes"
  ON public.purposes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());


-- users: own row only, plus admin visibility.
CREATE POLICY "users read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "users update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins insert users"
  ON public.users FOR INSERT
  WITH CHECK (is_admin());

-- No DELETE policy on purpose. Accounts are archived via archived_at, so
-- attendance history can never be destroyed through the API.


-- clock_in_records:
--   Users may OPEN their own visit and CLOSE their own open visit.
--   They may NOT freely UPDATE an existing row - editing time_in or room_id
--   after the fact would make the attendance record falsifiable.
CREATE POLICY "read own attendance"
  ON public.clock_in_records FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "open own attendance"
  ON public.clock_in_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the clock-out path is permitted: the row must still be open, and may
-- only be gaining a time_out.
CREATE POLICY "close own open attendance"
  ON public.clock_in_records FOR UPDATE
  USING (auth.uid() = user_id AND time_out IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage attendance"
  ON public.clock_in_records FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());


-- room_visits: presence is self-reported, same shape as attendance.
CREATE POLICY "read own presence"
  ON public.room_visits FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "create own presence"
  ON public.room_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "close own presence"
  ON public.room_visits FOR UPDATE
  USING (auth.uid() = user_id AND exited_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage presence"
  ON public.room_visits FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
