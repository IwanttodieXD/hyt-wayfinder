# Frontend UAT Checklist — HYT Global

Validate visible behavior and browser-based user journeys. This checklist does not certify backend security or database integrity; use [Backend UAT](./UAT_BACKEND.md) for those checks. Record actual results—leave boxes unchecked until tested. A section passes only when every applicable check passes.

| Field | Value |
| --- | --- |
| Tester | |
| Date | |
| Build / commit | |
| Test URL | |
| Browser(s) / device(s) | |

Use a test environment and test accounts. Note failures and attach screenshots or steps without including passwords, tokens or other secrets.

## 1. Public entrance and verification

| # | Check | Pass condition |
| --- | --- | --- |
| 1.1 | Open `/` | It takes the user to the entrance experience at `/verify` |
| 1.2 | Submit `/verify` with missing required input | Field validation is clear and the user can correct the form |
| 1.3 | Verify an eligible approved/recognized test record | Clear success feedback appears and the visitor reaches `/check-in` |
| 1.4 | Verify pending, declined or expired test records | Each outcome has distinct, understandable instructions and does not appear as a successful check-in |
| 1.5 | Verify an unknown or ambiguous name/course | The correct not-found or ambiguous guidance appears; the user can retry or follow the offered next step |
| 1.6 | Use `/verify` on a narrow phone viewport | Fields, results and buttons remain readable and usable without horizontal page scrolling |

## 2. Registration, sign-in and visitor navigation

| # | Check | Pass condition |
| --- | --- | --- |
| 2.1 | Open `/register` signed out | Required profile fields and lookup pickers are visible and understandable |
| 2.2 | Submit registration with missing/invalid data | Useful validation appears; user can correct the form |
| 2.3 | Complete registration with a test account | The UI reports the result and gives a clear next step |
| 2.4 | Sign in at `/login` with invalid credentials | A readable error appears without exposing technical details |
| 2.5 | Sign in as a visitor | Visitor reaches the visitor/check-in experience |
| 2.6 | Open `/visitor` as a visitor | It routes to or presents the current visitor check-in experience |
| 2.7 | Open an admin page as a visitor | Visitor is redirected or shown an access-appropriate result; admin content is not displayed |
| 2.8 | Refresh a protected page while signed in | Loading/auth resolution does not flash protected content or incorrectly eject the user |
| 2.9 | View an expired-pass state | Warning explains that new visit actions are paused and tells the visitor to contact the front desk/admin |

## 3. QR scanner and visitor journey

| # | Check | Pass condition |
| --- | --- | --- |
| 3.1 | Open `/check-in` with camera permission available | Scanner opens, fits the screen and explains the entrance/room code actions |
| 3.2 | Deny camera permission or use an unavailable camera | Helpful error appears and the user can retry after fixing access |
| 3.3 | Review the QR legend and scan instructions | Entrance attendance, room-door presence and personal QR purposes are distinguishable |
| 3.4 | Scan the entrance code while checked out | Success feedback and checked-in status appear |
| 3.5 | Scan a room-door code while checked in | Feedback identifies the recorded room and attendance remains checked in |
| 3.6 | Scan a different room code | UI reflects the new room without implying that attendance ended |
| 3.7 | Scan the same room code again | UI explains the already-in-room/room-visit behavior without claiming a room move |
| 3.8 | Scan the entrance code while recorded in a room; cancel | Confirmation names the room; cancel leaves the visitor seeing the checked-in state |
| 3.9 | Repeat and confirm the check-out prompt | Visitor receives clear completion feedback and sees the checked-out state |
| 3.10 | Scan an unknown code | Clear error appears and the scanner can be used again |
| 3.11 | Toggle Camera / My QR | Camera starts/stops appropriately; personal QR is legible and clearly meant for reception scanning |
| 3.12 | Test short/tall mobile viewports and orientation changes | Camera frame, status, instructions and controls remain reachable; no critical control is clipped |

## 4. Admin UI

| # | Check | Pass condition |
| --- | --- | --- |
| 4.1 | Open `/admin` as admin | Dashboard renders the available activity summary and navigation |
| 4.2 | Open `/admin/records` and use search/date/status filters | Controls are understandable and displayed rows respond to filter changes |
| 4.3 | Use attendance export controls | CSV/PDF actions, where available, provide clear download/feedback |
| 4.4 | Open `/admin/room-records` | Room visit list/grouping and search/filter controls are readable |
| 4.5 | Open `/occupancy` and expand room cards | Occupant details and empty-room state are clear; multiple rooms can be inspected |
| 4.6 | Open `/admin/rooms` | Add/edit/deactivate/reactivate UI is understandable; no delete action is presented |
| 4.7 | Open `/admin/users` | Search, filtering, sorting, pagination and visitor details render correctly |
| 4.8 | Use visitor create/edit/archive/restore UI with test accounts | Confirmation, validation and success/error feedback are understandable |
| 4.9 | Open `/admin/lookups` | Purpose, visitor type and course sections and available actions are discoverable |
| 4.10 | Open `/station` | Attendance and active-room codes/labels are visible and print controls are usable |
| 4.11 | Use admin pages on phone/tablet sizes | Navigation, tables, dialogs and actions remain usable without unintended horizontal overflow |

## 5. Accessibility, visual behavior and printing

| # | Check | Pass condition |
| --- | --- | --- |
| 5.1 | Navigate forms and dialogs using keyboard only | Focus remains visible and controls can be reached and activated |
| 5.2 | Inspect scanner status, dialogs and validation with assistive technology | Controls have meaningful labels and important status/error text is available |
| 5.3 | Toggle dark/light theme on mobile, tablet and desktop | Theme changes and text/controls remain legible |
| 5.4 | Toggle theme repeatedly | No stuck overlay, unusable animation or persistent unreadable state |
| 5.5 | Open an unknown route | Branded not-found state appears with a working recovery link |
| 5.6 | Print `/station` | QR codes and labels print cleanly; screen-only controls and live counts are not misleadingly printed |

## Frontend sign-off

| Section | Pass / Fail / N/A | Notes / issue IDs |
| --- | --- | --- |
| 1. Public entrance / verification | | |
| 2. Registration / sign-in / navigation | | |
| 3. QR scanner / visitor journey | | |
| 4. Admin UI | | |
| 5. Accessibility / visual behavior / printing | | |

**Accepted by:** ____________________  **Date:** ____________________

**Outstanding issues:**

1.
2.
3.
