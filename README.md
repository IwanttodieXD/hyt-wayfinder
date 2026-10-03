# HYT Wayfinder

A visitor management and 3D wayfinding system for the HYT Global Institute
building. Visitors register, check in by scanning the QR code at their lobby
station, and are shown an animated 3D route to their destination. Staff get
occupancy and check-in record dashboards.

> **Looking for an overview?** See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for
> what the system does, how it's organised, what you can do with it, and known
> gaps. This README is the setup and reference guide.
>
> Database design: [supabase/SCHEMA.md](./supabase/SCHEMA.md). Pending code
> changes: [IMPLEMENTATION_PROMPT.md](./IMPLEMENTATION_PROMPT.md).

## Features

- Supabase email/password auth with four roles: `admin`, `trainer`, `trainee`, `visitor`
- Self-service registration with destination assignment
- Lobby kiosk station that prints the ground floor attendance code and one room door code per destination
- QR scanning on mobile (`html5-qrcode`): the ground floor code clocks in/out, room door codes track who is inside which room
- Animated 3D route visualization per destination (Three.js / React Three Fiber)
- First-person 3D building exploration with collision detection
- Room occupancy tracking and a kiosk status view
- Admin dashboard, check-in records table, and user management CRUD
- Dark mode and responsive/mobile layouts

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript (strict)
- Three.js / React Three Fiber / Drei
- Supabase (Auth + Postgres + Row Level Security)
- Zustand for client state (with `persist`)
- Tailwind CSS
- html5-qrcode + react-qr-code

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)

### Installation

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | `anon`/`public` key. Safe in the browser — RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | for admin create/delete | **Server-only.** Bypasses RLS. Never prefix it with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | recommended | Base URL of the app |
| `DATABASE_URL` | optional | Direct Postgres connection string |
| `SMTP_*` | optional | Outbound email |

`.env.local` is gitignored — never commit real credentials.

### Database

Run the SQL in the [Supabase setup guide](./SUPABASE_SETUP.md) in the Supabase
SQL editor. It creates the `users` and `clock_in_records` tables, enables RLS,
adds the timestamp triggers, and applies the admin user-management policies.

### Create the first admin

1. Supabase Dashboard → Authentication → Users → **Add User**
2. Create `admin@hyt.com` with a password and auto-confirm enabled
3. Insert the matching profile row:

```sql
INSERT INTO public.users (id, email, name, role)
VALUES (
  'REPLACE-WITH-AUTH-USER-UUID',
  'admin@hyt.com',
  'Admin User',
  'admin'
);
```

The UUID is the `id` shown on the Authentication → Users page.

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run dev` goes through
`scripts/next-with-canonical-path.js`, which normalizes the project directory's
letter casing before starting Next.js. This matters on Windows, where a
mixed-case path otherwise produces two module copies and
`Invariant: Missing ActionQueueContext`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page; redirects by role |
| `/login`, `/register` | Authentication |
| `/check-in` | Mobile QR scanner and check-in/out (trainer, trainee, visitor) |
| `/station` | Lobby kiosk — displays the check-in QR code |
| `/trainer` | Trainer/instructor view |
| `/visitor` | Visitor view |
| `/occupancy` | Live room occupancy |
| `/admin` | Admin dashboard |
| `/admin/records` | Attendance records (check-in/out) |
| `/admin/room-records` | Room visit history, grouped per room |
| `/admin/users` | User management (requires `SUPABASE_SERVICE_ROLE_KEY` for create/delete) |
| `/api/admin/users` | Server route for admin user create/delete |

## QR codes

There are two kinds of QR code, and they are deliberately different things.

**Attendance — exactly one, on the ground floor.** `HYT-KIOSK-CHECKIN-STATION`.
This is the only code that records attendance. Scanning it clocks you in;
scanning it again clocks you out. It carries no room, so the 3D route you get
is resolved from your assigned destination instead of from the code.

**Room presence — one per room, on the door.** `HYT-ROOM-01:<ROOM_ID>`.
Scanning one records that you are inside that room right now. It never touches
attendance, so scanning the wrong poster can't change your check-in status.
Rows are append-only: scanning a room closes any room you were in before, so
"who was in Room 304 at 3pm" is answerable, not just "who is there now".

`parseQrValue()` in `lib/wayfinding.ts` decides which kind was scanned and
returns `null` for anything unrecognised rather than guessing.

### Attendance flow

1. On arrival, scan the ground floor code. This opens a `clock_in_records` row
   with `time_in` and shows the 3D route to your assigned destination.
2. Scan your room's door code. This opens a `room_presence` row. Attendance is
   unaffected.
3. On leaving, scan the ground floor code again to set `time_out`.

### Tables

| Table | Written by | Answers |
| --- | --- | --- |
| `clock_in_records` | ground floor code only | Who is checked in, and since when |
| `room_presence` | room door codes only | Who is in which room, and when they moved |

The two are reported separately on purpose:

- **`/admin/records`** — attendance. Who is in the building, since when.
- **`/admin/room-records`** — presence. Per room, who entered and when, with
  search and date filters. Every visit is a row, so "who was in Room 304 at 3pm"
  is answerable after the fact.
- **`/station`** — each room poster shows a live headcount. Clicking it (at any
  count, including 0) opens that room's records: who is inside now, and who
  already left today with their times and duration. The count is screen-only and
  is deliberately left out of the print window, since a printed number would be
  stale the moment it went up.

To add a room, add an entry to `lib/wayfinding.ts` and to the `DESTINATIONS`
list in `store/authStore.ts`, which is shared by the register and admin forms.

## Controls

**Desktop** — `W`/`A`/`S`/`D` or arrow keys to move, mouse to look (click to
lock the pointer), `Space` to jump.

**Mobile** — drag on the left half to move, drag on the right half to look.

## Project structure

```
app/
  page.tsx                  # Landing / role-based redirect
  login, register/          # Auth pages
  check-in/                # Mobile QR scan + check-in
  station/                  # Attendance + room door QR codes
  trainer/, visitor/, occupancy/
  admin/                    # Dashboard, records, user management
  api/admin/users/route.ts  # Server-only user create/delete
components/                 # 3D scene, camera, building, QR scanner, route
hooks/                      # First-person + mobile controls, role guard, profile
lib/                        # Supabase client, wayfinding registry, WebGL check
store/                      # Zustand stores: auth, users, records, roomPresence, clockIn, theme
scripts/                    # next-with-canonical-path.js (Windows casing fix)
public/                     # Static assets
```

## Commands

```bash
npm run dev     # dev server
npm run build   # production build
npm start       # serve the production build
npm run lint    # ESLint
```

## Security notes

- Row Level Security is enabled on `public.users` and `public.clock_in_records`.
- The `anon` key is embedded in the client bundle by design; RLS, not the key,
  is what protects the data.
- `SUPABASE_SERVICE_ROLE_KEY` is only read inside
  `app/api/admin/users/route.ts`, which runs on the server. Without it, create
  and delete return `501` and read/update keep working.
- The admin route verifies the caller is an admin using their own access token;
  the service key is never sent back to the browser.

## Deployment

See the [Vercel deployment guide](./VERCEL_DEPLOYMENT.md). Remember to set the
environment variables for all three Vercel environments and redeploy — Vercel
only injects variables into new builds.

## License

Private project for HYT Global Institute
