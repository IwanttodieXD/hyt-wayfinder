-- ============================================================================
-- HYT Wayfinder - visitor profiles and a single administrator
--
-- Run this if you ALREADY ran 20260101000001 and 20260101000002.
--
-- Two changes, both driven by running real events through the system (a TESDA
-- accredited orientation, where the people arriving are a mix of trainees,
-- trainers and VIPs):
--
--  1. `users` gains the descriptive fields a front desk actually needs. These
--     describe WHO someone is, not what they may do. Keeping them off `role` is
--     deliberate: `role` is a permission level with exactly two values, and
--     overloading it with "trainer" and "VIP" is what produced the dead roles
--     retired in 20260101000003.
--
--  2. Exactly one admin, enforced by the database rather than by the UI.
--
-- Safe to run more than once: every statement is IF NOT EXISTS / OR REPLACE.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- visitor_types - how a visitor relates to the building
-- ----------------------------------------------------------------------------
--
-- A lookup table, not an enum, for the same reason `purposes` is one: the list
-- is expected to grow with each kind of event, and adding a value must not
-- require a type migration.
--
-- These grant NOTHING. Every visitor_type here has identical permissions; the
-- column exists so the front desk can answer "who is in the building and why"
-- and so an orientation can count attendees versus trainers versus VIPs.

CREATE TABLE IF NOT EXISTS public.visitor_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label      TEXT NOT NULL UNIQUE,
  -- Marks the handful of types worth surfacing as tiles on the register form
  -- and the admin filter. Trainees, trainers and VIPs are; a contractor is not.
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
-- users - descriptive visitor fields
-- ----------------------------------------------------------------------------
--
-- All nullable and all free of behaviour. Deleting every one of them leaves a
-- perfectly working account, which is what makes them safe to add late.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS visitor_type_id UUID
  REFERENCES public.visitor_types(id) ON DELETE SET NULL;

-- Who they are here to see. Free text rather than a users FK: an escort is
-- often a staff member who has no account in this system, and requiring one
-- would block recording the visit at all.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS host_name TEXT;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Pass expiry. Checked at check-in so an event's credentials stop working the
-- morning after the event without anyone having to archive rows by hand.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- Free-text notes for the front desk. Never joined on.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Supports "show me everyone coming to the orientation who is not expired".
CREATE INDEX IF NOT EXISTS users_visitor_type_idx
  ON public.users (visitor_type_id);

CREATE INDEX IF NOT EXISTS users_valid_until_idx
  ON public.users (valid_until)
  WHERE valid_until IS NOT NULL;


-- ----------------------------------------------------------------------------
-- Exactly one admin
-- ----------------------------------------------------------------------------
--
-- The front desk does not need a list of administrators, and a second admin is
-- a liability: anyone who can edit users can grant themselves the keys. So the
-- admin account is a singleton, and it is deliberately NOT manageable through
-- /admin/users.
--
-- Enforced here rather than in the API so the guarantee survives a bad deploy,
-- a direct SQL session, or a second app instance.

-- Normalise FIRST: if the deployment already has more than one admin (it may,
-- since roles were assignable until now), keep exactly one and demote the rest.
-- Oldest wins, so the original operator account is the one that survives.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.users
  WHERE role = 'admin'
)
UPDATE public.users
SET role = 'visitor'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- The guarantee itself. A constant expression indexed only over admin rows is
-- the standard way to express "at most one of these"; the second INSERT or
-- UPDATE that would create another admin fails with a unique violation.
CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_idx
  ON public.users ((TRUE))
  WHERE role = 'admin';


-- ----------------------------------------------------------------------------
-- RLS for the new table
-- ----------------------------------------------------------------------------
--
-- Same shape as `purposes`: readable by anyone, because the register form runs
-- before anyone has signed in and its picker would otherwise be empty for a
-- brand-new visitor. The list contains no user data, just labels.

GRANT SELECT ON public.visitor_types TO anon, authenticated;

DROP POLICY IF EXISTS "visitor_types readable by anyone" ON public.visitor_types;
DROP POLICY IF EXISTS "visitor_types readable when signed in" ON public.visitor_types;

CREATE POLICY "visitor_types readable by anyone"
  ON public.visitor_types FOR SELECT
  USING (TRUE);


-- Confirm the end state.
--
-- Expect exactly one row. If this returns two, the normalisation above did not
-- run and the unique index would have refused to be created.
SELECT role, COUNT(*) FROM public.users WHERE role = 'admin' GROUP BY role;