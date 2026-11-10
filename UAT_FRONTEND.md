# Frontend UAT Checklist — HYT Global

Use this checklist to test the application's visible functions in a browser. Mark each item after testing and add details for any failure or retest.

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
| 1 | Open `/` and confirm the entrance verification page loads | ☐ | ☐ | |
| 2 | Submit `/verify` with a visitor's name and course; confirm the matching visitor record is found | ☐ | ☐ | |
| 3 | Submit verification with required fields missing; confirm the form identifies what needs attention | ☐ | ☐ | |
| 4 | Verify an eligible visitor and confirm they can continue to check-in | ☐ | ☐ | |
| 5 | Verify pending, declined, or expired records; confirm the page explains the visitor's status and next step | ☐ | ☐ | |
| 6 | Verify an unknown or ambiguous record; confirm the page explains what to do next | ☐ | ☐ | |
| 7 | Open `/register`, confirm the available selection lists load, and submit a valid registration | ☐ | ☐ | |
| 8 | Submit invalid registration details; confirm clear validation or error feedback appears | ☐ | ☐ | |
| 9 | Sign in at `/login` with valid credentials and confirm the visitor reaches the appropriate page | ☐ | ☐ | |
| 10 | Sign in with invalid credentials; confirm a readable error appears and the form remains usable | ☐ | ☐ | |
| 11 | Open `/check-in` and start the camera scanner; confirm the camera preview works when permission is granted | ☐ | ☐ | |
| 12 | Deny camera permission; confirm the page explains the problem and offers a way to continue or retry | ☐ | ☐ | |
| 13 | While checked out, scan the entrance QR code; confirm the visitor becomes checked in | ☐ | ☐ | |
| 14 | While checked in, scan a room QR code; confirm the room visit is recorded and room feedback appears | ☐ | ☐ | |
| 15 | Scan a different room QR code; confirm the current room changes to the new room | ☐ | ☐ | |
| 16 | Scan the same room QR code again; confirm the page explains that the visitor is already in that room | ☐ | ☐ | |
| 17 | While in a room, scan the entrance QR code; confirm the check-out prompt names the current room | ☐ | ☐ | |
| 18 | Cancel the check-out prompt; confirm the visitor remains checked in and in the same room | ☐ | ☐ | |
| 19 | Confirm check-out; confirm the visitor is checked out and no longer shown as occupying a room | ☐ | ☐ | |
| 20 | Scan an unknown QR code; confirm an understandable error appears without changing visitor status | ☐ | ☐ | |
| 21 | Switch between the camera scanner and personal QR display; confirm each view opens and can be switched back | ☐ | ☐ | |
| 22 | View visitor status and assigned-room information; confirm the displayed details and next steps are clear | ☐ | ☐ | |
| 23 | View an expired pass; confirm the page explains how to request renewal | ☐ | ☐ | |

## Administrator functions

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 24 | Open `/admin` as an administrator; confirm the dashboard loads and shows current summary information | ☐ | ☐ | |
| 25 | Open `/admin/records`; search and filter records, then use an available export | ☐ | ☐ | |
| 26 | Open `/admin/room-records`; inspect room visit history and confirm record details are displayed | ☐ | ☐ | |
| 27 | Open `/occupancy`; expand a room and confirm its current occupants are shown | ☐ | ☐ | |
| 28 | Open `/admin/rooms`; add or rename a test room and confirm the change appears in the room list | ☐ | ☐ | |
| 29 | Deactivate a test room and reactivate it; confirm its status updates in the interface | ☐ | ☐ | |
| 30 | Open `/admin/users`; search and filter the visitor list | ☐ | ☐ | |
| 31 | Create or edit a test visitor; confirm the saved details appear in the visitor list | ☐ | ☐ | |
| 32 | Archive a test visitor and restore them; confirm the visitor's status updates each time | ☐ | ☐ | |
| 33 | Open `/admin/lookups`; view and use the purpose, type, and course controls | ☐ | ☐ | |
| 34 | Open `/station`; confirm entrance and room QR codes and their labels are displayed | ☐ | ☐ | |

## Usability and presentation

| # | Function to test | Pass | Fail | Notes / issue |
| --- | --- | :---: | :---: | --- |
| 35 | Use visitor and admin pages at a phone-sized viewport; confirm content and actions remain accessible | ☐ | ☐ | |
| 36 | Navigate key forms and dialogs using the keyboard; confirm focus is visible and actions work | ☐ | ☐ | |
| 37 | Toggle the theme; confirm text, controls, and status messages remain readable | ☐ | ☐ | |
| 38 | Open an unknown route; confirm the not-found page offers a working recovery link | ☐ | ☐ | |
| 39 | Print `/station`; confirm the QR codes, labels, and layout are usable on paper | ☐ | ☐ | |

## Frontend sign-off

| Result | Selection |
| --- | --- |
| Overall | ☐ Pass ☐ Fail ☐ Blocked |
| Tester | |
| Date | |

**Outstanding issues / retest notes:**
