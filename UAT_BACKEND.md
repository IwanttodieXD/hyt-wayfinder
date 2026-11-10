# Backend UAT Checklist — HYT Global

Validate persisted behavior, server-side decisions, Supabase schema/policies and deployment configuration. This checklist is not a substitute for reviewing the threat model or running a security audit. Use a **non-production** Supabase project and disposable accounts. Do not run negative/destructive checks on real visitor data. Leave checks unchecked until actually tested.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Supabase test project | |
| Deployment / URL | |

Record observed results and sanitized error details; never record passwords, access tokens, refresh tokens or service-role keys.

## 1. Prerequisites and schema

| # | Check | Pass condition |
| --- | --- | --- |
| 1.1 | Apply `supabase/migrations/20260101000000_full_setup.sql` to a test project | Setup completes successfully and creates the documented current schema |
| 1.2 | Re-run the setup script on that test project | It completes as documented without duplicating seeded rows |
| 1.3 | Inspect application tables | `rooms`, `purposes`, `visitor_types`, `courses`, `users`, `clock_in_records` and `room_visits` exist |
| 1.4 | Inspect expected seed data | Counts/values match the migration and current setup documentation; document any intentional environment-specific difference |
| 1.5 | Inspect generated visit fields | Visit status and duration fields are database-generated and are not client-writable |
| 1.6 | Inspect RLS, grants, constraints and indexes | Current migration's intended policies, grants, one-admin rule and one-open-row indexes are present |
| 1.7 | Inspect migration directory | The current documented fresh-project setup file is present; report any additional files rather than assuming they are obsolete |

## 2. Authentication and verification

| # | Check | Pass condition |
| --- | --- | --- |
| 2.1 | Register a new visitor through the application | Supabase Auth identity and profile are created; role is `visitor` |
| 2.2 | Attempt self-registration with elevated role metadata (test account only) | Server/database still creates or retains a visitor role; no admin privilege is granted |
| 2.3 | Register with a duplicate email | No duplicate profile/login is created and the request returns a handled result |
| 2.4 | Verify an approved/recognized roster record through `/api/verify` | Server makes the authoritative decision and eligible flow establishes the expected session |
| 2.5 | Verify pending, declined, expired, not-found and ambiguous records | Outcomes are distinguished; no ineligible or ambiguous result receives a session |
| 2.6 | Verify an eligible roster record without an email address, if represented in test data | Behavior matches the current server implementation; no email address is exposed or required if the flow provisions the session without one |
| 2.7 | Inspect verification response and logs | No password or service-role key is returned; response contains only intended user-visible result/session data and logs omit secrets |
| 2.8 | Check ordinary expired visitor session behavior | Expiration does not incorrectly erase the account/session; new attendance/room actions are blocked according to current implementation |

## 3. Attendance persistence and integrity

| # | Check | Pass condition |
| --- | --- | --- |
| 3.1 | Start attendance for a signed-in test visitor | One `clock_in_records` row is created with the correct user and open `time_out` |
| 3.2 | Check out that visitor | The existing row receives its close-out time and database-derived status/duration update correctly |
| 3.3 | Check in again after checkout | A new attendance row opens; historical row remains intact |
| 3.4 | Attempt concurrent/double attendance opens for one visitor | Application prevents duplicates or the unique constraint rejects the second open row |
| 3.5 | Inspect assigned room and purpose | Visit references use the intended room/purpose records, not stale or invented free-text values |
| 3.6 | Attempt to write generated status/duration fields | Database rejects the write; normal application paths do not submit generated columns |
| 3.7 | Attempt a room visit without active attendance | No room visit is persisted |

## 4. Room visit persistence and integrity

| # | Check | Pass condition |
| --- | --- | --- |
| 4.1 | Scan a configured room code while checked in | One open `room_visits` row references the correct user, room and attendance visit (`clock_in_id`) |
| 4.2 | Scan a different configured room | Previous room row closes and a new room row opens; at most one room visit remains open |
| 4.3 | Scan the same room again | Current room visit closes or follows the implementation's explicit already-in-room outcome; no duplicate open row is created |
| 4.4 | Attempt concurrent open room visits for one visitor | Application or unique constraint prevents more than one open room visit |
| 4.5 | Check out while a room visit is open and confirm | Attendance and room visit are both closed |
| 4.6 | Check out while a room visit is open and cancel | Neither record is partially closed |
| 4.7 | Scan a supported legacy room poster format | It resolves to room presence and does not toggle attendance |
| 4.8 | Scan unknown/malformed QR input | No attendance or room visit is written |
| 4.9 | Inspect visit history after close-out | Historical attendance and room rows remain available and their relationship is correct |

## 5. Authorization, RLS and grants

Use separate anon, visitor and admin test identities. Perform negative checks only in the isolated test project.

| # | Check | Pass condition |
| --- | --- | --- |
| 5.1 | Read intended lookup tables before sign-in | Only intended public lookup data is readable |
| 5.2 | Read profile data as visitor | Visitor can read only their own profile |
| 5.3 | Read attendance and room visit data as visitor | Visitor can read only their own visit data |
| 5.4 | Read admin records as admin | Admin can read data required by admin views |
| 5.5 | Attempt to insert a profile for another user or self-assign admin as visitor | RLS/constraints reject the operation |
| 5.6 | Attempt to update another visitor's profile as visitor | RLS rejects the operation |
| 5.7 | Attempt to alter another user's visit as visitor | RLS rejects the operation |
| 5.8 | Attempt to alter own attendance `time_in`, room/purpose references or generated fields | Grants/policies reject fields outside the allowed write/close-out behavior |
| 5.9 | Attempt to alter own room visit identity/entry fields | Grants/policies reject fields outside the allowed close-out behavior |
| 5.10 | Attempt DELETE on users, attendance and room visits | Deletion is unavailable or rejected; account/history retention behavior remains intact |
| 5.11 | Attempt to create a second admin | Database constraint rejects it |
| 5.12 | Attempt room/lookup management as visitor | Admin-only authorization rejects writes |

## 6. Admin API and persisted management

| # | Check | Pass condition |
| --- | --- | --- |
| 6.1 | Call `/api/admin/users` without an authenticated session | Request is rejected; no privileged action occurs |
| 6.2 | Call the admin endpoint as a visitor | Server-side authorization rejects the request regardless of client state |
| 6.3 | Create a test visitor as admin with server key configured | Auth account/profile are created with visitor role and requested fields |
| 6.4 | Submit invalid/duplicate create data | Clear failure is returned and no unintended partial account remains |
| 6.5 | Edit a visitor's profile, pending room/purpose and pass date | Values persist after a fresh database read/reload |
| 6.6 | Archive a visitor | Account is archived/revoked as implemented; visit history is retained |
| 6.7 | Restore an archived visitor | Account returns to active state without duplicating history |
| 6.8 | Attempt admin creation/management through visitor-management endpoint | Action is refused or unavailable; single-admin invariant remains true |
| 6.9 | In a disposable deployment without `SUPABASE_SERVICE_ROLE_KEY`, attempt an operation that requires it | Clear configuration failure is returned; key is never exposed to the client |
| 6.10 | Inspect browser bundles and API responses | Service-role key and privileged credentials are not present |

## 7. Room and lookup persistence

| # | Check | Pass condition |
| --- | --- | --- |
| 7.1 | Add a room as admin | Room number and QR value persist and are unique; fresh reads return the room |
| 7.2 | Rename a room | Name persists and existing visit references still resolve to the same room id |
| 7.3 | Deactivate/reactivate a room | Active state persists; historical visits remain |
| 7.4 | Attempt to delete a room with linked visit history | Delete is unavailable or rejected; history is not destroyed |
| 7.5 | Add/edit/deactivate lookup entries | Changes persist and active entries are available to appropriate pickers |
| 7.6 | Attempt to delete a referenced lookup | Referential constraints behave as configured; no historical reference is silently lost |
| 7.7 | Add Room 101 and inspect relevant course default mapping | Course-to-room mapping behaves as defined by current seed data and application logic |

## 8. Pass dates and data retention

| # | Check | Pass condition |
| --- | --- | --- |
| 8.1 | Self-register a test visitor | Pass end is set to the registering day as implemented |
| 8.2 | Create an admin visitor with an explicit future date | Explicit date is persisted and not replaced by a default |
| 8.3 | Create/update an admin visitor with explicit `NULL`, if supported by the form/API | NULL/never-expire behavior matches the implementation and schema |
| 8.4 | Set test pass to a past date and attempt new visit actions | New actions are refused; account and earlier history remain |
| 8.5 | Set test pass to today and test the expiry boundary | Pass remains valid for the documented expiry day according to application rules/timezone |
| 8.6 | Archive/expire a visitor with existing history | Existing records remain queryable to authorized admins; no hard delete occurs |

## 9. Deployment and reporting

| # | Check | Pass condition |
| --- | --- | --- |
| 9.1 | Compare test scans to database/report views | User, room, purpose, timestamps and generated values match observed actions |
| 9.2 | Export test attendance records and inspect contents | Export reflects persisted records and labels without stale or fabricated values |
| 9.3 | Deploy with required environment variables | Build and runtime access the intended Supabase environment |
| 9.4 | Change deployment variables and redeploy | New build uses the configured values; browser bundle contains no service-role key |
| 9.5 | Smoke-test verification, visitor check-in, station and admin routes on deployment | Routes work against the intended test/staging database and expected role access applies |
| 9.6 | Inspect logs after expected failures | Diagnostics are useful and contain no secrets, passwords or session tokens |

## Backend sign-off

| Section | Pass / Fail / N/A | Notes / issue IDs |
| --- | --- | --- |
| 1. Prerequisites / schema | | |
| 2. Authentication / verification | | |
| 3. Attendance integrity | | |
| 4. Room visit integrity | | |
| 5. Authorization / RLS / grants | | |
| 6. Admin API / management | | |
| 7. Room / lookup persistence | | |
| 8. Pass dates / retention | | |
| 9. Deployment / reporting | | |

**Accepted by:** ____________________  **Date:** ____________________

**Outstanding issues:**

1.
2.
3.
