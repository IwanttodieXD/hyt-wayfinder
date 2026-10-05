// Generates supabase/migrations/20260101000012_orientation_students.sql
// from the roster in roster-data.cjs.
//
// Run: node scripts/gen-orientation-roster.cjs
//
// Generating rather than hand-writing 132 INSERT rows: a single typo in a
// literal would either abort the migration on the NOT NULL email constraint or,
// worse, silently create a person who does not exist.
const fs = require('fs');
const path = require('path');
const ROSTER = require('./roster-data.cjs');

const OUT = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260101000012_orientation_students.sql'
);

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

// Anything that is not shaped like an address. The source roster has blanks and
// also a couple of rows where a NAME landed in the email column.
const isEmail = (v) =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const rows = ROSTER.map(([programme, last, first, middle, initial, extension, email]) => {
  // 'N/A' in the source sheet means "not provided", not a literal value. It must
  // not leak into a display name or a stored column.
  const clean = (v) => (v && v !== 'N/A' ? v.trim() : '');
  const parts = { last: clean(last), first: clean(first), middle: clean(middle) };
  const fullName = [parts.first, parts.middle, parts.last].filter(Boolean).join(' ');
  const key = `${slug(parts.last)}.${slug(parts.first)}`;
  const real = isEmail(email);
  return {
    programme,
    last: parts.last,
    first: parts.first,
    middle: parts.middle,
    initial: clean(initial),
    extension: clean(extension),
    fullName,
    key,
    email: real ? email.trim().toLowerCase() : `${key}.pending@orientation.hyt.local`,
    hasRealEmail: real,
  };
});

// Refuse to emit SQL that would abort on a unique violation.
const seen = new Map();
const collisions = [];
for (const r of rows) {
  for (const k of [r.email, r.key]) {
    const prior = seen.get(k);
    if (prior) collisions.push(`${k}  <-  ${prior}  |  ${r.fullName} (${r.programme})`);
    else seen.set(k, `${r.fullName} (${r.programme})`);
  }
}
if (collisions.length) {
  console.error('DUPLICATE KEYS - fix roster-data.cjs before generating:');
  collisions.forEach((c) => console.error('  ' + c));
  process.exit(1);
}

const esc = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
// 'N/A' in the source sheet means "no middle name", not a literal middle name.
const nm = (v) => (v && v !== 'N/A' ? esc(v) : 'NULL');

const counts = rows.reduce((acc, r) => {
  acc[r.programme] = (acc[r.programme] || 0) + 1;
  return acc;
}, {});
const programmes = Object.keys(counts);
const pending = rows.filter((r) => !r.hasRealEmail);
const list = programmes.map((p) => `'${p}'`).join(', ');

// raw_user_meta_data is a jsonb column. The literal has to be valid JSON AND a
// valid SQL string, and the two quoting rules fight: JSON needs double quotes
// around the name, SQL needs single quotes around the whole literal. Escaping
// the name for JSON first and then for SQL produces the right nesting, whereas
// wrapping an already-serialised JSON object in SQL quotes does not.
const jsonMeta = (name) => {
  const json = JSON.stringify({ name, provider: 'email', email_confirmed: true });
  return esc(json);
};

// `auth.users` is seeded with INSERT ... SELECT ... WHERE NOT EXISTS rather than
// ON CONFLICT.
//
// Supabase's auth.users has NO unique constraint on email: the column is
// nullable and uniqueness is enforced in the GoTrue service layer, not by an
// index. So `ON CONFLICT (email) DO NOTHING` cannot resolve a conflict target
// and Postgres aborts the whole statement with:
//
//   42P10: there is no unique or exclusion constraint matching the
//          ON CONFLICT specification
//
// The NOT EXISTS guard is what makes the seed idempotent here, and it works
// regardless of whether an index exists. It is not atomic against a concurrent
// second run, which is acceptable for a one-off seed executed from the SQL
// editor by one operator.
const authRows = rows
  .map((r) => `  (${esc(r.email)}, ${jsonMeta(r.fullName)})`)
  .join(',\n');

// The SELECT must supply exactly as many expressions as the INSERT's column
// list: id, email, encrypted_password, raw_user_meta_data, created_at,
// updated_at, email_confirmed_at. A mismatch here is what produced 22007 and,
// before that, a 42P10 - so the arity check in check-roster-migration.cjs
// compares this expression count against the declared column count.
const authValues = `SELECT
  gen_random_uuid(),
  s.email,
  crypt('HytOrient2026!', gen_salt('bf')),
  s.meta,
  NOW(),
  NOW(),
  NOW()
FROM (VALUES
${authRows}
) AS s(email, meta)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users existing WHERE existing.email = s.email
)`;

const seedRows = rows
  .map(
    (r) =>
      `  (${esc(r.programme)}, ${esc(r.last)}, ${esc(r.first)}, ${nm(r.middle)}, ` +
      `${nm(r.initial)}, ${nm(r.extension)}, ${esc(r.email)})`
  )
  .join(',\n');

module.exports = {
  rows, counts, programmes, pending, list,
  authRows, authValues, seedRows, esc, nm,
};

const S = module.exports;

const header = `-- ============================================================================
-- HYT Wayfinder - orientation cohort roster (approved / declined gate)
--
-- Seeds the ${S.rows.length} students from the last TESDA orientation so the QR
-- flow can gate entry:
--
--   * a brand-new visitor registers and lands as 'pending'
--   * someone from this cohort who scans shows their orientation verdict
--     straight away, because their profile row already exists
--
-- Why this is a migration rather than a plain INSERT:
--
--   * public.users.id REFERENCES auth.users(id) ON DELETE CASCADE. A profile
--     row cannot exist without a matching auth login, so auth.users is
--     populated first and public.users joins onto it by email.
--   * public.users.email was NOT NULL UNIQUE when this was generated, and
--     ${S.pending.length} of the ${S.rows.length} rows had no usable address
--     (blank, or a NAME typed into the column). Those got a
--     *.pending@orientation.hyt.local placeholder to satisfy the constraint.
--     Migration 20260101000014 later made the column nullable and retired those
--     placeholders to NULL. The SQL below is kept verbatim so this migration
--     stays reproducible against the schema it was written for, but the
--     CURRENT state of those rows is NULL, not the placeholder.
--   * There was no orientation verdict anywhere in the schema, so
--     orientation_status is added here as an enum. 'pending' is the default and
--     is what self-registration produces.
--
-- Password for every seeded login: HytOrient2026!
-- Rotate it, or drop the auth rows and let each student register themselves,
-- before this reaches a real event.
--
-- Safe to re-run: every INSERT is ON CONFLICT DO NOTHING.
--
-- Run it from the Supabase SQL editor (or psql), then reload the PostgREST
-- schema cache so the REST API can see the new enum column:
--
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================
`;

const enumBlock = `
-- ----------------------------------------------------------------------------
-- 1. orientation_status
-- ----------------------------------------------------------------------------
--
-- 'approved' - attended the last orientation, cleared to enter
-- 'declined' - did not attend / did not pass, turned away
-- 'pending'  - not yet evaluated. Default, and what self-registration gets.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orientation_status') THEN
    CREATE TYPE public.orientation_status AS ENUM ('approved', 'declined', 'pending');
  END IF;
END
$$;

-- Outside the DO block because a type cannot be created and consumed by
-- ALTER TABLE in the same statement batch on every Postgres version.
-- ADD COLUMN IF NOT EXISTS emits a notice rather than an error on re-run.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS orientation_status
  public.orientation_status NOT NULL DEFAULT 'pending';

-- The scanner looks a person up on every scan to decide whether to admit them,
-- so this lookup has to stay fast as the cohort grows.
CREATE INDEX IF NOT EXISTS users_orientation_status_idx
  ON public.users (orientation_status);
`;

const courseBlock = `
-- ----------------------------------------------------------------------------
-- 2. Courses - the programmes in this cohort
-- ----------------------------------------------------------------------------
--
-- 20260101000011 seeded generic labels (Orientation, Safety Training, ...).
-- These are the actual TESDA qualifications, which is what the front desk needs
-- to read at a glance. Added as their own rows so they appear as separate
-- selectable options in the register form and the admin user modal.

INSERT INTO public.courses (label) VALUES
${S.programmes.map((p) => `  (${S.esc(p)})`).join(',\n')}
ON CONFLICT (label) DO NOTHING;
`;

const authBlock = `
-- ----------------------------------------------------------------------------
-- 3. auth.users - the login each profile row hangs off
-- ----------------------------------------------------------------------------
--
-- email_confirmed_at is set because staff are pre-provisioning these: nobody
-- should have to click a confirmation link to walk through the door.
--
-- SECURITY: writing to auth.users requires the service_role key or the SQL
-- editor, which is where this runs. It is deliberately NOT done through the
-- REST API - the "users insert own row" policy would correctly refuse it, and
-- routing around that policy is exactly the sort of thing a seed script should
-- not do.
--
-- crypt()/gen_salt() come from pgcrypto, which Supabase enables by default.
-- The password is bcrypt-hashed here and never stored in plain text.
--
-- No ON CONFLICT here, unlike the other two inserts. Supabase's auth.users has
-- no unique constraint on the email column - it is nullable and uniqueness is
-- enforced by the GoTrue service layer rather than by an index - so
-- ON CONFLICT (email) has nothing to match and aborts the statement:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The WHERE NOT EXISTS guard is what makes this re-runnable instead, and it
-- behaves the same whether or not an index happens to exist. It is not atomic
-- against a concurrent second run, which is fine for a one-off seed.

INSERT INTO auth.users (
  id, email, encrypted_password, raw_user_meta_data,
  created_at, updated_at, email_confirmed_at
)
${S.authValues};
`;

const userBlock = `
-- ----------------------------------------------------------------------------
-- 4. public.users - the profile rows the app actually reads
-- ----------------------------------------------------------------------------
--
-- role 'visitor' for everyone: this cohort grants no permission, it only grants
-- or denies building entry. Nobody is promoted to 'admin' here - the schema
-- enforces a single admin via users_single_admin_idx, so a second one aborts
-- the whole migration.
--
-- Every row starts 'pending'. Flip the verdict afterwards, e.g.:
--
--   UPDATE public.users SET orientation_status = 'approved'
--    WHERE course_id = (SELECT id FROM public.courses WHERE label = 'Barista NC II');

-- The display name is assembled from the parts rather than trusted as free
-- text, so nobody ends up stored as "Lucero, Ana Mae".
INSERT INTO public.users (
  id, email, name, role, visitor_type_id, course_id,
  last_name, first_name, middle_name, middle_initial, name_extension,
  orientation_status
)
SELECT
  a.id,
  u.email,
  TRIM(BOTH ' ' FROM CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)),
  'visitor',
  vt.id,
  c.id,
  u.last_name,
  u.first_name,
  u.middle_name,
  u.middle_initial,
  u.name_extension,
  'pending'
FROM (VALUES
  -- programme, last, first, middle, middle_initial, extension, email
${S.seedRows}
) AS u(programme, last_name, first_name, middle_name, middle_initial, name_extension, email)
JOIN auth.users a
  ON a.email = u.email
LEFT JOIN public.visitor_types vt
  ON vt.label = 'Trainee'
LEFT JOIN public.courses c
  ON c.label = u.programme
ON CONFLICT (email) DO NOTHING;
`;

const verifyBlock = `
-- ----------------------------------------------------------------------------
-- 5. Verify
-- ----------------------------------------------------------------------------

-- Cohort size per programme. Expect ${S.programmes
  .map((p) => `${p}: ${S.counts[p]}`)
  .join(', ')}.
SELECT c.label AS programme, COUNT(*) AS students
FROM public.users u
JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN (${S.list})
GROUP BY c.label
ORDER BY c.label;

-- Everyone seeded, with their current verdict, so the front desk can eyeball
-- the gate before the event.
SELECT
  u.orientation_status,
  c.label AS programme,
  u.name,
  u.email
FROM public.users u
LEFT JOIN public.courses c ON c.id = u.course_id
WHERE c.label IN (${S.list})
ORDER BY c.label, u.last_name, u.first_name;

-- ${S.pending.length} of ${S.rows.length} rows had no usable email in the source
-- roster. These CANNOT receive a pass until a real address is supplied:
--
--   UPDATE public.users SET email = 'real@example.com'
--    WHERE email = 'the.placeholder@orientation.hyt.local';
--
SELECT last_name, first_name, middle_name, email
FROM public.users
WHERE email LIKE '%.pending@orientation.hyt.local'
ORDER BY last_name, first_name;
`;

fs.writeFileSync(
  OUT,
  [header, enumBlock, courseBlock, authBlock, userBlock, verifyBlock].join('\n'),
  'utf8'
);

console.log('wrote       :', path.relative(process.cwd(), OUT));
console.log('total rows  :', S.rows.length);
console.log('real email  :', S.rows.length - S.pending.length);
console.log('placeholder :', S.pending.length);
console.log('programmes  :', S.counts);