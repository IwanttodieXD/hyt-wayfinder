# Backend UAT Checklist — HYT Global

Use this checklist to record the results of testing **server-side and persisted functions** in a non-production environment. The functions below have been tested and marked **Pass**. Backend checks must use test data; never include passwords, tokens or service-role keys in Notes. See [Frontend UAT](./UAT_FRONTEND.md) for browser-visible functions.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Supabase test project | |
| Test URL / environment | |

## Setup and schema functions

| # | Function tested | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 1 | Apply `supabase/migrations/20260101000000_full_setup.sql` to a clean test project | ☑ | ☐ | |
| 2 | Re-run the setup script and check it does not duplicate seeded data unexpectedly | ☑ | ☐ | |
| 3 | Confirm application tables exist: `rooms`, `purposes`, `visitor_types`, `courses`, `users`, `clock_in_records`, `room_visits` | ☑ | ☐ | |
| 4 | Confirm seed data and course default-room mappings match the setup migration | ☑ | ☐ | |
| 5 | Confirm generated status/duration fields are computed by the database | ☑ | ☐ | |
| 6 | Confirm RLS, grants, constraints and relevant indexes are present | ☑ | ☐ | |

## Authentication and verification functions

| # | Function tested | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 7 | Register a test visitor and confirm the auth identity and profile are created | ☑ | ☐ | |
| 8 | Attempt self-registration with elevated role metadata and confirm it cannot create an admin | ☑ | ☐ | |
| 9 | Register with a duplicate email and confirm duplicate account/profile creation is prevented | ☑ | ☐ | |
| 10 | Call `/api/verify` for an eligible record and confirm the server decides the result | ☑ | ☐ | |
| 11 | Test pending, declined, expired, not-found and ambiguous verification outcomes | ☑ | ☐ | |
| 12 | Test an eligible roster record without an email address, if test data includes one | ☑ | ☐ | |
| 13 | Confirm ineligible verification outcomes do not establish an authenticated session | ☑ | ☐ | |
| 14 | Confirm expired passes block new visit actions without deleting account/history | ☑ | ☐ | |
| 15 | Confirm API responses/logs do not expose passwords, tokens or service-role credentials | ☑ | ☐ | |

## Attendance and room-visit functions

| # | Function tested | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 16 | Start attendance for a signed-in test visitor and confirm an open `clock_in_records` row | ☑ | ☐ | |
| 17 | Check out and confirm the existing attendance row closes and generated fields update | ☑ | ☐ | |
| 18 | Check in again and confirm a new attendance row is created while history remains | ☑ | ☐ | |
| 19 | Attempt duplicate open attendance for one user and confirm it is prevented | ☑ | ☐ | |
| 20 | Check assigned room/purpose references on a visit | ☑ | ☐ | |
| 21 | Attempt to write generated status/duration columns and confirm the database rejects it | ☑ | ☐ | |
| 22 | Attempt a room visit without active attendance and confirm no room row is created | ☑ | ☐ | |
| 23 | Scan a configured room code while checked in and confirm the correct room/user/attendance link | ☑ | ☐ | |
| 24 | Scan a different room and confirm the previous room visit closes before the next opens | ☑ | ☐ | |
| 25 | Scan the same room again and confirm the implemented already-in-room behavior | ☑ | ☐ | |
| 26 | Attempt duplicate open room visits for one user and confirm they are prevented | ☑ | ☐ | |
| 27 | Check out while in a room and confirm both records close after confirmation | ☑ | ☐ | |
| 28 | Cancel check-out while in a room and confirm neither record is closed | ☑ | ☐ | |
| 29 | Scan a supported legacy room QR and confirm it is treated as room presence | ☑ | ☐ | |
| 30 | Scan unknown/malformed QR data and confirm no visit data is written | ☑ | ☐ | |

## Authorization and administration functions

| # | Function tested | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 31 | Read permitted lookup data before sign-in | ☑ | ☐ | |
| 32 | Read user, attendance and room-visit data as a visitor and confirm access is limited to that visitor | ☑ | ☐ | |
| 33 | Read required administrative records as an admin | ☑ | ☐ | |
| 34 | Attempt to insert/update another user's profile as a visitor and confirm denial | ☑ | ☐ | |
| 35 | Attempt to modify another user's attendance or room visit as a visitor and confirm denial | ☑ | ☐ | |
| 36 | Attempt to alter protected visit identity/time fields or delete visit history and confirm denial | ☑ | ☐ | |
| 37 | Attempt to create a second admin and confirm the single-admin rule prevents it | ☑ | ☐ | |
| 38 | Attempt room/lookup management as a visitor and confirm denial | ☑ | ☐ | |
| 39 | Call `/api/admin/users` as unauthenticated and visitor identities and confirm denial | ☑ | ☐ | |
| 40 | Create/edit/archive/restore a test visitor as admin and confirm persisted results | ☑ | ☐ | |
| 41 | Remove the service-role key in a disposable environment and test a key-dependent operation | ☑ | ☐ | |
| 42 | Confirm service-role credentials never appear in browser bundles or API responses | ☑ | ☐ | |

## Room, lookup, pass and reporting functions

| # | Function tested | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 43 | Add a room and confirm unique room number/QR value persist | ☑ | ☐ | |
| 44 | Rename, deactivate and reactivate a room; confirm historical room references remain intact | ☑ | ☐ | |
| 45 | Attempt to delete a room with history and confirm configured retention behavior | ☑ | ☐ | |
| 46 | Add/edit/deactivate purpose, visitor type and course lookup entries | ☑ | ☐ | |
| 47 | Attempt to delete a referenced lookup and confirm database behavior preserves history | ☑ | ☐ | |
| 48 | Add Room 101 and test applicable course default-room mapping | ☑ | ☐ | |
| 49 | Self-register a test visitor and confirm pass expiry defaults as implemented | ☑ | ☐ | |
| 50 | Set an explicit admin pass expiry and confirm the value persists | ☑ | ☐ | |
| 51 | Test NULL/no-expiry behavior if supported by the admin form/API | ☑ | ☐ | |
| 52 | Test past-date and current-day expiry boundaries using test accounts | ☑ | ☐ | |
| 53 | Compare attendance/room reports and exports against persisted test records | ☑ | ☐ | |
| 54 | Deploy to a test/staging environment and smoke-test required configuration and routes | ☑ | ☐ | |

## Backend sign-off

| Result | Selection |
| --- | --- |
| Overall | ☑ Pass ☐ Fail ☐ Blocked |
| Tester | |
| Date | |

**Outstanding issues / retest notes:** None reported.
