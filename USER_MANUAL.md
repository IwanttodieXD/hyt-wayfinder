# HYT Wayfinder — User Manual

A guide to using the HYT Global visitor management system. It covers the visitor
journey first, then the administrator tools.

---

## 1. What the system does

HYT Wayfinder replaces the paper sign-in sheet with two separate records:

1. **Attendance — who is in the building.** One QR code at the ground floor
   entrance. Scanning it checks a visitor in; scanning it again checks them out.
2. **Room presence — who is in which room.** One QR code on each room door.
   Scanning it records that the visitor entered that room. It never affects
   attendance.

Keeping the two apart means a room scan can never accidentally check someone out
of the building, and "who is in Room 304 right now" is based on real scans.

---

## 2. Roles

| Role | What they can do |
| --- | --- |
| **Visitor** | Register, sign in, check in/out, scan room doors, see their own visit status |
| **Admin** | Everything a visitor can do, plus the dashboard, records, room visits, occupancy, room management, user management and form options |

There is exactly **one administrator** account. It is created once by the
database owner and cannot be duplicated or edited from the normal user screen.

Visitor types (Trainee, Trainer, VIP, Guest, Contractor, Intern, Observer) are
descriptive labels, not permissions. They do not change what a person can do.

---

## 3. Visitor guide

### 3.1 Before you arrive

The front desk may register you, or you can register yourself at `/register`.

To register yourself:

1. Open the HYT Wayfinder link given to you by the front desk.
2. Choose **Register** / **Create your pass**.
3. Enter your first name, last name, middle initial (optional), email, contact
   number, course, visitor type, purpose and assigned room.
4. Submit. If email confirmation is enabled, check your inbox and confirm the
   address.
5. Sign in with the email and password you chose.

Your pass is valid for the registering day by default. The front desk can extend
it for longer stays.

> If you were part of a pre-loaded orientation cohort, the office may already
> have your record. Confirm your details with the front desk instead of
> registering twice.

### 3.2 Entering the building

1. At the ground floor entrance, scan the attendance QR code with your phone, or
   open `/verify` and confirm your **first name**, **last name** and **course**.
2. If your record is clear, follow the sign-in link or continue to `/check-in`.
3. On the check-in screen, scan the entrance code if it is not already scanned.
   Your attendance visit starts.
4. Your assigned room and purpose are shown on the screen.

The entrance code looks like:

```text
HYT-KIOSK-CHECKIN-STATION
```

### 3.3 Entering a room

1. While checked in, scan the QR code posted on the room door.
2. The system records that you are inside that room.
3. Scanning a different room moves you: the previous room closes and the new one
   opens.
4. Scanning the same room again closes your visit to that room.

Room codes look like:

```text
HYT-ROOM-01:ROOM-304
```

Older posters printed as `HYT-KIOSK-01-CHECKIN-STATION:ROOM-304` still work.

> A room scan requires an active attendance visit. If you have not checked in at
> the entrance, the scan is refused.

### 3.4 Leaving the building

1. Scan the ground floor attendance code again.
2. If you are still recorded inside a room, the app names that room and asks you
   to confirm.
3. Confirm to close both the room visit and the attendance visit.
4. Cancel to stay checked in and in the room.

### 3.5 If your pass has expired

If your pass expires, signing in shows `/pass-expired`. Your record and previous
visits are kept, but new check-ins are paused. Ask the front desk to renew the
pass.

### 3.6 Common messages

| Message | Meaning | What to do |
| --- | --- | --- |
| "Check in at the entrance first" | You scanned a room without an active attendance visit | Scan the ground floor code first |
| "Not an HYT QR code" | The code is not one of ours | Use the official poster or ask the front desk |
| "Awaiting review" | Your orientation record is not yet approved | Go to the front desk |
| "No email on file" | The office has no address for you | Ask the front desk to add one |
| "Your pass has expired" | The pass end date has passed | Ask the front desk to renew it |

---

## 4. Administrator guide

### 4.1 Signing in

Open `/login` and use the administrator account issued to you. Visitors cannot
reach admin pages; the app redirects them away.

The admin console is organised into four groups:

- **Overview** — Dashboard
- **Activity** — Attendance Records, Room Visits, Room Occupancy
- **Manage** — Manage Rooms, Manage Users, Form Options
- **Tools** — QR Station

### 4.2 Dashboard

`/admin` shows:

- how many people are currently in the building;
- which rooms are occupied and by whom;
- recent check-ins and check-outs.

Use it as the at-a-glance view during an event.

### 4.3 QR Station

`/station` is the lobby kiosk. It displays:

- the **attendance code** to print and post at the ground floor entrance;
- one **room code** per active room, to print and post on each door;
- a live headcount per room on the room posters.

Print the attendance code exactly once. Print one room code per room. If a poster
is damaged, reprint it from `/station`.

### 4.4 Attendance records

`/admin/records` lists every building check-in and check-out.

- Search by visitor name or course.
- Filter by date and status.
- Export the current view to CSV or PDF.
- Duration and status are calculated by the database; they cannot be edited.

Use this page to answer "who was in the building, and when".

### 4.5 Room visits

`/admin/room-records` lists room entries grouped by room, with dates and
durations. Each room visit is linked to the attendance visit it happened under,
so a person's full trail is reconstructable: building → rooms → building exit.

### 4.6 Room occupancy

`/occupancy` shows who is inside each room right now. Click a room to expand the
list of people currently recorded there.

### 4.7 Managing rooms

`/admin/rooms` lets you:

- **Add** a room with its room number, display name and floor.
- **Rename** a room. History stays linked because visits reference the room by
  id, not by name.
- **Deactivate** a room. It disappears from the registration and admin pickers,
  but past visits remain.
- **Reactivate** a room when it is available again.

Rooms are never deleted, so visit history is never destroyed.

The seeded rooms are Room 201, Room 202, Rooms 301–304, Rooms 401–404 and
Roofdeck. If you use the Hilot or Massage courses, create **Room 101** so their
default room mapping takes effect.

### 4.8 Managing users

`/admin/users` lists visitor accounts.

**Finding someone**

- Search by name or email.
- Filter by role, visitor type, course or pass status.
- Sort by name, course or pass expiry.

**Creating an account**

1. Choose **Add user**.
2. Enter the visitor's details, course, visitor type, purpose and assigned room.
3. Set a pass expiry date, or leave the field empty for a one-day pass.
4. Save. The login and profile are created together.

Creating and archiving require `SUPABASE_SERVICE_ROLE_KEY` to be configured on
the server. Without it, those actions return a clear error and read/update still
work.

**Editing an account**

Open the visitor and change their details, classification, assigned room or pass
expiry. Save. Changes persist immediately.

**Renewing a pass**

Use the pass expiry control to set a new end date. The expired flag clears as
soon as the new date is in the future.

**Archiving and restoring**

Archiving hides an account from active lists but keeps all attendance and room
history. Restore it if the person returns.

The administrator account is hidden from this page on purpose. It cannot be
edited, archived or duplicated here.

### 4.9 Form options

`/admin/lookups` manages the three lookup lists used across the forms:

- **Purposes** — why someone is visiting (Interview, Orientation, Meeting, …)
- **Visitor types** — Trainee, Trainer, VIP, Guest, Contractor, Intern, Observer
- **Courses** — the programmes offered by the institute

You can add, rename, deactivate and delete items.

- Deleting an item that is referenced by attendance is refused. Deactivate it
  instead: it disappears from the pickers but stays on historical records.
- Renaming an item keeps history intact.
- Courses also carry a default room. Set it when you want visitors on that
  course to be assigned a room automatically.

### 4.10 Pass expiry

Every visitor has a pass end date.

- **Self-registration** defaults to the end of the registering day.
- **Admin-created accounts** use the date you choose.
- **No date / NULL** means the pass never expires.
- A pass is valid for the whole of its expiry day.

Expired passes are refused at sign-in and check-in, but attendance history is
kept. Renew the pass to let the person back in.

### 4.11 Entrance verification

The public `/verify` page lets a person confirm their first name, last name and
course. It shows one of three verdicts:

- **Approved / recognized** — offer the sign-in path.
- **Awaiting review** — send them to the front desk.
- **Declined** — no entry.

This page is identification only. It never hands out a session just because
someone typed a name. If a record has no email on file, the page sends the person
to the front desk instead of promising a link that cannot arrive.

---

## 5. Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Room or purpose picker is empty before sign-in | Database setup not applied, or read policy missing | Run `supabase/migrations/20260101000000_full_setup.sql` |
| "Permission denied for table users" | Service role key missing, or grants not applied | Set `SUPABASE_SERVICE_ROLE_KEY`; re-run the setup file |
| Create/archive user returns 501 | Service role key missing | Add the key to the server environment and restart |
| New table not visible in the API | PostgREST schema cache | Run `NOTIFY pgrst, 'reload schema';` |
| Can't add a second admin | Enforced by design | Use the single existing admin |
| Room scan refused | No active check-in | Scan the ground floor entrance code first |
| Visitor can't sign in | Expired pass, unconfirmed email, or no email on file | Renew the pass, confirm the address, or add an email |
| Old room poster not recognised | Damaged or non-HYT code | Reprint from `/station` |

---

## 6. Good practices

- Keep the attendance code posted at the entrance and nowhere else.
- Print one room code per room and replace damaged posters from `/station`.
- Check the dashboard at the start and end of each event to catch anyone still
  checked in.
- Renew passes before an event rather than during check-in.
- Archive accounts when people leave; do not try to delete them.
- Deactivate unused rooms and lookups instead of deleting them, so history stays
  readable.
- Export attendance records after each event for your paper/audit file.

---

## 7. Getting help

Contact the HYT Global front desk or the system administrator. When reporting a
problem, include:

- the page or QR code involved;
- the exact message shown;
- the visitor's name (if relevant);
- the date and time.
