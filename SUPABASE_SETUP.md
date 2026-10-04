# Supabase Setup Guide - HYT Wayfinder

> **⚠️ Partly outdated.** The schema described below predates
> `supabase/migrations/`. It still shows `role` as a TEXT column with a CHECK
> constraint; the live schema uses the `user_role` enum and RLS policies instead.
> **Use the migrations as the source of truth** — run them in filename order on a
> fresh database:
>
> 1. `20260101000001_full_schema.sql` — tables, enums, grants, RLS policies
> 2. `20260101000002_registration_fix.sql` — required, or registration fails
> 3. `20260101000003_retire_trainee_roles.sql` — retires `trainer`/`trainee`
> 4. `20260101000004_visitor_profiles.sql` — visitor types, pass expiry, single admin
> 5. `20260101000005_service_role_grants.sql` — **required**, or all admin user
>    create/edit/archive calls fail with `permission denied for table users`
>
> Only `admin` and `visitor` roles are used by the app, and there is exactly one
> admin account. Where this guide mentions `trainer` or `trainee` accounts, read
> `visitor`.
>
> **Apply these in order.** Each is written to be safe to re-run, but they build on
> one another.

## 🎯 Overview

This guide will help you set up Supabase as the backend database for HYT Wayfinder, replacing the mock authentication with real database-backed auth and records.

---

## 📋 Prerequisites

- Supabase account (free tier works)
- Your HYT Wayfinder project ready

---

## 🚀 Step 1: Create Supabase Project

### 1.1 Sign Up / Login
```
Visit: https://supabase.com
Click: "Start your project"
Sign in with GitHub (recommended)
```

### 1.2 Create New Project
```
Organization: Create or select
Project Name: hyt-wayfinder
Database Password: [Generate strong password]
Region: Choose closest to your users
Pricing Plan: Free (or Pro if needed)
```

### 1.3 Wait for Setup
- Takes 2-3 minutes
- You'll get a project dashboard

---

## 🔑 Step 2: Get API Credentials

### 2.1 Navigate to Settings
```
Dashboard → Settings → API
```

### 2.2 Copy These Values
```
Project URL: https://xxxxx.supabase.co
anon (public) key: eyJxxx...xxx
```

### 2.3 Add to Your Project

Create `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

**Important:** Add `.env.local` to `.gitignore` (already done)

---

## 🗄️ Step 3: Create Database Tables

### 3.1 Open SQL Editor
```
Dashboard → SQL Editor → New Query
```

### 3.2 Create Users Table

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'visitor')),
  avatar TEXT,
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Indexes for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
```

## User Management (/admin/users)

Basic CRUD for accounts and roles. Read and Update work today over RLS;
Create and Delete need the service role key.

### To enable Create/Delete

1. Add the service role key to `.env.local`:

   ```
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
   ```

   Get it from Supabase dashboard -> Project Settings -> API -> `service_role`.
   This key bypasses RLS, so it must stay server-side. Never name it
   `NEXT_PUBLIC_*`, or it gets bundled into the browser.

2. Restart the dev server.

Until then, Create and Delete return a clear `501` explaining the missing key,
and Read/Update keep working.

### How it works

- `store/usersStore.ts` - list, create, update, delete with the project's
  `{ success, error }` result shape.
- `app/api/admin/users/route.ts` - POST/DELETE. Verifies the caller is an
  admin using their own access token (the service key is never sent back up),
  then creates/deletes the real `auth.users` login via the service client.
- `app/admin/users/page.tsx` - admin-only table with search, role filter,
  create/edit modal and a delete confirmation.

Create makes the `auth.users` login first (`email_confirm: true`, so no
verification email), then the `public.users` profile. If the profile insert
fails it deletes the login again, so accounts are never left half-created.
Delete removes the login, which cascades to the profile and clock-in records.
Admins cannot delete their own account.

## User management (admin) - run this in the Supabase SQL editor

-- 0. Destination assignment, used by the register form and the admin
--    Add User / Edit User form. Nullable so existing rows are left untouched
--    and a user can exist without one; IF NOT EXISTS makes it safe to re-run.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS destination TEXT;

-- 1. The original CHECK constraint omitted 'trainee', which the app uses.
--    Drop and recreate it so trainee accounts can exist.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'trainer', 'trainee', 'visitor'));

-- 2. Admins need to write to any user row, not just their own.
--    Drop the old self-only UPDATE policy and replace it with an admin-aware one.
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Admin INSERT / DELETE on the profile table.
--    Note: creating the matching auth.users row still needs the service
--    role key, which is why create/delete go through a server route.
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3.3 Create Clock-In Records Table

```sql
-- Create clock_in_records table
CREATE TABLE public.clock_in_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('trainer', 'visitor')),
  destination TEXT NOT NULL,
  building TEXT NOT NULL,
  room TEXT NOT NULL,
  time_in TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  time_out TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own records
CREATE POLICY "Users can view own records"
  ON public.clock_in_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own records
CREATE POLICY "Users can create own records"
  ON public.clock_in_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own records
CREATE POLICY "Users can update own records"
  ON public.clock_in_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins can view all records
CREATE POLICY "Admins can view all records"
  ON public.clock_in_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX records_user_id_idx ON public.clock_in_records(user_id);
CREATE INDEX records_status_idx ON public.clock_in_records(status);
CREATE INDEX records_time_in_idx ON public.clock_in_records(time_in);
CREATE INDEX records_created_at_idx ON public.clock_in_records(created_at DESC);
```

### 3.4 Create Room Presence Table

Room presence answers a different question from attendance: of the people
currently checked in, **which room is each one in right now?**

Attendance (`clock_in_records`) is only ever written by scanning the single
ground floor code. Presence (`room_presence`) is only ever written by scanning
a room's door code. The two never mix, so a visitor can't change their
attendance by scanning the wrong poster, and occupancy history survives
independently of who is currently checked in.

Rows are append-only: scanning a door opens a row with `entered_at` and no
`exited_at`; scanning another room closes the previous open row first. That
means "who was in Room 304 at 3pm" is answerable, not just "who is there now".

```sql
-- Create room_presence table
CREATE TABLE public.room_presence (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  room TEXT NOT NULL,
  room_label TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  exited_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.room_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own presence history
CREATE POLICY "Users can view own presence"
  ON public.room_presence
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own presence
CREATE POLICY "Users can create own presence"
  ON public.room_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all presence
CREATE POLICY "Admins can view all presence"
  ON public.room_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can close anyone's rows (needed when correcting presence data)
CREATE POLICY "Admins can update presence"
  ON public.room_presence
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes. The partial index on open rows is what makes the
-- "who is where right now" lookup fast as history grows.
CREATE INDEX presence_user_id_idx ON public.room_presence(user_id);
CREATE INDEX presence_room_idx ON public.room_presence(room);
CREATE INDEX presence_entered_at_idx ON public.room_presence(entered_at DESC);
CREATE INDEX presence_open_idx ON public.room_presence(user_id)
  WHERE exited_at IS NULL;
```

### 3.5 Create Automatic Timestamp Update Function

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for clock_in_records table
CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON public.clock_in_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 👥 Step 4: Create Demo Users

### 4.1 Enable Email Auth
```
Dashboard → Authentication → Providers
Enable: Email
Confirm email: Disable (for testing)
```

### 4.2 Create Admin User

```sql
-- You need to create this via Supabase Auth UI first:
-- Dashboard → Authentication → Users → Add User
-- Email: admin@hyt.com
-- Password: admin123
-- Auto Confirm: Yes

-- Then add to users table (replace UUID with actual auth user ID)
INSERT INTO public.users (id, email, name, role)
VALUES (
  'REPLACE-WITH-AUTH-USER-UUID',
  'admin@hyt.com',
  'Admin User',
  'admin'
);
```

### 4.3 Create Trainer User

```sql
-- Create via Auth UI:
-- Email: trainer@hyt.com
-- Password: trainer123

INSERT INTO public.users (id, email, name, role)
VALUES (
  'REPLACE-WITH-AUTH-USER-UUID',
  'trainer@hyt.com',
  'John Trainer',
  'trainer'
);
```

### 4.4 Create Visitor User

```sql
-- Create via Auth UI:
-- Email: visitor@hyt.com
-- Password: visitor123

INSERT INTO public.users (id, email, name, role)
VALUES (
  'REPLACE-WITH-AUTH-USER-UUID',
  'visitor@hyt.com',
  'Alex Rivera',
  'visitor'
);
```

---

## 🔄 Step 5: Test Database Connection

### 5.1 Run Build
```bash
npm run build
```

### 5.2 Test Locally
```bash
npm run dev
```

### 5.3 Try Login
```
Visit: http://localhost:3000
Login: trainer@hyt.com / trainer123
Should: Redirect to QR scanner
```

---

## 📊 Step 6: Insert Sample Clock-In Records

```sql
-- Sample active check-in
INSERT INTO public.clock_in_records (
  user_id,
  user_name,
  user_role,
  destination,
  building,
  room,
  time_in,
  status
)
VALUES (
  (SELECT id FROM public.users WHERE email = 'visitor@hyt.com'),
  'Alex Rivera',
  'visitor',
  'TESDA Electronics Lab',
  'Building B',
  'Room 304',
  NOW() - INTERVAL '2 hours',
  'active'
);

-- Sample completed check-in
INSERT INTO public.clock_in_records (
  user_id,
  user_name,
  user_role,
  destination,
  building,
  room,
  time_in,
  time_out,
  status,
  duration
)
VALUES (
  (SELECT id FROM public.users WHERE email = 'trainer@hyt.com'),
  'John Trainer',
  'trainer',
  'Barista Training Station',
  'Building A',
  'Room 101',
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '1 hour',
  'completed',
  '4h 0m'
);
```

---

## 🔒 Step 7: Configure Auth Settings

### 7.1 Site URL
```
Dashboard → Authentication → URL Configuration
Site URL: https://your-app.vercel.app (or http://localhost:3000 for dev)
Redirect URLs: https://your-app.vercel.app/**, http://localhost:3000/**
```

### 7.2 Email Templates (Optional)
```
Dashboard → Authentication → Email Templates
Customize: Confirmation, Reset Password, etc.
```

---

## 🚀 Step 8: Deploy to Vercel

### 8.1 Add Environment Variables to Vercel
```
Vercel Dashboard → Your Project → Settings → Environment Variables

Add:
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...xxx
```

### 8.2 Redeploy
```bash
git add .
git commit -m "Add Supabase integration"
git push
```

Or via Vercel CLI:
```bash
vercel --prod
```

---

## 📈 Monitoring & Management

### View Data
```
Dashboard → Table Editor
Select: users or clock_in_records
View/Edit data directly
```

### View Logs
```
Dashboard → Logs
See: Database queries, Auth events
```

### Database Performance
```
Dashboard → Database → Query Performance
Monitor: Slow queries, Index usage
```

---

## 🔧 Advanced Features

### Real-time Subscriptions

```typescript
// Listen to check-in record changes
const subscription = supabase
  .channel('clock-ins')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'clock_in_records'
    },
    (payload) => {
      console.log('Change received!', payload);
      // Update UI in real-time
    }
  )
  .subscribe();
```

### Storage for Avatars

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 🐛 Troubleshooting

### Connection Error
```
Error: Invalid Supabase URL
Solution: Check NEXT_PUBLIC_SUPABASE_URL in .env.local
```

### Auth Error
```
Error: User not found
Solution: Create user via Supabase Auth UI first
```

### RLS Error
```
Error: Permission denied
Solution: Check Row Level Security policies
```

### Build Error
```
Error: Environment variables not found
Solution: Restart dev server after adding .env.local
```

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Row Level Security**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **Realtime**: https://supabase.com/docs/guides/realtime

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] API credentials copied to `.env.local`
- [ ] Users table created
- [ ] Clock-in records table created
- [ ] `room_presence` table created (the `## 3.4` section)
- [ ] RLS policies applied
- [ ] Admin user-management policies applied (the `## User Management` section)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local` (enables create/delete)
- [ ] Demo users created (admin, trainer, visitor)
- [ ] Sample records inserted
- [ ] Login tested locally
- [ ] Environment variables added to Vercel
- [ ] Deployed successfully

---

**Status**: 📝 **SETUP GUIDE COMPLETE**  
**Next**: Update auth store to use Supabase instead of mock data
