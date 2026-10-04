# Session Summary

**Last updated:** 2026-04-10

The most recent state of the project. This file is **overwritten each session** —
it describes where things stand *now*, not a running history. Older context lives
in git log and the `*.md` docs at the repo root.

---

## 1. Where the work stands

### Repo state

| | |
| --- | --- |
| Branch | `main` @ `1d12e61` ("MONDAY-CHAAN") |
| Working tree | Clean, in sync with `origin/main` |
| `tsc --noEmit` | Passes, 0 errors |
| `npm run build` | Succeeds, 16 routes (warnings only) |

### Stale worktree — safe to delete

`.codebuddy/worktrees/bg-345c18b4` sits on branch `worktree-bg-345c18b4` @ `4294147`,
which is **12 commits behind `main`**. It has one uncommitted file,
`store/authStore.ts`.

**Nothing in it is worth recovering.** Its three changes were all reimplemented on
`main` in a better form:

- *Friendly auth errors* → `main` handles `alreadyRegistered` inline at
  `store/authStore.ts:298`, with a more accurate rationale and a "Go to sign in"
  affordance in `app/register/page.tsx:182`.
- *Upsert instead of insert* → `main:355`, with the conflict update deliberately
  scoped to `name`/`email` so a re-register can't downgrade an admin-granted role.
- *Avatar upload* → superseded by the trigger-created profile row.

The worktree also still carries the dead `trainer`/`trainee` roles and the old
6-room list, both long since removed on `main`.

```bash
# only if you want it gone — verify first, this deletes the uncommitted diff
cd .codebuddy/worktrees/bg-345c18b4 && git --no-pager diff
git worktree remove .codebuddy/worktrees/bg-345c18b4
```

---

## 2. IMPLEMENTATION_PROMPT.md is complete

The schema migration + scan-flow brief is finished. Verified against its own
Section 6 Definition of Done:

- [x] `npx tsc --noEmit` passes
- [x] `npm run build` succeeds
- [x] No code references `room_presence` (0 hits in `app`/`store`/`lib`/`components`)
- [x] No INSERT/UPDATE writes generated columns — see `store/recordsStore.ts:107`
- [x] R1 a room scan without check-in is refused — `components/QRScanner.tsx:171`
- [x] R2 clocking out inside a room prompts — `components/QRScanner.tsx:227`
- [x] R3 clock-out closes the open `room_visits` row — `components/QRScanner.tsx:98`
- [x] R4 scanning a different room is a move — `components/QRScanner.tsx`
- [x] All 11 rooms in `lib/wayfinding.ts` (201, 202, 301–304, 401–404, Roofdeck)
- [x] `/admin/rooms` lists/adds/edits/deactivates rooms
- [x] A visitor's full trail is reconstructable (joined by `room_visits.clock_in_id`)

Delivered alongside it: `store/roomsStore.ts`, `app/admin/rooms/page.tsx`, and
`purpose_id` pickers on registration and check-in.

⚠️ **The checklist boxes in `IMPLEMENTATION_PROMPT.md` are still unticked** even
though the work is done. Tick them or the file misleads the next reader.

---

## 3. Vercel env vars — DONE ✅

**Resolved.** New Supabase project is `frcamqyvejmnbvvndpdj`; migrations applied;
localhost working; **Vercel env vars set and deploying.**

Verified locally:
- Both JWTs decode to `ref: frcamqyvejmnbvvndpdj` (`role: anon` / `role: service_role`) —
  a correct matching pair, no regeneration needed. Expire 2036.
- Grepping every `process.env` reference found **exactly three** variables, so nothing
  else can be missing later:
  - `NEXT_PUBLIC_SUPABASE_URL` → `lib/supabase.ts:3`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `lib/supabase.ts:4`
  - `SUPABASE_SERVICE_ROLE_KEY` → `app/api/admin/users/route.ts` (server only)
- `.env.local` is untracked and gitignored — no secret was ever committed.
- The service role key string **never appears in git history** (`git log -S` on the
  token returns nothing).

### Two gotchas already handled — confirm if unsure

1. `SUPABASE_SERVICE_ROLE_KEY` must be on **all three** environments. Preview-only
   means every preview deploy silently loses admin create/delete (returns `501`, looks
   like a code bug, no error shown).
2. After adding variables, **Redeploy** is mandatory — Vercel bakes env vars in at
   build time, so the pre-variable deploy stays broken regardless of refreshes.

### Post-deploy smoke test

1. URL loads the login page (not a network error).
2. Log in works.
3. Admin → `/admin/users` lists users. Create/Delete returning `501` means the service
   role key is missing or on the wrong environment.
4. Check `/station` shows all 11 rooms, and `/occupancy` too.

---

## 4. Security

**Demo credentials are in git history — but the severity is lower than it looks.**

`VERCEL_DEPLOYMENT.md:137-138` and `SUPABASE_SETUP.md:419,453` contain
`admin@hyt.com / admin123` and `visitor@hyt.com / visitor123`. Commits `f53821c` and
`9d00963` put them on the login page UI; that UI is gone on `main`
(`app/login/page.tsx` is clean), but the values persist in history.

Why this is **low** urgency:
- The new Supabase project is **fresh** — those accounts almost certainly do not exist
  in it, and `@hyt.com` is not a domain the user controls, so nobody receives mail there.
- Worst case is an unauthenticated user guessing a role. The partial unique index on
  admin means a stolen "admin" claim cannot create a second admin.

Why it still needs doing:
- If the pattern is ever reused, the habit leaks. The values sit in a **public** repo
  (`github.com/IwanttodieXD/hyt-wayfinder`).

**Action:** scrub the plaintext values from `VERCEL_DEPLOYMENT.md` and
`SUPABASE_SETUP.md`, replacing with "create your own admin" instructions. A history
rewrite is optional — low urgency given a fresh database.

**Verified safe:** `.env.local` is untracked and gitignored, and the
`SUPABASE_SERVICE_ROLE_KEY` string **never appears anywhere in git history**
(`git log -S` on the token returns nothing). No key rotation is needed.

**Keep `SUPABASE_SERVICE_ROLE_KEY` un-prefixed.** It bypasses all RLS. It is only safe
because it has no `NEXT_PUBLIC_` and is read server-side in
`app/api/admin/users/route.ts`. Never rename it.

**New migration `20260101000006_default_pass_expiry.sql`** sets a column DEFAULT on
`users.valid_until` = `date_trunc('day', now()) + interval '1 day' - interval '1 second'`
(end of today). Chosen over dropping the two columns — see §5 for why.

Why a DEFAULT and not a CHECK or BEFORE trigger: a DEFAULT only fires when the writer
**omits** the column, so it cannot clobber an explicit value. A CHECK/trigger cannot
distinguish "admin chose never-expire (NULL)" from "writer forgot the field", so it
would have made a long pass impossible to create — the opposite of what the admin form
promises. Verified `route.ts:177` sends an explicit `null` for the blank-date case,
which correctly bypasses the DEFAULT.

Existing rows are deliberately untouched — backfilling would lock out anyone currently
holding a pass. `valid_until` is `TIMESTAMPTZ`, and `date_trunc` resolves in the session
timezone. Date arithmetic simulated for an ordinary day, a 31st→1st rollover, and
Dec 31: all produce 23:59:59 today, not-expired today, expired tomorrow.

---

## 5. Remaining work, in priority order

### Deferred: dropping `host_name` and `notes`

**Decided against, for now.** `users.host_name` and `users.notes` still exist, are
still `SELECT`ed by `usersStore`, and `hostName` is still displayed in the admin user
list. Only the editing UI was removed.

If these columns are ever dropped, these must change **in the same change** or the
whole admin users page breaks with a Postgres "column does not exist" error:
- `store/usersStore.ts:116-122` — both SELECT strings list them
- `store/usersStore.ts:21,25` `ManagedUser` fields; `:141,144` `mapRow`
- `store/usersStore.ts:50,53,61,64` input types; `:340,342` optimistic update
- `app/api/admin/users/route.ts:120,174,176,232,261,263`
- `app/admin/users/page.tsx:466` list cell, `:140` search filter
- `lib/supabase.ts:49,62,74` (dead `Database` type — see P3)

Dropping is genuinely irreversible and the columns are nullable with no dependents, so
there is no urgency. Do it as a deliberate, self-contained change if the front desk
confirms they never use them.

### P1 — Documentation drift (unstarted, low risk, pure win)

- `PROJECT_SUMMARY.md` §8 "Known gaps" is **factually wrong now**. It still says *"The
  app still writes to the old `room_presence` table… the code has not been updated to
  match yet — see `IMPLEMENTATION_PROMPT.md`"*. All of that shipped. This is the most
  misleading file in the repo.
- `IMPLEMENTATION_PROMPT.md` §6 checkboxes are all unticked despite the work being
  done (§2).
- `VERCEL_DEPLOYMENT.md:124-141` documents a test-login flow using the demo credentials;
  `:348` claims "No environment secrets needed ✅" (false — three are required);
  `:326-340` has an unticked pre-deploy checklist.
- Scrub demo credentials from `VERCEL_DEPLOYMENT.md` + `SUPABASE_SETUP.md` (§4).

### P2 — Dead code cleanup (safe, mechanical)

- `package.json` has four dead scripts: `prisma:generate`, `prisma:migrate`,
  `prisma:seed`, `prisma:studio`. Confirmed **no `prisma/` directory exists** — these
  all point at a Prisma setup replaced by Supabase. Safe to delete.
- `.gitignore:44` still has `prisma/migrations/**/*.sql` for the same dead tool.

### P3 — Code quality (warnings only, build passes)

- `next lint` warnings: `<img>` instead of `next/image` in several components, plus
  two `exhaustive-deps` in `components/RouteVisualization.tsx:135` and `:351`.
- `lib/supabase.ts:8-117` — the hand-written `Database` interface is **dead and wrong**.
  Verified: declared at `:9`, **never imported or referenced anywhere** in the codebase,
  and `createClient` isn't passed it, so it enforces nothing. Worse, it describes the
  pre-migration schema: `users.destination`, writable
  `clock_in_records.destination/building/room/status/duration`, and a `schedules` table
  that exists in **no migration** (`grep -rln schedules supabase/migrations/` → nothing).
  Delete it, or regenerate from the live schema.

### P4 — No tests (deliberate, but worth noting)

No test runner configured (no jest/vitest/playwright config, no `test` script). The QR
parser (`lib/wayfinding.ts:parseQrValue`) and presence logic are the highest-value
candidates — the parser is pure and easy to test, and the R1–R4 rules are exactly the
kind of thing that regresses silently. Requires adding a runner.

**Registration and admin forms slimmed down; self-registered passes expire after 1 day.**
Removed `host_name` ("Who are you here to see?" / "Here to see") and `notes` from
**both** `/register` and `/admin/users`, so the two forms now collect the same set.
Rationale: a visitor cannot name the person they're meeting, and has nothing to put in
a front-desk note. Staff-supplied-only fields on a visitor-supplied form were noise.

Expiry is deliberately **asymmetric**:
- **Register** → auto-sets `valid_until` to end of today, no field shown. Walk-in
  accounts can't quietly stay valid for months.
- **Admin add user** → keeps the manual "Pass valid until" date input. Staff know
  someone is on site for a week; a blanket 1-day rule would lock them out.

Wiring: `authStore.register` takes a new optional `validUntil` (ISO) and writes
`valid_until` in the upsert — **only when supplied**, so re-registering an account an
admin gave a long pass doesn't silently shorten it back to today.

Verified against the RLS policy: `"users insert own row"` is
`WITH CHECK (auth.uid() = id AND role = 'visitor')`, which places no restriction on
`valid_until`, so self-registration may set it. Boundary-tested the expiry logic by
extracting `isPassExpired` verbatim: end-of-today → not expired today, expired from
tomorrow; null → never expires; yesterday → expired.

Deliberately NOT removed: the `users.host_name` / `users.notes` **columns**, the
`ManagedUser` fields, the SELECT in `usersStore`, the API route's handling, or the
existing host name still shown in the admin user list. Existing data must stay
readable — only the editing UI went away.

**Register form: room picker shows names, purpose label shortened; dead `DESTINATIONS`
export removed.** The assigned-room `<option>` **value is still the room number** while
the label is now `Name (Room 201)`. That split is load-bearing:
- `QRScanner.tsx:261` resolves the pending destination via `getRoomByNumber(...)` → needs the NUMBER
- `wayfinding.ts:207routeIdForDestination` matches `r.room` first → also needs the NUMBER
- `register()` stores it in the persisted session only, never the DB

So the label is free to be human-readable without touching any resolution logic.

Options now come from `getActiveRooms()` (the `rooms` table) instead of a hardcoded
11-entry array, so a room added in `/admin/rooms` is immediately assignable. Deleted
`DESTINATIONS` / `Destination` from `store/authStore.ts` — the last consumer was the
register form.

`Reason for your visit` → `Purpose`, still fed from the `purposes` table.

**Admin add-user form deliberately has NO room or purpose field**, matching register's
*persisted* field set minus the two session-only ones. `users` has no destination or
purpose column — both live on `clock_in_records` because they change per visit. An
admin creating someone else has no session to write them into, so adding the fields
would collect input and silently discard it. Attempted and reverted for that reason;
documented in a comment at `app/admin/users/page.tsx:701`.

**Occupance page groups rooms into one container per floor** (`components/RoomOccupancy.tsx`).
Each floor gets a `<section>` with a heading, a divider rule, and a per-floor headcount
("2 people · 2 rooms"). Rooms bucket by `floor`; `FLOOR_ORDER` mirrors the one in
`roomsStore` so groups come out G→2→3→4→Roof.

`floorLabel()` renders 1st/2nd/3rd/4th with the full `%100 in 11..13` rule, so it stays
correct if a 5th floor is added. `rooms.floor` is TEXT constrained to
`('G','2','3','4','Roof')` — a new floor value needs a schema change to
`rooms_floor_check`, and `?? 99` would sort it after Roof until then.

A **retired** room (present in presence rows but not active) recovers its floor from
`getAllRooms()`. If it's missing there too, floor is `''` and it lands in a trailing
"Other Rooms" group rather than being hidden — presence data must not disappear.

Room cards themselves are unchanged: whole-header `<button aria-expanded>`, several open
at once, empty rooms clickable. Nested grid is `items-start` so one expanded card doesn't
stretch its floor-mates.

Verified: `tsc` 0 errors, `next lint` clean, build 16/16. Lint initially failed with
`react/jsx-no-comment-textnodes` + `react/no-unescaped-entities` — a `//` comment placed
in JSX children position instead of `{/* */}`. Caught by lint, fixed.

**Admin add-user form now matches register** (room + purpose pickers added), enabled by
**new migration `20260101000007_pending_visit_intent.sql`** adding
`users.pending_room_id` / `pending_purpose_id` (both nullable FKs, `ON DELETE SET NULL`).

This resolves the blocker flagged earlier. The reason the admin form had no room/purpose
was that there was nowhere to persist them: register holds them in the *visitor's own*
session, and an admin creating someone else has no such session. Two columns make the
intent survive to check-in.

Design points not to re-derive:
- Named **pending**, not `destination`/`purpose` — those belong to a visit
  (`clock_in_records`), one row per visit. Pending only *seeds* the first visit.
- **The two forms store different shapes, deliberately.** Register sends the room
  NUMBER (session value, consumed by `getRoomByNumber`); admin sends the room ID
  (column is a FK). Both converge at `pendingFromProfile()` in `authStore.ts`, which
  resolves ids → number/label so `QRScanner` reads one shape either way.
- `pendingFromProfile()` is called from **both** sign-in paths (login + session
  restore), each preceded by `fetchRooms()`/`fetchPurposes()` when the columns are
  present — otherwise the rooms list is empty at that moment and the assignment
  silently resolves to nothing.
- Register now ALSO persists its pickers, so the choice survives sign-out.
- `usersStore` SELECT gained a third tier for 007 absence. **Pre-existing bug fixed
  here:** the retry chain referenced an undefined `SELECT_COLUMNS_BASE`, so a database
  missing migration 004 threw a ReferenceError instead of falling back.
- Assigned room/purpose shown in the admin user list under the email.
- `Create Visitor` button → `Create`.

`host_name` and `notes` remain uneditable on BOTH forms (per the earlier request).

**Migration 007 verification block rewritten.** The first version failed in the Supabase
SQL editor with `42601: syntax error at or near "column"` — `column` is a **reserved word
in Postgres**, so `FROM (VALUES (...)) AS expected(column)` is invalid. Replaced the
VALUES list with two plain `SELECT EXISTS` scalar lookups, which cannot hit that class of
problem. The `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` above it was always fine, so the
columns may already be created — the file is re-runnable.

Migration 006 uses `column_default`/`column_name` as *column names*, which is legal; only
using `column` as an *alias* breaks. Verified 006 is unaffected.

⚠️ Lesson: no Postgres is available locally (no psql, no docker/podman), so migration SQL
cannot be executed before shipping. Prefer constructs that avoid aliasing keywords.

**Admin user table now shows "Assigned / Purpose"** instead of "Host / Company". Room
name + number on the first line, purpose beneath, company as tertiary. Host name is gone
from the list because it is no longer editable anywhere.

Search extended to match room name, room number and purpose label, with `rooms` and
`purposes` added to the `useMemo` deps — they were previously not dependencies, so
searching by them would have returned nothing. Placeholder updated to "Search name,
email, room, or purpose...". Host name is still searched (legacy rows), just not shown.

**Visitor UI cleaned up — and two real data bugs fixed along the way**
(`components/StudentMobileView.tsx`, `app/visitor/page.tsx`,
`hooks/useClockInProfile.ts`, `store/clockInStore.ts`).

Bugs found while restyling:
- `student.building` and `student.room` were **hardcoded placeholders** (`'Building B'`,
  `'Room 304'`) that no action ever updated, so the header rendered *"Building B, Room
  304"* under **every** destination. Now resolved from the `rooms` table via
  `getActiveRooms().find(r => r.roomNumber === user.destination)`.
- `student.id` was initialised to `''` and never set, rendering a bare **"ID #"**. Field
  deleted; email shown instead.
- `fetchRooms()` was missing from both `/visitor` and `/check-in`, so any room name
  resolved from `rooms` would be empty. Moved into `useClockInProfile()` — the shared hook
  both pages already call — so neither route can forget it. `fetchRooms` is now a dep of
  that effect.

Layout changes:
- Header collapsed from a stacked block + separate destination card + separate
  check-in-time row into **one identity row + one info strip** (room name · number, with
  check-in time beside it behind a divider). Less vertical chrome, more scan area.
- Status pill shortened `NOT CHECKED IN` → `Not In` (the `uppercase tracking-wider` was
  what made it long, so that was dropped).
- Added a plain-language **next step** line, which did not exist: tells the visitor whether
  to scan the entrance, a room door, or scan again to leave.
- `/visitor` header slimmed (logo 48→36px, `py-3`→`py-2.5`, "Welcome, X" → "X").

Verified: `tsc` 0, build 16/16, lint clean, no dangling `student.*` references.

**`/occupancy` now actually refreshes** (`components/RoomOccupancy.tsx`). The page was
titled "Live Occupancy" but only fetched once on mount — the counts silently froze, which
matters now that rooms are clickable. 30s poll, **skipped while the tab is hidden**, with
a `visibilitychange` refetch on return so figures are never stale when visible. Matches the
existing `setInterval` pattern in `KioskStationView.tsx:75`.

Details worth knowing:
- `refreshingRef` guards **overlapping requests**. 30s is shorter than a slow connection
  takes, so without it two requests race and the slower can land last, showing *older* data
  than the newer response. Same pattern `fetchRooms` already uses. A ref, not state, so it
  doesn't re-render.
- A "just now" / "updated Ns ago" label in the header. Repainted by a **separate 10s
  interval that does no network work** — `setLastRefreshed` only fires on real fetches.
  Two timers with different jobs; don't merge them.
- Verified `fetchTodayRecords`/`fetchTodayPresence` are defined once in the Zustand store,
  so refs are stable and the interval effect won't re-run.

**Deleted the dead `Database` interface** (`lib/supabase.ts`, 117→27 lines). Confirmed via
grep it was declared and never imported, never passed to `createClient`. Replaced with a
comment explaining why it's gone and pointing at `npx supabase gen types` — **generate, do
not hand-maintain**, since hand-editing recreates exactly the drift that made it wrong.

Verified: `tsc` 0, build 16/16, lint clean on both files.

**Fixed: admin room/purpose edits saved but never showed up in the list**
(`store/usersStore.ts`). `createUser` refetches via `fetchUsers()`, but `updateUser`
uses an **optimistic local mirror** instead — and that mirror never handled
`pendingRoomId`/`pendingPurposeId`. The PATCH reached the database correctly; the table
just kept rendering the previous assignment until a full page reload. Added the two
`if (updates.X !== undefined)` lines next to the existing ones.

Worth knowing for any future field added here: **a new column is written by the API
route but will not appear in the list until it is also mirrored in `updateUser`'s
optimistic block.** `createUser` is safe (it refetches); only edit needs the mirror.
The mirror stores raw ids — the table resolves display text from `rooms`/`purposes`.

**Phone formatting added** (`lib/phone.ts`, new). `tidyPhone()` normalises whitespace and
dash spacing **without assuming a country code** — per the user's choice, whatever they
type is preserved; nothing is regrouped or has `+63` added/removed.

Wired into both `/register` and `/admin/users` phone inputs, plus the admin list cell.

Two design points that took a bug to get right:
- **The dash rule is symmetric and decided in ONE pass.** `/(\S)( ?)-( ?)(\S)/` keeps
  `"0917 - 1234"` (space both sides = deliberate) but strips `"0917- 1234"` and
  `"0917 -1234"` (space on one side = a slip). An earlier two-step version collapsed the
  spaces first and then tried to restore them — which **destroys the evidence** needed to
  tell a deliberate group from a typo. My test caught it producing `"0917 -1234"`.
- **Idempotent** (verified: `tidy(tidy(x)) === tidy(x)` for 16 inputs). This is what makes
  it safe to run on every keystroke without the caret jumping.

Also: `inputMode='tel'` + `autoComplete='tel'` for the numeric keypad on mobile. Stored
value is untouched on display-tidying — `tidyPhone` is applied when rendering list rows, so
pre-existing ragged data reads correctly without a migration.

⚠️ `isReasonablePhone()` is written but **not yet used** — deliberately not wired as a
hard validation, since the column is descriptive only (no SMS is ever sent) and rejecting
an unusual-but-valid number would be worse than storing it.

**Phone now actually formats** (`lib/phone.ts`, both forms). Two bugs found:

- A comment in `register/page.tsx` described an `onBlur` that **did not exist** in either
  form. So nothing ever applied the promised formatting.
- `tidyPhone` deliberately never regroups digits (it runs per-keystroke, and reordering
  moves the caret), so `09171234567` rendered as `09171234567`. Correct by design for
  keystrokes, but it meant the field *looked* broken.

Added `formatPhone()` in `lib/phone.ts`, applied via `onBlur` in `/register` and
`/admin/users`. On blur there is no caret to disturb, so regrouping is safe there.
**tidy on keystroke, group on blur** — do not merge these.

Rules: any `-()./` the user typed is respected untouched (they chose that grouping);
otherwise 11 digits → `0917 123 4567`, 10 → `917 123 4567`, longer → 4s. A leading
`+` is preserved, and a `63` country code on a 12-digit number is split as
`+63 917 123 4567`.

Tested 13 cases incl. `+63` intl, dashed, parenthesised landline, deliberate
`0917 - 1234`, sub-7-digit, empty, messy paste — **all idempotent** (formatting twice ==
once), which matters because onBlur can fire repeatedly.

Bugs I introduced and caught by testing before shipping: first version dropped the `+`
entirely (`+639171234567` → `6391 7123 4567`) and mis-split 11 digits as `091 712 3 4567`;
then the 63-strip used `length === 13` when 2 + 10 = 12.

Removed the "Any format is fine…" hint from register and "Spaces, dashes and +63 are kept
as typed" from admin — both described behaviour that did not match reality.

**Phone input restricted to valid characters** (`lib/phone.ts`, both forms). Two
mechanisms, both needed:

- `onKeyDown` + `isAllowedPhoneKey(key, ctrlOrMeta)` → `preventDefault()` so the
  character never renders. Filtering alone makes letters blink out after appearing,
  which reads as a broken field.
- `onChange` + `sanitisePhone(value)` → catches **paste**, because keydown does not
  fire for pasted content. Cap is 30 chars.

Allowed: digits `+ - ( ) . /` and space. **Not digits-only** — blocking `+` would make
`+63 917 123 4567` untypeable. The set is deliberately identical to the characters
`formatPhone` treats as "the user chose this layout"; if they disagreed the field would
accept something then discard it.

Ctrl/Cmd combos always allowed, so Cmd+A / Cmd+V keep working.

⚠️ Bug caught while testing: the allow-list was first written as a single **global**
regex used for both `.replace()` and `.test()`. A global regex carries `lastIndex`
between `.test()` calls, so it alternates true/false and would have let a letter
through **every other keystroke**. There are now two constants — `DISALLOWED` (`/g`,
for replace) and `DISALLOWED_SINGLE` (for test). Verified: 10 consecutive letter checks
allow 0.

Also dropped `tidyPhone` from register's imports (unused there once onChange switched to
`sanitisePhone`); still imported in admin, where it tidies the list display.

**Retired room-code format is now refused loudly** (`lib/wayfinding.ts`,
`components/QRScanner.tsx`). The old format `HYT-KIOSK-01-CHECKIN-STATION:ROOM-201` began
with the **attendance** prefix, so `parseQrValue` read it as ATTENDANCE — a visitor
scanning an old room poster was silently checked into the building and the room was
never recorded. No error, wrong data.

`ParsedQr` gained `{ kind: 'retired-room-code' }`, matched by
`LEGACY_ROOM_CODE_RE = /^HYT-KIOSK-[^:]*[:-](?:ROOM|ROOFDECK)/i`, checked **before** the
attendance branch. QRScanner refuses it with "old room poster, ask reception to reprint".
A bare `HYT-KIOSK-CHECKIN-STATION` has no room suffix so it still checks in normally —
verified, this is the regression to watch if that regex is ever widened.

Also made both prefixes **case-insensitive** (`ROOM_PREFIX_RE` gained `/i`, attendance
uses `.toUpperCase().startsWith`), so a retyped or re-encoded lowercase code resolves.

⚠️ Two regex bugs caught by testing, not by reading: (1) `.*[:\-]ROOM[- ]?\d` missed
`ROOFDECK` — it has no digit, and I had misread it as starting "ROOM" when it starts
"ROOF"; (2) after fixing, `[^:]*` was needed so the suffix can't span a colon. 12 cases
pass, including lowercase forms and both real attendance codes.

**Scanner now shows a legend** for the three code types (entrance poster = in/out, room
door = records room only, personal code = for reception to scan). Replaces two separate
grey paragraphs that never named the entrance code as a distinct thing.

**Removed** the "Back to Home" link from `/register`.

**"Back to Dashboard" already existed** on all four admin sub-pages (`records`,
`room-records`, `rooms`, `users`), each `href='/admin'`. Nothing to add — the dashboard
itself is the one page it should not link to.

**Visitor UI fixes — four reported problems, four root causes fixed**

1. **Refresh logged you out.** `checkAuth()` was called ONLY in `app/page.tsx`, so every
   other guarded route trusted whatever Zustand rehydrated from localStorage and never
   revalidated the Supabase session. Moved it into `useRoleGuard`, which every guarded
   page already calls. Critically, the redirect effect now **returns early while
   `isLoading`** — without that it would still bounce to `/login` during the async check,
   since `isAuthenticated` is false until it finishes. `useRoleGuard` also returns
   `isAuthenticated && !isLoading && ...` so pages don't flash protected UI.

2. **"Not checked in" after refresh / 3D route unreachable / not live** — one root cause:
   `clockInStore` has **no `persist`**, so check-in state was pure in-memory memory, and
   `getActiveRecords()` was called from nowhere. Added:
   - `clockInStore.syncFromServer(openRecord | null)` — skips when
     `status === 'viewing-route'` so a poll can't eject someone out of their 3D route,
     and no-ops when the id is unchanged so a poll landing right after a local `clockIn()`
     doesn't reset the displayed time.
   - `useAttendanceStatus(userId)` — sync on mount + 30s poll, hidden-tab aware,
     `inFlight` ref guarding overlapping fetches.
   Wired into both `/check-in` and `/visitor`.

   This was a **correctness** bug, not cosmetic: stale "not checked in" meant the scanner
   read the visitor as clocked out, so scanning the entrance code would have clocked them
   OUT mid-visit.

3. **UI didn't fit the screen.** `StudentMobileView` had `min-h-[560px]` / `min-h-[680px]`
   — larger than a small phone's viewport once the header is counted, so the frame
   overflowed. Removed both floors, switched to `dvh` units, `p-4` wrapper padding
   dropped, and both pages moved to `h-[100dvh]` with `min-h-0` on `<main>` so the frame
   can actually shrink.

Verified: `tsc` 0, build 16/16 (ran in background — it now exceeds the 30s command limit),
lint clean on all six files.

**Attendance records table realigned to `clock_in_records`** (`app/admin/records/page.tsx`,
`store/recordsStore.ts`). The on-screen table had drifted while the **exports were already
correct** — worth knowing, since CSV/Excel/JSON/PDF all share `buildExportData()`:

- **Dead "Role" column removed.** Rendered a hardcoded "User" badge on every row — zero
  information. Correctly not derived from the record (the schema invariant is never to
  denormalise `user_role` onto a visit), but that made the column worthless rather than
  absent.
- **"Destination" split into Purpose and Room.** One cell was showing purpose as the
  primary line with the room beneath, under a heading describing neither.
- **Room now shows the NAME, not just the number.** `mapRow` was already fetching
  `rooms.name` in the join and then discarding it. Added `roomName` to `ClockInRecord`.
  Building stays as the tertiary line.
- **Raw user UUID removed** from the User cell — kept in the exports where it is useful
  for reconciliation.
- Exports gained a "Room Name" column; `Room` is now blank rather than "Unassigned" when
  there is no room, so an empty cell means genuinely unset.
- Search now covers room name and building; placeholder says "purpose, or room".

Verified headers == body cells (6 == 6) programmatically, since removing one column and
adding another is exactly where a mismatch hides. `tsc` 0, build 16/16, lint clean.

**Fixed a pre-existing build break**: `lib/wayfinding.test.ts` (22 tests covering
`parseQrValue`, written earlier this session) failed `tsc --noEmit` with TS5097 — it
imports `'./wayfinding.ts'` because `node --test` needs the explicit extension, which
bundler resolution rejects. Added `**/*.test.ts` to `tsconfig.json` `exclude` with a
comment explaining why. `npm test` → **22 pass, 0 fail**; `tsc --noEmit` clean again.

**Route view: added an always-visible "Back to scanner"** (`components/RouteVisualization.tsx`).
There WAS already a `resetRoute` button, but it sits in the control panel **below** the
square canvas — on a short phone the frame's `overflow-hidden` clips it, so the only way out
of the 3D view was unreachable. New button is in the top-right HUD overlay, which cannot be
clipped. The bottom Return stays.

**Room scanning is now discoverable while checked in.** Every prompt previously framed the
scanner as check-in/check-out only, so a visitor already inside had no signal that room
codes were usable:
- idle button: `Scan again to check out` → `Open camera to scan`
- live pill: `Checked in — scan again to check out` → `Point at any room door or the entrance`
- instructions: `Scan the entrance code again when you leave to check out.` → `You are
  checked in. Scan a room door to record where you are, or the entrance code to check out.`
- Same fix in `StudentMobileView`'s header line.
- The legend's **Room door poster** row now shows a "✓ You can scan these now" line whenever
  `status !== 'not-clocked-in'`, so the capability is flagged at the moment it becomes true.

Root cause of both reports: not a logic bug — the actions existed. The exit was hidden by
layout, and the capability was never surfaced.

Verified: `tsc` 0, 22/22 tests pass, build 16/16, lint clean apart from the two
pre-existing `exhaustive-deps` warnings in RouteVisualization.

**ROOT CAUSE of the persistent reload→login: my own one-day pass change.**
`checkAuth` treated an expired pass the same as an archived account and called
`supabase.auth.signOut()`. With migration 006 giving self-registered visitors a pass that
expires at end-of-day, **every visitor was signed out and redirected to /login the morning
after registering** — indistinguishable from the session expiring. Compounding it, `login()`
refused with "pass expired" and the login page offers no renewal, so there was no way back
in at all.

An expired pass is a **business rule, not an authentication failure**. Fixed:
- `checkAuth`: only `archived_at` signs out. Expiry leaves the session intact.
- `login`: no longer refuses on expiry.
- New `passExpired` boolean on the store, computed in both paths, rendered as an amber
  notice on the visitor view explaining the pass ran out and reception can renew it.

This is why the earlier `useRoleGuard`/`AuthGate` work appeared not to fix it — that code
was correct. The redirect was genuine server-truth behaviour, not a race.

---

## 6. Recently done

**Occupancy rooms are collapsible** (`components/RoomOccupancy.tsx`). Each room is a
`<button aria-expanded>` covering the whole card header; clicking drops down the people
inside with their entry times. Expansion state is a `Set<string>` of room ids, not a
single id, so several rooms stay open at once — comparing two rooms is the main reason
to want this. Chevron rotates via `transition-transform` + `rotate-180`, matching
`UserProfile.tsx:67`.

Decisions worth not re-litigating:
- **Empty rooms stay clickable** and read "Nobody is in this room." rather than being
  disabled. A control that refuses to respond leaves you inferring emptiness from it.
- `items-start` on the grid, so one expanded card doesn't stretch its row neighbours.
- `overflow-hidden` on the card so the hover fill on the header respects the radius.
- Note this page is **admin-only** (`useRoleGuard(['admin'])`), so it exposes who is
  inside the building. Don't loosen that.

**README rewritten** to match the shipped system. Removed: the `IMPLEMENTATION_PROMPT.md`
"pending changes" pointer, the `room_presence` table name, the 6-room `DESTINATIONS`
instruction, and "two tables". Added: the 6-step migration run order, the Option D
R1–R4 scan rules, `/admin/rooms`, the collapsible occupancy description, roles vs
visitor types, the generated-column warning, and the reprinted-QR-posters warning.
Verified: no stale refs remain, all internal links resolve, build clean.

⚠️ One thing learned while doing it: `visitor_types` (migration 004) has a SELECT
policy but **no explicit `ENABLE ROW LEVEL SECURITY`** — unlike the 5 tables in
migration 001. RLS is on via the policy's implicit path, so it is protected, but a
`grep ENABLE ROW LEVEL SECURITY` will show 5 and make it look unprotected. Worth
knowing before auditing.

Verified: `tsc --noEmit` 0 errors, `next lint` clean for the file, `npm run build`
succeeds with no new warnings.

---

## 7. Conventions

- Next.js 14 App Router, TypeScript strict, Tailwind, Zustand, Supabase, Three.js.
- Migrations are `supabase/migrations/YYYYMMDDNNNNN_description.sql`, applied in
  numeric order.
- Table names are singular (`rooms`, `users`); join tables are plural (`room_visits`).
- Generated columns are never written by the client — Postgres owns them.
- Invariants that must not regress: attendance is written **only** by the entrance
  code, presence **only** by room codes, no denormalised `user_name`/`user_role`,
  and no hard deletes in attendance history.

---

## 8. Open questions carried forward

1. **Run the post-deploy smoke test** (§3) — confirm the live URL, login, and
   `/admin/users`. Do this before anything else; it validates the whole schema migration
   against production.
2. **P1 documentation refresh** (§5) — `PROJECT_SUMMARY.md` §8 is actively wrong.
3. **P2 dead-code cleanup** — four dead `prisma:*` scripts, verified no `prisma/` dir.
4. **P3 stale `Database` type** in `lib/supabase.ts` — verified unused and describing a
   schema that no longer exists.
5. Should the stale worktree be deleted, or left alone? (§1)