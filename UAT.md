# UAT Checklists — HYT Global

Acceptance testing is split by responsibility:

- [Frontend UAT](./UAT_FRONTEND.md) — visible pages, visitor/admin flows, scanner UI, responsive behavior, accessibility and printing.
- [Backend UAT](./UAT_BACKEND.md) — authentication, server decisions, Supabase persistence, RLS/grants, integrity and deployment configuration.
- [User Manual](./USER_MANUAL.md) — instructions for visitors and administrators.

Run the UATs against the same recorded build and a non-production test environment. Enter tester, date, build/commit, URL/database and browser details in each checklist. Leave all checks unchecked until someone performs them; a checklist is not evidence that a test passed. Do not put credentials, tokens or service-role keys in test notes.

## Overall sign-off

| Document | Pass / Fail / N/A | Tester | Date | Notes / issue IDs |
| --- | --- | --- | --- | --- |
| [Frontend UAT](./UAT_FRONTEND.md) | | | | |
| [Backend UAT](./UAT_BACKEND.md) | | | | |
| [Manual review](./USER_MANUAL.md) | | | | |

**Accepted by:** ____________________  **Date:** ____________________

**Outstanding issues:**

1.
2.
3.
