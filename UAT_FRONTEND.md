# Frontend and Backend UAT Checklist — HYT Global

Use this checklist to verify both the visible application behavior and the underlying system responses for the HYT Global flow. Mark each item after testing and record any retest or issue in the notes column.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Test URL | |
| Browser / device | |
| API / environment | |

## Frontend user functions

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 1 | Open `/` and confirm the entrance verification page loads correctly | ☐ | ☐ | |
| 2 | Submit `/verify` with valid visitor details and confirm the matching record is found | ☐ | ☐ | |
| 3 | Submit `/verify` with missing required fields and confirm validation messages appear | ☐ | ☐ | |
| 4 | Verify a pending, declined, or expired record and confirm the correct guidance is displayed | ☐ | ☐ | |
| 5 | Verify an unknown or ambiguous record and confirm the next step is clear | ☐ | ☐ | |
| 6 | Open `/register`, load the available pickers, and complete a valid registration | ☐ | ☐ | |
| 7 | Submit invalid registration data and confirm the user sees clear error feedback | ☐ | ☐ | |
| 8 | Sign in at `/login` with valid credentials and confirm access is granted | ☐ | ☐ | |
| 9 | Sign in with invalid credentials and confirm a readable error is shown | ☐ | ☐ | |
| 10 | Open `/check-in` and start the camera scanner when permission is granted | ☐ | ☐ | |
| 11 | Deny camera permission and confirm the recovery message is clear and usable | ☐ | ☐ | |
| 12 | Scan an entrance QR code while checked out and confirm the visitor becomes checked in | ☐ | ☐ | |
| 13 | Scan a room QR code while checked in and confirm room feedback is displayed | ☐ | ☐ | |
| 14 | Scan a different room QR code and confirm the current room changes appropriately | ☐ | ☐ | |
| 15 | Scan the same room QR code again and confirm the already-in-room message appears | ☐ | ☐ | |
| 16 | Scan the entrance QR code while already in a room and confirm the checkout prompt names the room | ☐ | ☐ | |
| 17 | Cancel the checkout prompt and confirm the visitor remains checked in | ☐ | ☐ | |
| 18 | Confirm checkout and confirm the visitor is checked out successfully | ☐ | ☐ | |
| 19 | Scan an unknown QR code and confirm the error message is understandable and non-destructive | ☐ | ☐ | |
| 20 | Toggle between camera mode and personal QR display and confirm both states work | ☐ | ☐ | |
| 21 | View visitor status and assigned room details and confirm the information is accurate and readable | ☐ | ☐ | |
| 22 | View expired-pass guidance and confirm the request-renewal path is understandable | ☐ | ☐ | |
| 23 | Open `/admin` and confirm the dashboard loads with the expected summary information | ☐ | ☐ | |
| 24 | Open `/admin/records`, search/filter records, and use an available export | ☐ | ☐ | |
| 25 | Open `/admin/room-records` and inspect room visit history for accuracy | ☐ | ☐ | |
| 26 | Open `/occupancy`, expand a room, and confirm occupant details are displayed correctly | ☐ | ☐ | |
| 27 | Open `/admin/rooms`, add or rename a test room, and confirm the change appears in the UI | ☐ | ☐ | |
| 28 | Deactivate and reactivate a room and confirm the status changes are visible | ☐ | ☐ | |
| 29 | Open `/admin/users` and search/filter the visitor list correctly | ☐ | ☐ | |
| 30 | Create or edit a test visitor and confirm the saved data appears in the UI | ☐ | ☐ | |
| 31 | Archive and restore a visitor and confirm status changes are reflected correctly | ☐ | ☐ | |
| 32 | Open `/admin/lookups` and use the purpose, type, and course controls as expected | ☐ | ☐ | |
| 33 | Open `/station` and confirm the entrance and room QR labels are visible and usable | ☐ | ☐ | |
| 34 | Use the main visitor/admin pages on a phone-sized viewport and confirm layout remains usable | ☐ | ☐ | |
| 35 | Navigate key forms and dialogs using a keyboard and confirm focus is visible and functional | ☐ | ☐ | |
| 36 | Toggle the app theme and confirm text and controls remain readable | ☐ | ☐ | |
| 37 | Open an unknown route and confirm the not-found page includes a working recovery link | ☐ | ☐ | |
| 38 | Print `/station` and confirm QR labels and layout remain usable on paper | ☐ | ☐ | |

## Backend and service validation

| # | Backend function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 39 | Visitor verification API returns the correct status for eligible, pending, declined, expired, and unknown records | ☐ | ☐ | |
| 40 | Registration API validates missing and invalid input and returns clear error responses | ☐ | ☐ | |
| 41 | Login API authenticates valid users and rejects invalid credentials with the expected response | ☐ | ☐ | |
| 42 | Check-in API creates the correct visitor status update when an entrance QR code is scanned | ☐ | ☐ | |
| 43 | Room-scan API updates the visitor's current room when a valid room code is used | ☐ | ☐ | |
| 44 | Duplicate room scan is handled correctly and returns the expected already-in-room response | ☐ | ☐ | |
| 45 | Checkout API correctly ends the active visit and clears room occupancy when confirmed | ☐ | ☐ | |
| 46 | Cancelling checkout keeps the active check-in state intact in the backend data | ☐ | ☐ | |
| 47 | Unknown or malformed QR code requests return a safe error response without changing user state | ☐ | ☐ | |
| 48 | Visitor status and room assignment data are consistent across pages and API responses | ☐ | ☐ | |
| 49 | Expired pass logic correctly marks the visitor and returns the proper guidance in the response payload | ☐ | ☐ | |
| 50 | Admin dashboard endpoints return accurate summary counts and record totals | ☐ | ☐ | |
| 51 | Record search/filter and export endpoints return the expected data for valid queries | ☐ | ☐ | |
| 52 | Room-visit history endpoint returns the correct visit log and room details | ☐ | ☐ | |
| 53 | Occupancy endpoint correctly lists active occupants for each room | ☐ | ☐ | |
| 54 | Room management API adds, updates, activates, and deactivates rooms correctly | ☐ | ☐ | |
| 55 | Visitor management API creates, edits, archives, and restores visitors without data inconsistency | ☐ | ☐ | |
| 56 | Lookup endpoints return valid purpose, type, and course options for the UI controls | ☐ | ☐ | |
| 57 | Station QR-code generation endpoint returns valid entrance and room QR payloads | ☐ | ☐ | |
| 58 | Data integrity checks confirm room, visit, and visitor tables remain consistent after each main flow | ☐ | ☐ | |
| 59 | Error handling and logging are working for failed backend operations and invalid requests | ☐ | ☐ | |

## Combined sign-off

| Result | Selection |
| --- | --- |
| Overall | ☐ Pass ☐ Fail ☐ Blocked |
| Frontend tester | |
| Backend tester | |
| Date | |

**Outstanding issues / retest notes:**
