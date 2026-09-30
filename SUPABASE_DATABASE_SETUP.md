# Supabase Database Setup

## Complete Schema for HYT Wayfinder

Copy and paste these SQL commands into your Supabase SQL Editor in order:

### Step 1: Create Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'visitor'::text CHECK (role = ANY (ARRAY['admin'::text, 'trainer'::text, 'visitor'::text])),
  avatar text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  destination text NOT NULL,
  building text NOT NULL,
  room text NOT NULL,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  status text DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create clock_in_records table
CREATE TABLE IF NOT EXISTS public.clock_in_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  destination text NOT NULL,
  building text NOT NULL,
  room text NOT NULL,
  time_in timestamp with time zone NOT NULL DEFAULT now(),
  time_out timestamp with time zone,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text])),
  duration text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  schedule_id uuid,
  CONSTRAINT clock_in_records_pkey PRIMARY KEY (id),
  CONSTRAINT clock_in_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT clock_in_records_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);
CREATE INDEX IF NOT EXISTS idx_clock_in_records_user_id ON public.clock_in_records(user_id);
CREATE INDEX IF NOT EXISTS idx_clock_in_records_status ON public.clock_in_records(status);
CREATE INDEX IF NOT EXISTS idx_clock_in_records_time_in ON public.clock_in_records(time_in);
```

### Step 2: Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_in_records ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow user creation during signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Schedules policies
CREATE POLICY "Users can view their own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all schedules"
  ON public.schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update schedules"
  ON public.schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clock-in records policies
CREATE POLICY "Users can view their own records"
  ON public.clock_in_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all records"
  ON public.clock_in_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create their own records"
  ON public.clock_in_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON public.clock_in_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all records"
  ON public.clock_in_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Step 3: Create Function to Auto-Update updated_at

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clock_in_records_updated_at
  BEFORE UPDATE ON public.clock_in_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### Step 4: Create Demo Users (Optional)

```sql
-- Note: You need to create these users in Supabase Auth UI first
-- Then run this to add their profiles

-- After creating admin@hyt.com in Auth UI:
INSERT INTO public.users (id, email, name, role, avatar)
VALUES 
  ((SELECT id FROM auth.users WHERE email = 'admin@hyt.com'), 'admin@hyt.com', 'Admin User', 'admin', '👨‍💼')
ON CONFLICT (id) DO NOTHING;

-- After creating trainer@hyt.com in Auth UI:
INSERT INTO public.users (id, email, name, role, avatar)
VALUES 
  ((SELECT id FROM auth.users WHERE email = 'trainer@hyt.com'), 'trainer@hyt.com', 'John Trainer', 'trainer', '👨‍🏫')
ON CONFLICT (id) DO NOTHING;

-- After creating visitor@hyt.com in Auth UI:
INSERT INTO public.users (id, email, name, role, avatar)
VALUES 
  ((SELECT id FROM auth.users WHERE email = 'visitor@hyt.com'), 'visitor@hyt.com', 'Jane Visitor', 'visitor', '👩‍🎓')
ON CONFLICT (id) DO NOTHING;
```

## How to Create Demo Users

1. Go to **Authentication > Users** in Supabase Dashboard
2. Click **Add User** → **Create new user**
3. Create these users:
   - Email: `admin@hyt.com`, Password: `admin123`
   - Email: `trainer@hyt.com`, Password: `trainer123`
   - Email: `visitor@hyt.com`, Password: `visitor123`
4. After creating users in Auth UI, run Step 4 SQL above

## Verify Setup

Run this query to check your tables:

```sql
SELECT * FROM public.users;
SELECT * FROM public.schedules;
SELECT * FROM public.clock_in_records;
```

## Important Notes

- The `users.id` is linked to `auth.users.id` (Supabase's built-in authentication)
- Row Level Security (RLS) is enabled for security
- Admins can see all data; regular users see only their own data
- `updated_at` timestamps update automatically
- Foreign keys have CASCADE deletes for data integrity
