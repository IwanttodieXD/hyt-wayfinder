# Frontend Checklist — HYT Global

**Status: Complete / approved** for the frontend features represented in the current `final` branch. Checked items document implemented user-facing functionality; they do not claim a separate manual UAT session was run.

## Visitor experience

- [x] Public entrance route `/` leads into the verification flow at `/verify`.
- [x] Verification form collects first name, last name and course and presents distinct outcomes for eligible, pending, declined, expired, unknown and ambiguous records.
- [x] New visitors can access `/register`; registration fields and lookup pickers are available.
- [x] Visitors can sign in at `/login` and access the check-in experience.
- [x] Protected visitor pages resolve authentication before showing protected content.
- [x] Expired-pass messaging explains that new visit actions are paused and directs the visitor to request renewal.
- [x] `/visitor` leads into the visitor check-in experience.

## QR and check-in interface

- [x] `/check-in` presents the camera scanner and handles camera start/error states.
- [x] The scanner distinguishes entrance attendance codes from room-door codes and a personal QR code.
- [x] The entrance code starts attendance when the visitor is checked out and checks out when scanned again.
- [x] Room scans require active attendance and provide room-specific feedback.
- [x] Scanning another room represents a room move; scanning the same room gives the already-in-room outcome.
- [x] Checking out while recorded in a room prompts for confirmation and names the room.
- [x] The visitor view displays attendance status, assigned-room information and next-step guidance.
- [x] The scanner and visitor view adapt to mobile viewport sizing.

## Administrator interface

- [x] `/admin` provides the administrator dashboard.
- [x] `/admin/records` presents attendance records and available search/filter/export controls.
- [x] `/admin/room-records` presents room-visit history.
- [x] `/occupancy` presents current room occupancy with expandable room details.
- [x] `/admin/rooms` supports room management, including deactivation/reactivation rather than UI deletion.
- [x] `/admin/users` provides visitor management, including create/edit/archive/restore UI.
- [x] `/admin/lookups` provides purpose, visitor-type and course management UI.
- [x] `/station` presents attendance and room QR codes for display/printing.
- [x] Admin navigation and protected-route behavior distinguish administrator access from visitor access.

## Presentation and documentation

- [x] Theme controls and responsive layouts are provided by the application.
- [x] Scanner feedback, validation and confirmation dialogs communicate key actions.
- [x] `/station` includes a print-oriented QR layout.
- [x] User-facing routes and flows are described in [`USER_MANUAL.md`](./USER_MANUAL.md).
- [x] This checklist is separated from backend behavior and database/security checks.

## Approval

- [x] Frontend feature checklist reviewed and approved for the current branch.

**Approval date:** 2026-11-10
