# HYT-Global VMS — User Manual

This guide covers the visitor journey and administrator tools in the current HYT Wayfinder application. For acceptance testing, see the [Frontend UAT](./UAT_FRONTEND.md) and [Backend UAT](./UAT_BACKEND.md); [UAT.md](./UAT.md) links to both.

---

## 1. What the system does

The system keeps two kinds of visit records separate:

1. **Attendance** records whether a visitor is in the building. Scan the single entrance QR code to start attendance; scan it again to check out.
2. **Room visits** record which room a checked-in visitor is in. Scan a room-door QR code to enter a room. A room scan never starts or ends attendance.

Scanning another room moves the open room visit. Scanning the room you are already in again closes that room visit. When checking out while recorded in a room, the app asks for confirmation before closing both records.

---

## 2. Roles and visitor types

| Role | Access |
| --- | --- |
| **Visitor** | Verify or register, sign in, check in/out, scan room doors, and view their own visit status |
| **Admin** | Visitor capabilities plus the dashboard, records, room occupancy, room/user management, form options and QR station |

There is one administrator account. It is provisioned by the database owner; the visitor-management screen does not create or manage admins.

Visitor types such as Trainee, Trainer, VIP, Guest, Contractor, Intern and Observer describe a visitor. They do not grant different permissions.

---

## 3. Visitor guide

### 3.1 Verify a roster record or register

At the entrance, open `/verify` (the entrance poster may link there). Enter the first name, last name and course associated with the roster record.

- An eligible approved/recognized record is verified by the server, which establishes a session and sends you to `/check-in`. Check-in starts automatically there; no email link is sent.
- A pending or declined record is not checked in. Follow the on-screen instruction and contact the front desk.
- An expired roster pass cannot start a new visit. Ask the front desk to renew it.
- If no record matches, or more than one record matches, follow the on-screen instructions. An ambiguous match is sent to the front desk rather than selecting someone else's record.
- A roster record does not need an email address for this verification flow.

If you are a new visitor, choose **Register for a pass** or open `/register`. Complete the requested profile and visit-intent fields, including course, visitor type, purpose and assigned room. Self-registration gives the pass an end date of the registering day. Follow the confirmation and sign-in instructions shown by the app. Do not register a second time if the front desk says a roster record already exists.

### 3.2 Check in at the entrance

Visitors can also sign in at `/login` with their account credentials. On `/check-in`, allow camera access and scan the entrance poster. A successful scan starts attendance. The screen shows your current status, assigned room (if any), and the next step.

The attendance code is:

```text
HYT-KIOSK-CHECKIN-STATION
```

Keep this code at the ground-floor entrance only. It is the only QR code that starts or ends attendance.

### 3.3 Record a room visit

While checked in, scan the QR code on the room door. The app confirms the room it recorded. To move rooms, scan the new room's code. Scanning the same room again closes that room visit. Room scans require active attendance; if you are not checked in, the app refuses the scan and tells you to scan the entrance code first.

A current room code looks like:

```text
HYT-ROOM-01:ROOM-304
```

Some older room posters use a legacy format and are still accepted by the current scanner. Replace damaged or unreadable posters by printing the current code from `/station`.

### 3.4 Check out

Scan the entrance code again when leaving. If the app records you in a room, it names that room and asks whether you want to check out:

- **Confirm** to end attendance and close the open room visit.
- **Cancel** to remain checked in and recorded in that room.

If you are not recorded in a room, the entrance scan checks you out directly.

### 3.5 Expired pass

An expired pass pauses new check-ins and room scans. It does not erase your account or visit history, and expiration alone does not mean your account has been archived. Ask the front desk or administrator to renew the pass. Once it is renewed, sign in again if requested.

### 3.6 Common scanner messages

| Message or situation | Meaning | What to do |
| --- | --- | --- |
| Check in at the entrance first | There is no active attendance visit | Scan the ground-floor entrance code |
| Not an HYT QR code | The scanned value is not a recognized attendance or room code | Use an official poster or ask the front desk |
| Room code not recognized | The code does not resolve to a configured room | Ask an admin to check the room and poster |
| Pass expired | New visit actions are paused | Ask the front desk to renew your pass |
| Camera permission denied | The browser cannot use the camera | Allow camera access in browser settings and retry |

---

## 4. Administrator guide

### 4.1 Sign in and navigate

Open `/login` with the administrator account. Visitors cannot access admin pages. Main routes include:

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard and current activity |
| `/admin/records` | Building attendance history and exports |
| `/admin/room-records` | Room visit history |
| `/occupancy` | Current room occupancy; expand a room to see its occupants |
| `/admin/rooms` | Add, rename, deactivate and reactivate rooms |
| `/admin/users` | Manage visitor accounts and pass dates |
| `/admin/lookups` | Manage purposes, visitor types and courses |
| `/station` | Display and print entrance and room QR codes |

### 4.2 Dashboard, occupancy and records

Use `/admin` for an overview of current building activity. `/occupancy` shows who is currently recorded in each room; click a room to expand its occupant list. Attendance is listed separately at `/admin/records`. Room entry history is listed at `/admin/room-records` and is linked to the attendance visit under which it occurred.

Attendance records provide search/filtering and export options. Database-derived status and duration are not editable fields.

### 4.3 QR station and posters

`/station` displays the one attendance code and the codes for active rooms. Print the entrance code once for the ground-floor entrance and one room code for each active room door. The attendance code must not be used as a room-door poster. Reprint damaged or outdated room posters from the station.

### 4.4 Manage rooms

At `/admin/rooms`, add a room with its number, display name and floor; rename it; or deactivate/reactivate it. Deactivated rooms are omitted from active pickers, while historical visits remain associated with the room. Rooms are not deleted through the UI.

The seeded rooms are Room 201, Room 202, Rooms 301–304, Rooms 401–404 and Roofdeck. The Hilot and Massage course defaults map to Room 101 if that room is added.

### 4.5 Manage visitors

At `/admin/users`, search, filter and sort visitor accounts. Admins can create and edit visitors, adjust their profile/visit-intent fields and pass expiry, and archive or restore accounts. Archiving retains visit history. The admin account is not managed from this screen.

Creating or archiving requires the server-side `SUPABASE_SERVICE_ROLE_KEY`. Never expose this key in browser code or name it with the `NEXT_PUBLIC_` prefix. A pass date left blank for an admin-created visitor means no expiry; an explicitly supplied date is retained. Self-registration defaults to the end of that day.

### 4.6 Manage form options

At `/admin/lookups`, manage purposes, visitor types and courses. Active options appear in relevant forms. Renaming an item preserves the linked history. If an item is referenced by records, deletion may be rejected by database constraints; deactivate it instead where appropriate. Courses can have a default room assignment.

### 4.7 Entrance verification

`/verify` matches first name, last name and course against roster data. It is not a visitor-facing email-link flow: for an eligible record, the server verifies the record and establishes a session, then the visitor is sent to `/check-in`, where attendance starts automatically. Pending, declined, expired, unknown and ambiguous results follow separate outcomes. Apply the project's approved identity-verification procedures when operating this flow.

---

## 5. Setup and troubleshooting

Use the repository's [README](./README.md), [Supabase setup](./SUPABASE_SETUP.md) and [Vercel deployment guide](./VERCEL_DEPLOYMENT.md) for deployment instructions. The current fresh-project schema setup is `supabase/migrations/20260101000000_full_setup.sql`. Required Supabase client variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; admin account creation/archive also needs server-only `SUPABASE_SERVICE_ROLE_KEY`. Configure `NEXT_PUBLIC_APP_URL` as required by the deployment and printed QR URL setup.

| Problem | Likely cause | Next step |
| --- | --- | --- |
| Room or purpose picker is empty | Database setup or lookup read access is missing | Check the schema setup and Supabase policies |
| Admin create/archive reports a configuration error | Server role key is missing or unavailable | Check server environment configuration; never put the key in the browser |
| Room scan is refused | No active attendance, or code is not mapped to an active/configured room | Scan the entrance code first or ask an admin to check the room/poster |
| Verification reports ambiguous match | More than one roster person matches the supplied name and course | Ask the front desk to identify the correct record |
| Visitor pass has expired | Pass date is no longer valid for new visit actions | Have an admin renew it |
| Camera does not start | Permission denied, unsupported camera, or insecure origin | Allow permission and use HTTPS or localhost |

---

## 6. Good practices

- Keep the attendance poster at the entrance and room posters on their corresponding doors.
- Check the dashboard and occupancy at the start and end of an event.
- Renew visitor passes before the next visit when possible.
- Archive visitors who should no longer have access; do not remove historical visit records.
- Deactivate unused rooms and lookup options rather than deleting referenced data.
- Export attendance records as needed for the event's audit process.

## 7. Getting help

Contact the HYT Global front desk or system administrator. Include the page or QR code involved, the exact message shown, the date/time, and the visitor's name only when needed and through an approved channel.
