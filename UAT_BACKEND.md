# Backend Checklist — HYT Global

**Status: Complete / approved** for the backend features represented in the current `final` branch. Checked items document implementation visible in the repository; they do not claim that a separate production or manual UAT run was performed.

## Schema and data model

- [x] The documented fresh-project setup is `supabase/migrations/20260101000000_full_setup.sql`.
- [x] The schema models rooms, purposes, visitor types, courses, users, attendance records and room visits.
- [x] Attendance and room visits are separate records with room visits linked to the attendance visit where applicable.
- [x] Status/duration values are database-generated rather than ordinary client-written fields.
- [x] Room, user and visit relationships preserve historical records.
- [x] Seed data and course default-room mappings are defined in the setup migration.

## Authentication and verification

- [x] Supabase Auth is used for account sessions; application profiles are stored separately.
- [x] Public registration creates visitor accounts, not administrator accounts.
- [x] `/api/verify` makes the server-side verification decision and handles eligible, pending, declined, expired, not-found and ambiguous outcomes.
- [x] Eligible verification provisions the intended session flow; the server does not trust a client-supplied verdict.
- [x] The verification implementation supports roster records with no usable email address.
- [x] Pass expiry is handled separately from account archival; expired visitors retain account/history while new visit actions are restricted.

## Attendance and room visits

- [x] Attendance rows are opened and closed through the entrance-code flow.
- [x] Room visits are opened/closed through room-door scans and do not independently toggle attendance.
- [x] Room scans are gated by active attendance in the application flow.
- [x] A room move closes the previous open room visit before opening another.
- [x] Check-out while in a room supports confirmation before closing attendance and room presence.
- [x] The schema includes uniqueness/integrity rules for open attendance and open room visits.
- [x] Legacy room QR values are recognized by the QR parser.

## Authorization and administration

- [x] Row Level Security and grants are defined in the setup migration for application tables.
- [x] Visitor data access is scoped by user identity; administrator actions use server-side role checks and database policies as applicable.
- [x] The schema enforces a single administrator account.
- [x] User-management server operations that require elevated privileges use the server-only `SUPABASE_SERVICE_ROLE_KEY`.
- [x] User management archives/restores accounts rather than deleting visit history.
- [x] Room and lookup management is restricted to administrators.
- [x] Generated visit fields and historical visit rows are protected from ordinary destructive edits.

## Runtime configuration and documentation

- [x] Supabase URL and anon key are configured through the documented environment variables.
- [x] The service-role key is documented as server-only and must not be exposed through `NEXT_PUBLIC_*` variables.
- [x] The setup and deployment references are linked from the project documentation.
- [x] Backend acceptance scenarios are separated from the frontend feature checklist.

## Approval

- [x] Backend feature checklist reviewed and approved for the current branch.

**Approval date:** 2026-11-10
