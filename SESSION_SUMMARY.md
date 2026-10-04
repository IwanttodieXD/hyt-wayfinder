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