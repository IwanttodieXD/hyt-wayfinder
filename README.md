# HYT Global

HYT Global is a visitor-management system for the HYT Global Institute. It helps staff verify visitors, record building attendance, track room occupancy, and review visit records.

> For a high-level overview of the system, see [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md).

## How visitor check-in works

Visitors do **not** need to create an account or log in. The visitor flow is:

1. The visitor provides their name and course for verification.
2. Once verified, they are automatically checked in to the building. They do not need to scan a separate check-in QR code.
3. When entering a room, they scan that room's QR code to record their room presence. Scanning another room's code records a move to that room.
4. When leaving the building, they scan the checkout QR code to check out.

The QR codes have different purposes: room codes record room presence; the checkout QR code records departure from the building. Follow the prompts shown by the app if it asks for confirmation.

## Staff and admin features

Staff/admin features documented for the system include:

- A station for displaying or printing QR codes
- Live room occupancy
- Attendance and room-visit records
- Room management
- Visitor management

Admin access is separate from the visitor flow and may require an administrator account. Exact access and available actions depend on the deployed configuration.

## Technology

- Next.js App Router, React, and TypeScript
- Supabase for database and server-side services
- Tailwind CSS
- `html5-qrcode` and `react-qr-code` for QR scanning and display

## Local development

### Prerequisites

- Node.js 18 or newer
- A Supabase project configured for this application

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy the example file and add the values for your Supabase project:

```bash
cp .env.example .env.local
```

At minimum, configure the Supabase project URL and public anon key:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used by the app |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only key for supported privileged admin operations; never expose it in browser code |
| `NEXT_PUBLIC_APP_URL` | Recommended application base URL |
| `DATABASE_URL` | Optional direct database connection, if required by the local setup |

Email/SMTP settings are not part of the visitor workflow and are not used by the application.

`.env.local` is gitignored. Never commit real credentials or keys.

### Database setup

Use the database setup and schema instructions in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md), [`supabase/SCHEMA.md`](./supabase/SCHEMA.md), and the ordered SQL migrations under `supabase/migrations/`. Confirm the instructions match the database instance before applying migrations, especially for a database that already contains data.

### Run the app

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other available scripts:

```bash
npm run build
npm start
npm run lint
npm test
```

## Main pages

The repository documents these pages; availability may depend on the current deployment and user permissions:

| Route | Purpose |
| --- | --- |
| `/` | Landing page / navigation |
| `/check-in` | Visitor verification and QR-scanning flow (confirm the deployed route and steps) |
| `/station` | Admin QR-code station |
| `/occupancy` | Room occupancy view |
| `/admin` | Admin dashboard |
| `/admin/records` | Attendance records |
| `/admin/room-records` | Room-visit history |
| `/admin/rooms` | Room management |
| `/admin/users` | Visitor management |

Older references to visitor login, self-service account registration, or visitors scanning an entrance QR code to check in do not describe the current visitor process. Visitors verify their name and course; successful verification checks them in. They scan room codes as needed and scan the checkout QR code when leaving.

## Tests

`npm test` runs the Node.js test runner. Automated coverage may not cover every end-to-end visitor, verification, or QR-scanning scenario; test those flows in a designated non-production environment.

## Security and privacy

- Keep Supabase service-role credentials server-side only.
- Do not share or commit environment secrets.
- Handle visitor names, course information, and attendance data as private information.
- Use a designated test environment and test data for UAT; avoid creating test records in production.

## Deployment

See [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) for deployment guidance. Verify environment variables, database setup, and the visitor verification/check-out flow in the target environment before launch.

## License

Private project for HYT Global Institute.
