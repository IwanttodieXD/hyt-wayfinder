# Database Setup Guide - HYT Visitor Management System

This guide walks you through setting up PostgreSQL and Prisma for the VMS.

## Prerequisites

1. **PostgreSQL** installed locally or access to a PostgreSQL instance
2. **Node.js** (already installed based on your project)
3. **npm** package manager

## Step 1: Install PostgreSQL

### Windows
Download and install from: https://www.postgresql.org/download/windows/

Or use Chocolatey:
```powershell
choco install postgresql
```

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create Database

Open PostgreSQL terminal:
```powershell
# Windows (run as Administrator)
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

Create the database:
```sql
CREATE DATABASE hyt_vms;
CREATE USER hyt_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hyt_vms TO hyt_admin;
\q
```

## Step 3: Install Dependencies

```powershell
cd hyt-wayfinder
npm install prisma @prisma/client tsx --save-dev
```

**Note:** `tsx` is needed to run the TypeScript seed script.

## Step 4: Configure Environment Variables

Copy the example file:
```powershell
cp .env.example .env
```

Edit `.env` and update the DATABASE_URL:
```env
DATABASE_URL="postgresql://hyt_admin:your_secure_password@localhost:5432/hyt_vms?schema=public"
```

**Important:** Add `.env` to `.gitignore` (already done if following Next.js defaults)

## Step 5: Generate Prisma Client

```powershell
npx prisma generate
```

This generates the TypeScript types based on your schema.

## Step 6: Run Initial Migration

```powershell
npx prisma migrate dev --name init_vms_schema
```

This will:
- Create all tables (visitors, visits, rooms, kiosks, hosts)
- Apply indexes
- Generate migration files in `prisma/migrations/`

## Step 7: Seed the Database

```powershell
npx prisma db seed
```

Or manually:
```powershell
npm run prisma:seed
```

This populates:
- 2 kiosks (Main Entrance, East Entrance)
- 5 rooms (Conference A, Meeting Room 1, Executive Office, Barista Station, Reception)
- 3 hosts (John Doe, Jane Smith, Mike Johnson)
- 2 sample visitors for testing

## Step 8: Verify Setup

Open Prisma Studio to browse your data:
```powershell
npx prisma studio
```

This opens a web UI at `http://localhost:5555`

## Common Commands

### View Database Schema
```powershell
npx prisma db pull
```

### Reset Database (Warning: Deletes all data)
```powershell
npx prisma migrate reset
```

### Format Schema File
```powershell
npx prisma format
```

### Generate Client After Schema Changes
```powershell
npx prisma generate
```

## Troubleshooting

### Error: "Can't reach database server"
- Check PostgreSQL is running: `pg_isready`
- Verify connection string in `.env`
- Check firewall settings

### Error: "Database does not exist"
- Create the database manually using psql (Step 2)

### Error: "relation does not exist"
- Run migrations: `npx prisma migrate dev`

### Migration Conflicts
- If you have manual changes, create a new migration:
  ```powershell
  npx prisma migrate dev --name describe_your_changes
  ```

## Database Schema Overview

### Tables
1. **visitors** - Visitor profile and QR code data
2. **visits** - Check-in/check-out session logs
3. **rooms** - Physical room locations with 3D coordinates
4. **kiosks** - Entry point kiosks with 3D coordinates
5. **hosts** - Employee/host profiles with notification preferences

### Key Relationships
- Each Visit belongs to one Visitor, Host, Room, and Kiosk
- Visitors can have multiple Visits (history)
- Rooms and Kiosks have 3D coordinates for wayfinding

### Indexes
Optimized for:
- QR code lookups (visitor check-in)
- Active visit queries (dashboard)
- Host filtering (notifications)
- Date range queries (reports)

## Production Deployment

For production, consider:

1. **Managed PostgreSQL Service**
   - AWS RDS
   - Azure Database for PostgreSQL
   - DigitalOcean Managed Databases
   - Supabase (includes Auth + Storage)

2. **Connection Pooling**
   Add PgBouncer or use Prisma's connection pooling:
   ```env
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."  # For migrations
   ```

3. **Backup Strategy**
   - Automated daily backups
   - Point-in-time recovery
   - Offsite backup storage

4. **Monitoring**
   - Query performance
   - Connection pool status
   - Slow query logs

## Next Steps

After database setup is complete:
- ✅ Database schema created
- ✅ Sample data seeded
- 🔲 Build API endpoints (`/api/check-in`, `/api/check-out`)
- 🔲 Implement QR scanner component
- 🔲 Add 3D wayfinding logic

Proceed to Phase 2: QR System Implementation
