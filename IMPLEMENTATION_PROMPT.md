# Implementation Prompt — Schema Migration + Scan Flow

A self-contained brief for updating this codebase. Follow it in order; each
section depends on the one before it.

---

## Context you need

HYT Wayfinder is a visitor management system with **two separate kinds of QR
scan**:

- **Attendance** — one code at the ground floor entrance. The only thing that
  clocks someone in or out. Table: `clock_in_records`.
- **Room presence** — one code per room door. Records only that someone is in
  that room. Table: `room_visits`.

The database schema is being **replaced** with
`supabase/migrations/20260101000001_full_schema.sql`. Rationale and ERD are in
`supabase/SCHEMA.md`. The code currently does **not** match it.

The target database is **fresh** — no data migration or backfill is needed.
Create clean tables, don't write `ALTER` migrations.

---

## Section 1 — Run the new schema

In the Supabase SQL editor, in order:

1. `supabase/migrations/20260101000001_full_schema.sql`
2. `supabase/seed.sql` (the 11 rooms)

Five tables: `rooms`, `purposes`, `users`, `clock_in_records`, `room_visits`.

Room list to seed:

| Room | Name | Floor |
| --- | --- | --- |
| Room 201 | Tech Room 201 | 2 |
| Room 202 | Tech Room 202 | 2 |
| Room 301–304 | Room 301, 302, 303, 304 | 3 |
| Room 401–404 | Room 401, 402, 403, 404 | 4 |
| Roofdeck | Roofdeck | Roof |

Room display names are placeholders and will be updated later. Only the numbers
and floors are authoritative right now.

---

## Section 2 — Key schema changes to code against

**Old → new:**

| Old | New |
| --- | --- |
| `room_presence` table | `room_visits` table |
| `room TEXT`, `room_label TEXT` | `room_id UUID` FK → `rooms.id` |
| `entered_at` / `exited_at` | unchanged names, but FK now instead of text |
| `clock_in_records.destination` | `room_id UUID` FK → `rooms.id` |
| `clock_in_records.duration` (TEXT) | `duration_minutes INT`, **generated**, null while open |
| `clock_in_records.status` (TEXT) | **generated** — do not write it |
| `users` had `building`, `destination` | `room_id` now lives on `clock_in_records` |
| — | `purpose_id` FK → `purposes` (new) |
| `users` deleted on removal | `archived_at` instead — no deletes |

**Four rules that will bite if missed:**

1. **`duration_minutes` and `status` are GENERATED columns.** Postgres
   computes them. Any INSERT or UPDATE that includes them will fail. Stop
   computing duration in JavaScript.
2. **`room_visits` has no `room_label`.** Join `rooms` to get the display name.
3. **`users` has no `building` / `destination`.** The assigned room is now on
   `clock_in_records.room_id`. User creation may still accept a destination and
   write it to the user's first attendance record, or hold it pending.
4. **`room_visits.clock_in_id`** links each room entry to the attendance visit
   it happened under. Populate it — without it, room history blurs across days.

---

## Section 3 — Scan flow (Option D)

The goal: **users never have to remember to check out after leaving a room.**
The system already knows where they are, so don't ask them to report it.

### The flow

1. **Arrive** → scan the **entrance** code. Clocked in, route shown.
2. **Enter a room** → scan the **room** code. Presence recorded.
3. **Leave the building** → scan the **entrance** code again. Clocked out, and
   any open `room_visits` row is closed automatically.

Three scans for a normal visit. The entrance code is the only thing that changes
attendance.

### Rules

- **R1 — Room scans require an active check-in.** If `status !== 'not-clocked-in'`
  is false, refuse the scan and say *"Check in at the entrance first."* Offer a
  button that starts the check-in flow, since the person has clearly arrived.
  *(This is a real bug today: `components/QRScanner.tsx` checks the user is
  logged in but never checks attendance, so a visitor can walk into Room 304,
  never touch the entrance code, and create a presence row that contradicts
  their attendance record.)*

- **R2 — Clocking out while inside a room asks first.** If an open
  `room_visits` row exists, show a confirm dialog: *"You're recorded in Room 304.
  Clock out now?"* with **Cancel** and **Clock out anyway.** This is the only
  genuinely ambiguous action in the flow, so make the user choose.

- **R3 — Clock-out closes any open room row.** Whichever way R2 is answered,
  end consistent: clock-out closes the open `room_visits` row too. If they
  cancel, they remain checked in and inside the room.

- **R4 — Scanning a different room is a move.** Close the current open row,
  open the new one. The partial unique index
  (`room_visits_one_open_per_user`) already enforces one-open-per-user; make
  sure the client closes before inserting so it doesn't trip the constraint.

### No mode toggle

Do not add a mode switch. `parseQrValue()` in `lib/wayfinding.ts` already
determines which kind of code was scanned from its prefix. The flow stays
one-button.

Instead, show current state as a plain line so there's no ambiguity without
adding a control — e.g. *"Checked in · In Room 304"* or *"Checked in · In the
lobby"*.

---

## Section 4 — Files to change

| File | Change |
| --- | --- |
| `lib/wayfinding.ts` | Replace the 6 hardcoded rooms with the 11 new ones. Match on `room_number` instead of a local `room` string. Keep the prefix scheme (`HYT-KIOSK-`, `HYT-ROOM-01-`). |
| `store/roomPresenceStore.ts` | Table → `room_visits`. Columns → `room_id`, `entered_at`, `exited_at`. Join `rooms` for names. Drop `room_label`. Add `clock_in_id`. Add clock-out-closes-room. |
| `store/recordsStore.ts` | Insert without `status` / `duration`. Read `duration_minutes`. Write `room_id` + `purpose_id` instead of `destination` / `building`. |
| `store/authStore.ts` | `DESTINATIONS` should come from `rooms` (or be validated against it), not a hardcoded list of 6 old names. |
| `components/QRScanner.tsx` | Implement R1–R4. Add the state line. |
| `components/RoomOccupancy.tsx` | Match on `room_id`. Rooms now come from `rooms`, not the registry. |
| `components/KioskStationView.tsx` | Print all 11 room codes. |
| `app/admin/room-records/page.tsx` | Update to `room_visits` + `rooms` join. |
| `app/admin/records/page.tsx` | Read generated `duration_minutes` / `status`. |

**New:**

- `store/roomsStore.ts` — fetch `rooms`, used by every consumer
- `app/admin/rooms/page.tsx` — **rooms management page** (CRUD on `rooms`),
  linked from the admin dashboard
- Add a `purpose_id` picker to registration and to check-in

---

## Section 5 — Invariants to preserve

These are load-bearing. Don't regress them.

- **Attendance is written only by the entrance code.** Room codes must never
  touch `clock_in_records`.
- **Presence is written only by room codes.** The entrance code must never
  touch `room_visits` (except closing an open row on clock-out, per R3).
- **Never write `user_name` / `user_role` onto visit rows.** Join from
  `users`. Denormalising these is what caused drift before.
- **Never write generated columns.** `duration_minutes`, `status` on both
  visit tables.
- **Never delete attendance history.** `users` uses `archived_at`; the FKs are
  `ON DELETE RESTRICT`.
- **Rooms are referenced by id, never copied as text.**

---

## Section 6 — Definition of done

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No code references `room_presence`
- [ ] No INSERT/UPDATE includes `status`, `duration`, or `duration_minutes`
- [ ] Scanning a room code without checking in is refused (R1)
- [ ] Clocking out inside a room prompts (R2), and closes the room row (R3)
- [ ] All 11 rooms appear at `/station` and on `/occupancy`
- [ ] `/admin/rooms` can list, add, edit and deactivate rooms
- [ ] A visitor's full trail is reconstructable: attendance + every room they
      entered, in order, with times
