# Supabase Setup Guide - HYT Global

Everything the database needs lives in one file:

```text
supabase/migrations/20260101000000_full_setup.sql
```

It creates the enums, all seven tables, generated columns, indexes, functions,
RLS policies, grants, reference data, and the 131-person orientation cohort. It
supersedes the old numbered migrations and `supabase/seed.sql`.

> **Do not look for the old numbered migrations or `supabase/seed.sql`.** They
> were removed once this file replaced them. Running them after the full setup
> can create conflicts.

---

## Prerequisites

- A Supabase project (the free tier is enough).
- Node.js 18+ for the app itself.
- The project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` if you want admin create/archive to work.

---

## Step 1: Create the Supabase project

1. Sign in at <https://supabase.com> and create a new project.
2. Wait for the database to finish provisioning.

Supabase enables the `uuid-ossp` and `pgcrypto` extensions by default. If they
were removed from your project, enable them before running the setup file:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto      WITH SCHEMA extensions;
```

---

## Step 2: Get the API credentials

Dashboard → Project Settings → API. Copy:

| Value | Environment variable |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` (server-only) |

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- `NEXT_PUBLIC_*` values are embedded in the browser bundle by design; RLS, not
  the key, protects the data.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only read on the server by
  `app/api/admin/users/route.ts`. **Never** prefix it with `NEXT_PUBLIC_`.
- `.env.local` is gitignored. Never commit real credentials.

---

## Step 3: Run the database setup

1. Dashboard → SQL Editor → New query.
2. Paste the entire contents of
   `supabase/migrations/20260101000000_full_setup.sql`.
3. Run it once. It is safe to re-run if the first attempt was interrupted.

The script ends with verification queries. On a fresh database you should see:

| Table | Rows |
| --- | --- |
| `rooms` | 11 |
| `purposes` | 8 |
| `visitor_types` | 7 |
| `courses` | 10 |

It also reports the orientation cohort split (Barista 58, Event Management 10,
Housekeeping 52, Hilot 10, Massage 1) and how many cohort rows have no email.

If PostgREST does not see the new tables immediately, reload its schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```

---

## Step 4: Create the first administrator

There is exactly one admin, enforced by the database, not the UI.

1. Create the account through `/register`, the Supabase Auth dashboard, or
   `/admin/users`. Any of these creates the profile row automatically through
   the `handle_new_user` trigger, always as `visitor`.
2. Promote it once:

```sql
UPDATE public.users
   SET role = 'admin'
 WHERE email = 'you@example.com';
```

A second account promoted to `admin` fails with a unique violation, by design.
`/admin/users` hides the admin row so it cannot be accidentally edited or
archived.

---

## Step 5: Test the connection locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in, and try the register and check-in flows.

Useful checks:

```bash
npx tsc --noEmit   # types
npm test           # unit tests
npm run build      # production build
```

---

## How authentication and profiles fit together

- Supabase Auth owns the password and the `auth.users` row.
- `public.users.id` references `auth.users.id` and holds the profile.
- The `handle_new_user` trigger creates a `visitor` profile on signup. It ignores
  any role sent by the client, so self-registration can never mint an admin.
- `/verify` is an **identification** lookup, not authentication. It resolves a
  first name, last name and course to an orientation record and shows a verdict.
  It never creates a session for the person; the session comes from the login
  link sent to the address on file.
- `users.email` is nullable. A person with no address on file (`has_email =
  false`) is sent to the front desk rather than promised a link that cannot
  arrive.

---

## User management (`/admin/users`)

Read and update work over RLS. Create and archive need the service role key.

**To enable create/archive:**

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (see Step 2).
2. Restart the dev server.

Without the key, create/archive return `501` with an explanation, and read/update
keep working.

**How it works:**

- `store/usersStore.ts` — list, create, update, archive.
- `app/api/admin/users/route.ts` — verifies the caller is an admin using their own
  access token, then uses the service client. The service key never reaches the
  browser.
- `app/admin/users/page.tsx` — admin-only table with search, filters, create/edit
  modal, pass renewal and archive confirmation.

Accounts are **archived**, not deleted: `users.archived_at` is set so attendance
history survives. There is no DELETE policy on `users`, `clock_in_records` or
`room_visits`.

---

## Reference data

The setup file seeds:

- **Rooms (11):** Room 201, Room 202, Rooms 301–304, Rooms 401–404, Roofdeck.
- **Purposes (8):** Interview, Orientation, Meeting, Training, Consultation,
  Maintenance, Delivery, Other.
- **Visitor types (7):** Trainee, Trainer, VIP, Guest, Contractor, Intern,
  Observer.
- **Courses (10):** Orientation, Safety Training, Leadership, Technical Skills,
  Onboarding, Barista NC II, Event Management Services NC II, Housekeeping NC II,
  Hilot (Wellness) Services NC II, Massage NC II.

Default room per course is stored in `courses.room_id`. The Hilot and Massage
courses map to `Room 101`, which is **not** in the seeded room list — create it in
`/admin/rooms` for those mappings to take effect.

Manage rooms at `/admin/rooms` and the three lookup tables at `/admin/lookups`.
Rooms are deactivated, never deleted, so visit history survives.

---

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md). Set the environment variables
for all three Vercel environments, then redeploy — Vercel only injects variables
into new builds.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `permission denied for table users` | Service role key missing, or grants not applied | Set `SUPABASE_SERVICE_ROLE_KEY` and re-run the setup file |
| Empty room/purpose pickers before sign-in | `rooms` / `purposes` not readable by `anon` | Re-run the setup file; RLS policies are recreated |
| `permission denied for function verify_visitor` | Function grant missing | Re-run the setup file |
| REST API cannot see a new table | PostgREST schema cache | `NOTIFY pgrst, 'reload schema';` |
| `column ... does not exist` after an old migration | Old partial schema | Run `full_setup.sql`; it adds missing columns with `IF NOT EXISTS` |

---

## Verification checklist

- [ ] `20260101000000_full_setup.sql` ran without errors.
- [ ] Verification output shows 11 rooms, 8 purposes, 7 visitor types, 10 courses.
- [ ] The orientation cohort counts match the five programmes.
- [ ] One account was promoted to `admin`.
- [ ] `.env.local` has the URL, anon key and service role key.
- [ ] `npm run dev` starts and login works.
- [ ] A room QR scan and the ground-floor check-in both record correctly.
