# Database Schema Summary

## ✅ Your Current Schema (Updated)

Based on your Supabase export, your database has been properly configured:

### Tables

#### 1. **users** (Profile data)
```sql
public.users
  ├─ id: uuid (PK, FK → auth.users.id)
  ├─ email: text (UNIQUE, NOT NULL)
  ├─ name: text (NOT NULL)
  ├─ role: text (DEFAULT 'visitor', CHECK: admin|trainer|visitor)
  ├─ avatar: text (nullable)
  ├─ created_at: timestamptz (DEFAULT now())
  └─ updated_at: timestamptz (DEFAULT now(), auto-updates)
```

**Purpose:** Stores user profile information
**Links to:** `auth.users` (Supabase's authentication table)
**Used for:** User details, role-based access control

#### 2. **clock_in_records** (Check-in/out tracking)
```sql
public.clock_in_records
  ├─ id: uuid (PK, DEFAULT gen_random_uuid())
  ├─ user_id: uuid (FK → users.id, NOT NULL)
  ├─ destination: text (NOT NULL)
  ├─ building: text (NOT NULL)
  ├─ room: text (NOT NULL)
  ├─ time_in: timestamptz (DEFAULT now(), NOT NULL)
  ├─ time_out: timestamptz (nullable)
  ├─ status: text (DEFAULT 'active', CHECK: active|completed)
  ├─ duration: text (nullable, calculated)
  ├─ created_at: timestamptz (DEFAULT now())
  ├─ updated_at: timestamptz (DEFAULT now(), auto-updates)
  └─ schedule_id: uuid (FK → schedules.id, nullable)
```

**Purpose:** Tracks when users clock in/out at locations
**Links to:** `users` (who), `schedules` (optional pre-scheduled visit)
**Used for:** QR code scanning, attendance tracking, admin dashboard

#### 3. **schedules** (Pre-scheduled visits)
```sql
public.schedules
  ├─ id: uuid (PK, DEFAULT gen_random_uuid())
  ├─ user_id: uuid (FK → users.id, NOT NULL)
  ├─ destination: text (NOT NULL)
  ├─ building: text (NOT NULL)
  ├─ room: text (NOT NULL)
  ├─ scheduled_start: timestamptz (NOT NULL)
  ├─ scheduled_end: timestamptz (NOT NULL)
  ├─ status: text (DEFAULT 'scheduled', CHECK: scheduled|in_progress|completed|cancelled)
  ├─ notes: text (nullable)
  ├─ created_at: timestamptz (DEFAULT now())
  └─ updated_at: timestamptz (DEFAULT now(), auto-updates)
```

**Purpose:** Pre-schedule future visits
**Links to:** `users` (who is scheduled)
**Used for:** Future feature - advanced scheduling

## Relationships

```
auth.users (Supabase Auth)
    ↓ (1:1)
public.users (Your profiles)
    ↓ (1:many)
    ├─ clock_in_records (attendance)
    └─ schedules (pre-scheduled visits)
         ↓ (1:many)
    clock_in_records (can link to schedule)
```

## Key Features

### 🔐 Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can read/update their own data
- Admins can read all data
- Foreign keys enforce data integrity

### ⚡ Auto-Updates
`updated_at` timestamps automatically update on row changes via triggers

### 🗑️ Cascade Deletes
- Delete auth user → Profile deleted
- Delete user → Records deleted
- Delete schedule → Record's schedule_id set to NULL

## TypeScript Types

Types are defined in `lib/supabase.ts`:

```typescript
Database.public.Tables.users.Row
Database.public.Tables.clock_in_records.Row
Database.public.Tables.schedules.Row
```

## App Integration

### Registration Flow
1. User registers → Creates `auth.users` entry
2. Profile created → Creates `public.users` entry (linked by ID)
3. Both succeed → User logged in

### Clock-In Flow
1. User scans QR → Creates `clock_in_records` entry
2. Status: 'active', time_in: now
3. Later clock out → Updates record (time_out, status, duration)

### Admin Dashboard
1. Fetches all `clock_in_records`
2. Joins with `users` to show names
3. Real-time counts (active, today's total)

## Migration Notes

**What changed from original schema:**
- ❌ Removed `user_name` from clock_in_records
- ❌ Removed `user_role` from clock_in_records
- ✅ Added `schedule_id` to clock_in_records
- ✅ Added entire `schedules` table
- ✅ Proper foreign key constraints
- ✅ RLS policies for security

**Why:** 
- No data duplication (name/role stored in users table only)
- Normalization (join users table when needed)
- Future-ready (schedules table for advanced features)

## Setup Status

✅ Schema defined in `SUPABASE_DATABASE_SETUP.md`
✅ TypeScript types in `lib/supabase.ts`
✅ Auth integration in `store/authStore.ts`
✅ Records integration in `store/recordsStore.ts`
✅ Build successful

⚠️ **Still needed:**
- Run SQL setup in your Supabase project
- Fix API key in `.env.local`
- Create demo users

---

See `QUICK_START.md` for setup instructions.
