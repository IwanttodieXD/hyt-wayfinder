# Frontend UAT Checklist — HYT Global

Use this checklist to test **visible application functions** in a browser. For every row, mark exactly one result after testing; leave both blank until tested. Record failures and steps to reproduce in Notes. See [Backend UAT](./UAT_BACKEND.md) for server, database and authorization checks.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Test URL | |
| Browser / device | |

## Visitor functions

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 1 | Open `/` and reach the entrance verification page | ☐ | ☐ | |
| 2 | Submit `/verify` with first name, last name and course | ☐ | ☐ | |
| 3 | Submit the verification form with required fields missing and see useful validation | ☐ | ☐ | |
| 4 | Verify an eligible roster record and reach the visitor check-in flow | ☐ | ☐ | |
| 5 | Verify pending, declined or expired records and see the appropriate guidance | ☐ | ☐ | |
| 6 | Verify an unknown or ambiguous record and see the appropriate next step | ☐ | ☐ | |
| 7 | Open `/register`, load the available pickers and complete registration | ☐ | ☐ | |
| 8 | Submit invalid registration details and receive clear feedback | ☐ | ☐ | |
| 9 | Sign in at `/login` with valid credentials | ☐ | ☐ | |
| 10 | Submit invalid login credentials and receive a readable error | ☐ | ☐ | |
| 11 | Open `/check-in` and start the camera scanner when permission is available | ☐ | ☐ | |
| 12 | Deny camera permission and receive a useful recovery message | ☐ | ☐ | |
| 13 | Scan the entrance code while checked out and see checked-in status | ☐ | ☐ | |
| 14 | Scan a room-door code while checked in and see room feedback | ☐ | ☐ | |
| 15 | Scan a different room code and see the new current room | ☐ | ☐ | |
| 16 | Scan the same room code again and see the expected already-in-room response | ☐ | ☐ | |
| 17 | Scan the entrance code while in a room and see a confirmation naming that room | ☐ | ☐ | |
| 18 | Cancel the check-out confirmation and remain checked in | ☐ | ☐ | |
| 19 | Confirm check-out and see the checked-out state | ☐ | ☐ | |
| 20 | Scan an unknown QR code and receive an understandable error | ☐ | ☐ | |
| 21 | Toggle between camera and personal QR display | ☐ | ☐ | |
| 22 | View visitor status, assigned-room information and next-step guidance | ☐ | ☐ | |
| 23 | View expired-pass guidance and understand how to request renewal | ☐ | ☐ | |

## Administrator functions

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 24 | Open `/admin` as an administrator and view the dashboard | ☐ | ☐ | |
| 25 | Open `/admin/records`, search/filter records and use available exports | ☐ | ☐ | |
| 26 | Open `/admin/room-records` and inspect room visit history | ☐ | ☐ | |
| 27 | Open `/occupancy` and expand a room to inspect occupants | ☐ | ☐ | |
| 28 | Open `/admin/rooms` and add or rename a test room | ☐ | ☐ | |
| 29 | Deactivate and reactivate a room through the UI | ☐ | ☐ | |
| 30 | Open `/admin/users` and search/filter the visitor list | ☐ | ☐ | |
| 31 | Create or edit a test visitor through the UI | ☐ | ☐ | |
| 32 | Archive and restore a test visitor through the UI | ☐ | ☐ | |
| 33 | Open `/admin/lookups` and use the available purpose/type/course controls | ☐ | ☐ | |
| 34 | Open `/station` and view the entrance and room QR codes | ☐ | ☐ | |

## Usability and presentation

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 35 | Use visitor and admin pages on a phone-sized viewport | ☐ | ☐ | |
| 36 | Use key forms and dialogs with keyboard navigation | ☐ | ☐ | |
| 37 | Toggle the theme and confirm text and controls remain readable | ☐ | ☐ | |
| 38 | Open an unknown route and use the recovery link on the not-found page | ☐ | ☐ | |
| 39 | Print `/station` and confirm QR labels/layout are usable | ☐ | ☐ | |

## Frontend sign-off

| Result | Selection |
| --- | --- |
| Overall | ☐ Pass ☐ Fail ☐ Blocked |
| Tester | |
| Date | |

**Outstanding issues / retest notes:**

1.
2.
3.
