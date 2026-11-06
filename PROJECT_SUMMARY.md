# HYT Global — Project Summary

HYT Global is a visitor-management website for the HYT Global Institute. It helps staff verify visitors, record who is in the building, track room presence, and review attendance history.

## Visitor flow

Visitors do **not** need an account or login. They provide their name and course for verification. When verification succeeds, the system automatically checks them in to the building.

After that:

1. Visitors scan a room's QR code when they enter it.
2. Scanning a different room's QR code records their move to that room.
3. When leaving the building, visitors scan the checkout QR code to check out.

Room QR codes track room presence; the checkout QR code records that the visitor is leaving the building. The visitor does not need to scan a separate entrance check-in QR code after verification.

## Staff/admin capabilities

The system's documented staff and admin tools include:

- A station for displaying or printing QR codes
- A room occupancy view
- Attendance records and room-visit history
- Room management
- Visitor management

Admin access is separate from the visitor flow. The precise admin permissions and available actions depend on the application configuration and deployment.

## Main pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page / navigation |
| `/check-in` | Visitor verification and QR-scanning flow; confirm exact deployed route and steps |
| `/station` | Admin QR-code station |
| `/occupancy` | Room occupancy view |
| `/admin` | Admin dashboard |
| `/admin/records` | Attendance records |
| `/admin/room-records` | Room-visit history |
| `/admin/rooms` | Room management |
| `/admin/users` | Visitor management |

Routes and access may vary by deployment. Older documentation describes visitor logins, self-registration, and entrance-QR check-in; those are not the current visitor workflow described here.

## Technology

The application uses Next.js, React, TypeScript, Supabase, Tailwind CSS, and QR-scanning/display libraries. The repository includes database setup instructions and SQL migrations under `supabase/`.

## Setup and operations

For developer setup, environment variables, database setup, and deployment, see [`README.md`](./README.md), [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md), and [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md).

Email/SMTP is not used by the visitor process or current application workflow; do not describe email as a visitor verification or notification feature.

## Important notes

- Visitors are verified by name and course, then automatically checked in when verification succeeds.
- Visitors scan room QR codes to record room presence and the checkout QR code when leaving.
- Confirm the exact verification interface, QR behavior, and admin permissions in the deployed application before publishing user instructions.
- Keep visitor information and Supabase credentials private. Never expose service-role keys in client-side code or documentation.
