# UAT Checklist — HYT Global

User acceptance testing for the visitor management system. Work through the
sections in order; each row is one check with a clear pass condition.

Record the tester, date, build/commit, and any failures. A section passes only
when every check in it passes.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Database | Supabase project: |
| Browser(s) | |

---

## 0. Prerequisites

- [ ] `supabase/migrations/20260101000000_full_setup.sql` has been run on the
      target Supabase project.
- [ ] The setup verification queries report 11 rooms, 8 purposes, 7 visitor
      types, 10 courses, and the 131-person cohort.
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL`.
- [ ] One account has been promoted to `admin`.
- [ ] `npm run dev` starts, or the deployed URL is reachable.

---

## 1. Public entrance and identification

The entrance poster points at `/verify`. This is **identification only** — it
must never hand out a session based on a typed name.

| # | Step | Expected |
| --- | --- | --- |
| 1.1 | Open `/` | Redirects to `/verify` |
| 1.2 | Enter a known cohort first name, last name and course | The person's record is shown with their orientation verdict |
| 1.3 | Enter an unknown name in a valid course | A "not found" message; no record is revealed |
| 1.4 | Submit with a field blank | Inline validation; no lookup is sent |
| 1.5 | Enter a person whose record is `approved` | The flow offers a sign-in link, not "awaiting review" |
| 1.6 | Enter a person whose record is `pending` and who has never signed in | "Awaiting review" / front-desk message |
| 1.7 | Enter a person whose record is `declined` | Declined message; no sign-in link |
| 1.8 | Enter a person with no email on file | Front-desk message; no promise of an email link |
| 1.9 | Enter two people with the same first and last name in the same course | Ambiguous result is refused, not silently resolved to one person |
| 1.10 | Inspect network calls on `/verify` | The lookup returns a verdict only; no session is minted by typing a name |

---

## 2. Registration and sign-in

| # | Step | Expected |
| --- | --- | --- |
| 2.1 | Open `/register` before signing in | Room, purpose, visitor type and course pickers are populated |
| 2.2 | Register a new visitor with a valid email | Account is created; confirmation screen appears |
| 2.3 | Confirm the email, then sign in at `/login` | Visitor lands on `/check-in` (or `/visitor` forwards there) |
| 2.4 | Check the new profile in `/admin/users` | Role is `visitor`, never `admin` |
| 2.5 | Register with an email already in use | Friendly "already registered" message; no duplicate profile |
| 2.6 | Sign in with a wrong password | Friendly error; no session |
| 2.7 | Sign in with an expired pass | Redirected to `/pass-expired`; attendance history is still visible |
| 2.8 | Visit `/visitor` as a visitor | Forwards to `/check-in` |
| 2.9 | Visit an admin route as a visitor | Redirected away; admin data is not rendered |

---

## 3. Attendance (ground floor code)

The attendance code is `HYT-KIOSK-CHECKIN-STATION`. It is the **only** code that
records attendance.

| # | Step | Expected |
| --- | --- | --- |
| 3.1 | Sign in as a visitor and scan the attendance code at `/check-in` | A `clock_in_records` row opens with `status = active` |
| 3.2 | Scan the same code again while checked in | The open row gets `time_out`; `status` becomes `completed` |
| 3.3 | Scan again after checking out | A new attendance row opens |
| 3.4 | Double-tap the attendance code quickly | Only one open attendance row exists; no duplicate open visit |
| 3.5 | Check the admin attendance records | Duration and status are correct; no write to generated columns failed |
| 3.6 | Confirm the assigned room/purpose on the new record | They come from the visitor's pending profile values, not free text |

---

## 4. Room presence (door codes)

Room codes look like `HYT-ROOM-01:ROOM-304`. Legacy codes such as
`HYT-KIOSK-01-CHECKIN-STATION:ROOM-304` are still supported.

| # | Step | Expected |
| --- | --- | --- |
| 4.1 | Scan a room code **without** checking in first | Refused ("check in at the entrance first"); no room visit is opened |
| 4.2 | Check in, then scan a room code | A `room_visits` row opens; attendance is unchanged |
| 4.3 | Scan a different room code | Previous room visit closes; the new one opens; only one open room |
| 4.4 | Scan the same room code again | Current room visit closes; no duplicate open row |
| 4.5 | While inside a room, scan the attendance code to leave | A confirmation names the room before closing both |
| 4.6 | Confirm the leave prompt | Both the room visit and attendance close |
| 4.7 | Cancel the leave prompt | Both stay open; no partial close |
| 4.8 | Scan an unrecognised QR value | "Not an HYT code"; nothing is written |
| 4.9 | Scan a legacy-format room poster | Recorded as a room visit, never as attendance |

---

## 5. Admin dashboard and occupancy

| # | Step | Expected |
| --- | --- | --- |
| 5.1 | Sign in as admin and open `/admin` | Dashboard shows live building activity and room occupancy |
| 5.2 | Check someone in and enter a room in another browser | Dashboard and `/occupancy` update on refresh |
| 5.3 | Expand a room on `/occupancy` | The list of people inside that room is correct |
| 5.4 | Check everyone out | Occupancy is empty; no stale open rows |
| 5.5 | Use the mobile layout | Sidebar/menu, header and tiles remain usable; no horizontal scrolling |

---

## 6. Attendance records

| # | Step | Expected |
| --- | --- | --- |
| 6.1 | Open `/admin/records` | Attendance rows load, newest first |
| 6.2 | Search by name or course | Results filter correctly |
| 6.3 | Filter by date or status | Results match the filter |
| 6.4 | Export CSV | File downloads and contains the visible records |
| 6.5 | Export PDF | File downloads and is readable |
| 6.6 | Check the course column | Shows the visitor's course, not a stale free-text value |
| 6.7 | Try to edit a visit's time-in or room via the API | Rejected; only close-out timestamps may change |

---

## 7. Room visits

| # | Step | Expected |
| --- | --- | --- |
| 7.1 | Open `/admin/room-records` | Visits are grouped by room with dates and durations |
| 7.2 | Compare a visit with the attendance record | The room visit links to the correct attendance visit (`clock_in_id`) |
| 7.3 | Filter or search room visits | Results match the chosen room/person |
| 7.4 | Check a completed visit | Duration is computed by the database; status is `left` |

---

## 8. Room management

| # | Step | Expected |
| --- | --- | --- |
| 8.1 | Open `/admin/rooms` | Existing rooms are listed with floor and code |
| 8.2 | Add a room | It appears in the list, on `/station`, and in the register picker |
| 8.3 | Rename a room | All views show the new display name; history stays linked |
| 8.4 | Deactivate a room | It disappears from pickers but past visits remain |
| 8.5 | Reactivate the room | It returns to the pickers |
| 8.6 | Confirm no delete action exists | Rooms cannot be deleted, only deactivated |
| 8.7 | Create `Room 101`, then check the Hilot/Massage courses | Those courses map to it as their default room |

---

## 9. User management

| # | Step | Expected |
| --- | --- | --- |
| 9.1 | Open `/admin/users` | Visitors load in a paginated table |
| 9.2 | Search and filter by role, visitor type and pass status | Results are correct and filters can be cleared |
| 9.3 | Sort by name, course or pass expiry | Sort order changes correctly |
| 9.4 | Create a visitor | Auth login and profile are created; role is `visitor` |
| 9.5 | Edit a visitor's details | Changes persist after reload |
| 9.6 | Renew/extend a pass | New expiry is saved and the red expired flag clears |
| 9.7 | Archive a visitor | Hidden from active lists; attendance history remains |
| 9.8 | Restore an archived visitor | Returns to the active list |
| 9.9 | Try to create or edit an admin | Not offered; exactly one admin is enforced by the database |
| 9.10 | Remove `SUPABASE_SERVICE_ROLE_KEY` and retry create/archive | Clear `501` message; read/update still work |

---

## 10. Form options (lookups)

| # | Step | Expected |
| --- | --- | --- |
| 10.1 | Open `/admin/lookups` | Purposes, visitor types and courses tabs load |
| 10.2 | Add an item to each tab | It appears in the relevant picker after reload |
| 10.3 | Rename an item | Old records keep their history; new forms show the new label |
| 10.4 | Delete an unused item | Removed successfully |
| 10.5 | Delete an item referenced by attendance | Deleting is refused; offer deactivation instead |
| 10.6 | Deactivate an item | Hidden from pickers but still shown on historical records |

---

## 11. Pass expiry

| # | Step | Expected |
| --- | --- | --- |
| 11.1 | Create a self-registered visitor | `valid_until` defaults to the end of the registering day |
| 11.2 | Set an admin-created pass with an explicit date | The explicit date is kept (DEFAULT does not overwrite it) |
| 11.3 | Set a pass to `NULL` | Pass never expires |
| 11.4 | Set a pass to yesterday, then sign in | `/pass-expired` is shown; new check-ins are refused |
| 11.5 | Check older attendance for that person | History is still present and readable |
| 11.6 | Set the pass to today, then sign in | Pass is valid for the whole day |

---

## 12. Theme and presentation

| # | Step | Expected |
| --- | --- | --- |
| 12.1 | Toggle dark/light mode on a phone-sized viewport | Wave animation plays across the whole screen |
| 12.2 | Toggle on tablet and desktop | Wave animation still plays; no cross-fade fallback |
| 12.3 | Toggle repeatedly | No flicker, stuck overlays, or unreadable text |
| 12.4 | Check the animated background | Continues after the wave; pauses during the wave |
| 12.5 | Open a 404 URL | Branded not-found page links back to verification |
| 12.6 | Check `/station` print preview | Attendance and room codes print cleanly |

---

## 13. Data integrity

| # | Step | Expected |
| --- | --- | --- |
| 13.1 | Confirm two open attendance rows for one person are impossible | Unique partial index blocks it |
| 13.2 | Confirm two open room visits for one person are impossible | Unique partial index blocks it |
| 13.3 | Attempt to delete a user with attendance history | Refused or archived instead; history survives |
| 13.4 | Attempt to delete an attendance or room visit row via the API | No DELETE policy/grant; refused |
| 13.5 | Confirm the single-admin index exists | A second admin update fails |
| 13.6 | Confirm generated columns are never written by the app | No `status` / `duration` INSERT/UPDATE errors |

---

## 14. Database setup and deployment

| # | Step | Expected |
| --- | --- | --- |
| 14.1 | Run `full_setup.sql` on an empty project | Completes without errors |
| 14.2 | Run it a second time | Completes; row counts do not double |
| 14.3 | Confirm only one migration file remains | `supabase/migrations/20260101000000_full_setup.sql` |
| 14.4 | Deploy to Vercel with all environment variables | Build succeeds and login works |
| 14.5 | Smoke-test `/verify`, `/check-in`, `/station`, `/admin` on the deployment | All work against the production database |

---

## Sign-off

| Section | Pass / Fail | Notes |
| --- | --- | --- |
| 1. Entrance / identification | | |
| 2. Registration / sign-in | | |
| 3. Attendance | | |
| 4. Room presence | | |
| 5. Dashboard / occupancy | | |
| 6. Attendance records | | |
| 7. Room visits | | |
| 8. Room management | | |
| 9. User management | | |
| 10. Form options | | |
| 11. Pass expiry | | |
| 12. Theme / presentation | | |
| 13. Data integrity | | |
| 14. Setup / deployment | | |

**Accepted by:** ____________________  **Date:** ____________________

**Outstanding issues:**

1.
2.
3.
