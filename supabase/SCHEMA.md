# Database Schema

Five tables. Two of them record visits, and they deliberately answer different
questions.

```
                       ┌──────────────┐
                       │    rooms     │
                       ├──────────────┤
                       │ id          PK│
                       │ room_number  U│  'Room 304', 'Roofdeck'
                       │ name          │  display name
                       │ floor         │  'G' | '2' | '3' | '4' | 'Roof'
                       │ building      │
                       │ qr_value      U│  encoded door QR
                       │ is_active     │
                       └───────┬──────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │ 1:N                  │ 1:N                  │ 1:N
   ┌────┴──────────┐     ┌─────┴──────────────┐       │
   │    users      │     │ clock_in_records   │       │
   ├───────────────┤     ├────────────────────┤       │
   │ id       PK   │────▶│ id             PK  │       │
   │ email      U  │     │ user_id      FK  │  │    │
   │ name         │     │ room_id       FK ─┼──┼────┘
   │ role      ENUM│     │ purpose_id    FK  │  │
   │ archived_at  │     │ time_in           │  │
   └───────┬───────┘     │ time_out          │  │
           │             │ duration_minutes G │  │
           │             │ status          G │  │
           │             └─────────┬──────────┘  │
           │                       │ 1:N          │
           │ 1:N            ┌──────┴───────┐      │
           └───────────────▶│  room_visits  │      │
                            ├──────────────┤      │
                            │ id        PK  │      │
                            │ user_id    FK │      │
                            │ room_id    FK │──────┘
                            │ clock_in_id FK │  (→ clock_in_records, nullable)
                            │ entered_at     │
                            │ exited_at      │
                            │ duration_min G │
                            │ status       G │
                            └──────────────┘

       ┌────────────┐
       │ purposes   │  purpose_id FK ──▶ label, is_active
       └────────────┘
```

## The two visit tables

| | `clock_in_records` | `room_visits` |
| --- | --- | --- |
| Question | Was this person in the building? | Which room were they in? |
| Written by | ground floor code **only** | room door codes **only** |
| Rows per visit | exactly one | one per room entered |
| Grain | one row per person per visit | append-only movement log |
| `status` | `active` / `completed` | `inside` / `left` |

Keeping these apart is what makes both reports trustworthy. If room scans went
into `clock_in_records`, every room change would need a new attendance row and
"how long was she in the building" would be unanswerable.

`room_visits.clock_in_id` ties each room entry back to the attendance visit it
happened under. Without it, someone who checks in on Monday and Tuesday has
their room scans blurred into one trail.

## Design decisions

**Rooms are referenced, never copied.** No table stores a room name as free
text. Renaming "Tech Room 201" to "Networking Lab" is a single UPDATE, and all
history stays linked because rows point at `rooms.id`.

**Names and roles are never denormalised.** `room_visits` and
`clock_in_records` store `user_id` only. Name and role come from a join, so
renaming a person updates everywhere at once. (The earlier schema carried
`user_name` / `user_role` on the records, which drifted out of sync.)

**`duration` and `status` are generated.** Postgres computes them from the
timestamps, so they cannot disagree with the data they're derived from. Both are
`NULL` while the record is open — Postgres rejects `NOW()` in a generated
column because generated expressions must be immutable, so the UI shows a live
elapsed timer instead.

**History is never deleted.** `users` has `archived_at`, and there is no DELETE
policy on it. Attendance rows use `ON DELETE RESTRICT`, so you cannot destroy an
attendance record by deleting a user — important for a system that is effectively
a log.

**One room at a time is enforced in the database**, not just the app:

```sql
CREATE UNIQUE INDEX room_visits_one_open_per_user
  ON public.room_visits (user_id) WHERE exited_at IS NULL;
```

If two scans race, the second fails loudly instead of double-counting someone.

**Foreign keys are indexed explicitly.** Postgres does not create these for you,
and the partial indexes on open rows (`WHERE time_out IS NULL`) are what keep
"who's in the building right now" fast as the tables grow.

## RLS

Admins are checked against `public.users` via `is_admin()` rather than JWT
claims, so changing someone's role takes effect immediately instead of waiting
for a token refresh.

Users can **open** their own attendance and **close** their own open record, but
cannot freely update one. That closes a real hole in the previous schema, where
`Users can update own records` let anyone edit their own `time_in` after the
fact — falsifiable attendance.

## Applying it

Fresh database, in this order:

1. `supabase/migrations/20260101000001_full_schema.sql` — tables, indexes, triggers, RLS
2. `supabase/seed.sql` — the 11 rooms

Then create your first admin in Supabase Auth (Authentication → Users → Add
User) and insert the matching profile row:

```sql
INSERT INTO public.users (id, email, name, role)
VALUES ('AUTH-USER-UUID', 'admin@hyt.com', 'Admin', 'admin');
```

> This schema **replaces** the original tables. The app has not been updated to
> match yet — see `IMPLEMENTATION_PROMPT.md` at the repo root.

## Still to decide

- **Room display names.** Seeded as "Room 301", "Tech Room 201" etc. Update
  `supabase/seed.sql` once the real names are known.
- **Roof access.** `Roofdeck` is a room like any other. If it should only be
  bookable, that likely needs a booking table.
