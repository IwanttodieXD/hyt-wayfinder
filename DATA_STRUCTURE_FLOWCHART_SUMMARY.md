# HYT Wayfinder - Data Structure & Flowchart Summary

## 📊 OVERVIEW
This document provides a comprehensive view of the system's data architecture, database schema, and process flowcharts for the HYT Wayfinder 3D Interactive Visitor Management System.

---

## 🗄️ DATABASE STRUCTURE

### **Database Tables**

#### **1. auth.users** (Supabase Auth - System Managed)
```sql
Table: auth.users
├─ id              : UUID (Primary Key)
├─ email           : TEXT (Unique)
├─ encrypted_password : TEXT
├─ email_confirmed_at : TIMESTAMPTZ
├─ created_at      : TIMESTAMPTZ
└─ updated_at      : TIMESTAMPTZ
```
**Purpose:** Handles authentication, managed by Supabase Auth service

---

#### **2. public.users** (User Profiles)
```sql
Table: public.users
├─ id              : UUID (Primary Key, Foreign Key → auth.users.id)
├─ email           : TEXT (Unique, Not Null)
├─ name            : TEXT (Not Null)
├─ role            : TEXT (CHECK: 'admin' | 'trainer' | 'visitor')
├─ avatar          : TEXT (Optional)
├─ created_at      : TIMESTAMPTZ (Default: NOW())
└─ updated_at      : TIMESTAMPTZ (Auto-updated via trigger)
```
**Purpose:** Stores user profile information and role-based permissions

**Relationships:**
- **1:1** with `auth.users` (CASCADE on delete)
- **1:many** with `clock_in_records`
- **1:many** with `schedules`

---

#### **3. public.clock_in_records** (Attendance Records)
```sql
Table: public.clock_in_records
├─ id              : UUID (Primary Key)
├─ user_id         : UUID (Foreign Key → users.id)
├─ destination     : TEXT (e.g., "TESDA Electronics Lab")
├─ building        : TEXT (e.g., "Main Building")
├─ room            : TEXT (e.g., "Room 304")
├─ time_in         : TIMESTAMPTZ (Not Null)
├─ time_out        : TIMESTAMPTZ (Nullable)
├─ status          : TEXT (CHECK: 'active' | 'completed')
├─ duration        : TEXT (Nullable, calculated on clock-out)
├─ schedule_id     : UUID (Foreign Key → schedules.id, Optional)
├─ created_at      : TIMESTAMPTZ (Default: NOW())
└─ updated_at      : TIMESTAMPTZ (Auto-updated via trigger)
```
**Purpose:** Tracks all visitor clock-in/clock-out events

**Relationships:**
- **many:1** with `users` (CASCADE on delete)
- **1:1** with `schedules` (Optional link)

---

#### **4. public.schedules** (Pre-scheduled Visits)
```sql
Table: public.schedules
├─ id              : UUID (Primary Key)
├─ user_id         : UUID (Foreign Key → users.id)
├─ destination     : TEXT
├─ building        : TEXT
├─ room            : TEXT
├─ scheduled_start : TIMESTAMPTZ (Not Null)
├─ scheduled_end   : TIMESTAMPTZ (Not Null)
├─ status          : TEXT (CHECK: 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
├─ notes           : TEXT (Optional)
├─ created_at      : TIMESTAMPTZ (Default: NOW())
└─ updated_at      : TIMESTAMPTZ (Auto-updated via trigger)
```
**Purpose:** Manages pre-scheduled appointments and visits

**Relationships:**
- **many:1** with `users` (CASCADE on delete)
- **1:1** with `clock_in_records` (Optional link when schedule is used)

---

## 🔗 ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌─────────────────────────────────────────┐
│         auth.users                      │
│      (Supabase Auth)                    │
│  ┌───────────────────────────────────┐  │
│  │ • id (PK)                         │  │
│  │   email                           │  │
│  │   encrypted_password              │  │
│  │   email_confirmed_at              │  │
│  │   created_at                      │  │
│  │   updated_at                      │  │
│  └───────────────────────────────────┘  │
└──────────────────┬──────────────────────┘
                   │
                   │ RELATIONSHIP: 1:1 (CASCADE)
                   │ CONSTRAINT: FK ON DELETE CASCADE
                   ↓
┌─────────────────────────────────────────┐
│         public.users                    │
│       (User Profiles)                   │
│  ┌───────────────────────────────────┐  │
│  │ • id (PK, FK → auth.users.id)    │◄─┼──────┐
│  │   email (UNIQUE)                  │  │      │
│  │   name                            │  │      │
│  │   role (admin|trainer|visitor)    │  │      │
│  │   avatar                          │  │      │
│  │   created_at                      │  │      │
│  │   updated_at                      │  │      │
│  └───────────────────────────────────┘  │      │
└──────────────────┬──────────────────────┘      │
                   │                              │
                   │ RELATIONSHIP: 1:many         │
                   │                              │
         ┌─────────┴─────────┐                   │
         ↓                   ↓                    │
┌──────────────────┐  ┌──────────────────────┐  │
│   schedules      │  │  clock_in_records    │  │
│ ┌──────────────┐ │  │ ┌──────────────────┐ │  │
│ │ • id (PK)    │ │  │ │ • id (PK)        │ │  │
│ │   user_id ───┼─┼──┘ │   user_id ───────┼─┼──┘
│ │   (FK)       │ │    │   (FK)           │ │
│ │              │ │    │   destination    │ │
│ │ destination  │ │    │   building       │ │
│ │ building     │ │    │   room           │ │
│ │ room         │ │    │   time_in        │ │
│ │ scheduled_   │ │    │   time_out       │ │
│ │   start      │ │    │   status         │ │
│ │ scheduled_   │ │    │   duration       │ │
│ │   end        │ │    │   schedule_id ───┼─┼──┐
│ │ status       │ │    │   (FK, Optional) │ │  │
│ │ notes        │ │    │   created_at     │ │  │
│ │ created_at   │ │    │   updated_at     │ │  │
│ │ updated_at   │ │    └──────────────────┘ │  │
│ └──────────────┘ │    └────────────────────┘  │
└──────────────────┘                             │
         ↑                                        │
         └────────────────────────────────────────┘
              RELATIONSHIP: 1:1 (Optional)
         CONSTRAINT: FK ON DELETE SET NULL
```

### **Key Relationships:**
1. **auth.users → public.users** (1:1, CASCADE)
2. **public.users → clock_in_records** (1:many, CASCADE)
3. **public.users → schedules** (1:many, CASCADE)
4. **schedules → clock_in_records** (1:1 optional, SET NULL)

---

## 🔐 ROW LEVEL SECURITY (RLS) POLICIES

### **public.users**
```sql
Policy: users_select_own
- Users can SELECT their own profile
- Admins can SELECT all profiles

Policy: users_update_own
- Users can UPDATE their own profile only
```

### **public.clock_in_records**
```sql
Policy: records_select_own
- Users can SELECT their own records
- Admins can SELECT all records

Policy: records_insert_own
- Users can INSERT their own records

Policy: records_update_own
- Users can UPDATE their own records
- Admins can UPDATE all records
```

### **public.schedules**
```sql
Policy: schedules_select_own
- Users can SELECT their own schedules
- Admins can SELECT all schedules

Policy: schedules_insert_own
- Users can INSERT their own schedules

Policy: schedules_update_own
- Users can UPDATE their own schedules
- Admins can UPDATE all schedules
```

---

## 📈 SYSTEM FLOWCHARTS

### **1. USER REGISTRATION FLOWCHART**

```
START
  ↓
User visits /register page
  ↓
Fill registration form
├─ Name
├─ Email
├─ Password
└─ Role (Admin/Trainer/Visitor)
  ↓
Submit form
  ↓
┌─────────────────────┐
│ Validation Check    │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Valid?    │
    └─────┬─────┘
          │
    NO ←──┤
    │     │
    │     ↓ YES
    │   Create auth.users record
    │   (Supabase Auth)
    │     ↓
    │   ┌─────────────────────┐
    │   │ Auth Success?       │
    │   └─────────┬───────────┘
    │             │
    │       NO ←──┤
    │       │     │
    │       │     ↓ YES
    │       │   Create public.users profile
    │       │   (user_id = auth.users.id)
    │       │     ↓
    │       │   ┌─────────────────────┐
    │       │   │ Profile Success?    │
    │       │   └─────────┬───────────┘
    │       │             │
    │       │       NO ←──┤
    │       │       │     │
    │       │       │     ↓ YES
    │       │       │   Auto-login user
    │       │       │     ↓
    │       │       │   Update Zustand state
    │       │       │     ↓
    │       │       │   ┌─────────────────┐
    │       │       │   │ Check user role │
    │       │       │   └────────┬────────┘
    │       │       │            │
    │       │       │      ┌─────┴─────┬─────────┐
    │       │       │      │           │         │
    │       │       │    ADMIN     TRAINER   VISITOR
    │       │       │      │           │         │
    │       │       │      ↓           ↓         ↓
    │       │       │  /admin    /clock-in  /clock-in
    │       │       │      │           │         │
    │       │       │      └───────────┴─────────┘
    │       │       │                  ↓
    │       │       │              Dashboard
    │       │       │                  ↓
    │       │       │                 END
    │       │       │
    │       │       ↓
    │       │   Delete auth.users
    │       │   (Cleanup on failure)
    │       │       ↓
    │       └───→ Show error:
    │               "Profile creation failed"
    │                   ↓
    │                  END
    │
    └───────────→ Show error:
                  "Registration failed"
                  (Rate limit / Validation)
                      ↓
                     END
```

---

### **2. LOGIN FLOWCHART**

```
START
  ↓
User visits / (home)
  ↓
┌─────────────────────┐
│ Check if logged in  │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Logged in?│
    └─────┬─────┘
          │
    NO ←──┤
    │     │
    │     ↓ YES
    │   ┌─────────────────┐
    │   │ Check role      │
    │   └────────┬────────┘
    │            │
    │      ┌─────┴─────┬─────────┐
    │      │           │         │
    │    ADMIN     TRAINER   VISITOR
    │      │           │         │
    │      ↓           ↓         ↓
    │  /admin    /clock-in  /clock-in
    │      │           │         │
    │      └───────────┴─────────┘
    │                  ↓
    │                 END
    │
    ↓
Redirect to /login
  ↓
Show login form
  ↓
User enters email & password
  ↓
Click "Sign In"
  ↓
Call Supabase Auth
supabase.auth.signInWithPassword()
  ↓
┌─────────────────────┐
│ Authentication      │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Valid?    │
    └─────┬─────┘
          │
    NO ←──┤
    │     │
    │     ↓ YES
    │   Fetch user profile
    │   FROM public.users
    │   WHERE id = auth.user.id
    │     ↓
    │   ┌─────────────────────┐
    │   │ Profile found?      │
    │   └─────────┬───────────┘
    │             │
    │       NO ←──┤
    │       │     │
    │       │     ↓ YES
    │       │   Update authStore
    │       │   (Zustand state)
    │       │     ↓
    │       │   ┌─────────────────┐
    │       │   │ Check role      │
    │       │   └────────┬────────┘
    │       │            │
    │       │      ┌─────┴─────┬─────────┐
    │       │      │           │         │
    │       │    ADMIN     TRAINER   VISITOR
    │       │      │           │         │
    │       │      ↓           ↓         ↓
    │       │  /admin    /clock-in  /clock-in
    │       │      │           │         │
    │       │      └───────────┴─────────┘
    │       │                  ↓
    │       │                 END
    │       │
    │       ↓
    │   Show error:
    │   "Profile not found"
    │       ↓
    │      END
    │
    ↓
Show error:
"Invalid credentials"
  ↓
Stay on /login
  ↓
END
```

---

### **3. CLOCK-IN PROCESS FLOWCHART**

```
START
  ↓
User navigates to /clock-in
  ↓
┌─────────────────────┐
│ Authentication Check│
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Logged in?│
    └─────┬─────┘
          │
    NO ←──┤
    │     │
    │     ↓ YES
    │   Load QR Scanner UI
    │     ↓
    │   Display scanner with:
    │   ├─ Laser animation
    │   ├─ Viewfinder frame
    │   └─ "Simulate Scan" button
    │     ↓
    │   User clicks "Simulate Scan"
    │     ↓
    │   Prepare record data:
    │   ├─ user_id (from authStore)
    │   ├─ destination: "TESDA Electronics Lab"
    │   ├─ building: "Main Building"
    │   ├─ room: "Room 304"
    │   ├─ time_in: NOW()
    │   ├─ status: "active"
    │   └─ schedule_id: null (optional)
    │     ↓
    │   INSERT INTO clock_in_records
    │   (Supabase API call)
    │     ↓
    │   ┌─────────────────────┐
    │   │ Insert success?     │
    │   └─────────┬───────────┘
    │             │
    │       NO ←──┤
    │       │     │
    │       │     ↓ YES
    │       │   Update clockInStore:
    │       │   ├─ Set status: "viewing-route"
    │       │   ├─ Store clockInTime
    │       │   └─ Set currentWaypoint: 0
    │       │     ↓
    │       │   Display 3D Route Visualization
    │       │     ↓
    │       │   Initialize Three.js scene:
    │       │   ├─ Load building model
    │       │   ├─ Create 6 waypoints
    │       │   ├─ Spawn walking avatar
    │       │   └─ Setup camera (follow mode)
    │       │     ↓
    │       │   User clicks "Play"
    │       │     ↓
    │       │   ┌─────────────────────┐
    │       │   │ Animation Loop      │
    │       │   │ (for each waypoint) │
    │       │   └─────────┬───────────┘
    │       │             │
    │       │             ↓
    │       │   Waypoint 1: Main Lobby
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   └─ Wait 2 seconds
    │       │             ↓
    │       │   Waypoint 2: Hallway A
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   └─ Wait 2 seconds
    │       │             ↓
    │       │   Waypoint 3: Elevator 3F
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   └─ Wait 2 seconds
    │       │             ↓
    │       │   Waypoint 4: 3rd Floor Landing
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   └─ Wait 2 seconds
    │       │             ↓
    │       │   Waypoint 5: Corridor B
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   └─ Wait 2 seconds
    │       │             ↓
    │       │   Waypoint 6: Room 304 (Destination)
    │       │   ├─ Move avatar
    │       │   ├─ Camera follows
    │       │   ├─ Show golden marker
    │       │   └─ Stop animation
    │       │             ↓
    │       │   Show "Clock Out" button
    │       │             ↓
    │       │   Wait for user action
    │       │             ↓
    │       │   User clicks "Clock Out"
    │       │             ↓
    │       │   Calculate duration:
    │       │   duration = time_out - time_in
    │       │             ↓
    │       │   UPDATE clock_in_records
    │       │   SET:
    │       │   ├─ time_out = NOW()
    │       │   ├─ status = "completed"
    │       │   └─ duration = calculated_value
    │       │   WHERE id = current_record_id
    │       │             ↓
    │       │   ┌─────────────────────┐
    │       │   │ Update success?     │
    │       │   └─────────┬───────────┘
    │       │             │
    │       │       NO ←──┤
    │       │       │     │
    │       │       │     ↓ YES
    │       │       │   Show success message:
    │       │       │   "Successfully clocked out"
    │       │       │     ↓
    │       │       │   Update clockInStore:
    │       │       │   ├─ Clear clockInTime
    │       │       │   ├─ Reset status
    │       │       │   └─ Reset waypoint
    │       │       │     ↓
    │       │       │   Redirect to /
    │       │       │   (home page)
    │       │       │     ↓
    │       │       │    END
    │       │       │
    │       │       ↓
    │       │   Show error:
    │       │   "Failed to clock out"
    │       │       ↓
    │       │   Stay on route page
    │       │       ↓
    │       │      END
    │       │
    │       ↓
    │   Show error:
    │   "Failed to create record"
    │       ↓
    │   Stay on scanner
    │       ↓
    │      END
    │
    ↓
Redirect to /login
  ↓
END
```

---

### **4. ADMIN DASHBOARD DATA FLOW**

```
START
  ↓
Admin visits /admin
  ↓
┌─────────────────────┐
│ Authorization Check │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Is Admin? │
    └─────┬─────┘
          │
    NO ←──┤
    │     │
    │     ↓ YES
    │   Initialize recordsStore
    │     ↓
    │   Fetch today's records:
    │   SELECT 
    │     clock_in_records.*,
    │     users.name as userName
    │   FROM clock_in_records
    │   LEFT JOIN users 
    │     ON clock_in_records.user_id = users.id
    │   WHERE 
    │     time_in >= CURRENT_DATE
    │   ORDER BY time_in DESC
    │     ↓
    │   ┌─────────────────────┐
    │   │ Query success?      │
    │   └─────────┬───────────┘
    │             │
    │       NO ←──┤
    │       │     │
    │       │     ↓ YES
    │       │   Store records in state
    │       │     ↓
    │       │   Calculate metrics:
    │       │     ↓
    │       │   ┌─────────────────────────┐
    │       │   │ Active Clock-Ins Count  │
    │       │   │ COUNT WHERE             │
    │       │   │ status = 'active'       │
    │       │   └────────┬────────────────┘
    │       │            │
    │       │            ↓
    │       │   ┌─────────────────────────┐
    │       │   │ Today's Total Count     │
    │       │   │ COUNT all records       │
    │       │   │ from today              │
    │       │   └────────┬────────────────┘
    │       │            │
    │       │            ↓
    │       │   ┌─────────────────────────┐
    │       │   │ Total Records Count     │
    │       │   │ COUNT all time          │
    │       │   └────────┬────────────────┘
    │       │            │
    │       │            ↓
    │       │   Render Dashboard UI:
    │       │   ├─ Metrics Cards
    │       │   │  ├─ Active: {activeCount}
    │       │   │  ├─ Today: {todayCount}
    │       │   │  └─ Total: {totalCount}
    │       │   │
    │       │   ├─ Recent Activity List
    │       │   │  ├─ User name
    │       │   │  ├─ Destination
    │       │   │  ├─ Time in
    │       │   │  └─ Status badge
    │       │   │
    │       │   └─ Quick Action Cards
    │       │      ├─ "View All Records"
    │       │      ├─ "Scan QR Code"
    │       │      └─ "View 3D Tour"
    │       │            ↓
    │       │   Wait for user interaction
    │       │            ↓
    │       │   ┌─────────────────┐
    │       │   │ User Action?    │
    │       │   └────────┬────────┘
    │       │            │
    │       │      ┌─────┼─────┬─────────┐
    │       │      │     │     │         │
    │       │  "Records" │ "QR"    "Tour"
    │       │      │     │     │         │
    │       │      ↓     ↓     ↓         ↓
    │       │  /admin  /clock- /tour    END
    │       │  /records  -in
    │       │      │     │     │
    │       │      └─────┴─────┘
    │       │            ↓
    │       │           END
    │       │
    │       ↓
    │   Show error:
    │   "Failed to load records"
    │       ↓
    │   Show empty state
    │       ↓
    │      END
    │
    ↓
Redirect to /login
Show "Access Denied"
  ↓
END
```

---

## 🔄 DATA SYNCHRONIZATION PATTERN

### **CRUD Operations Flow**

```
┌────────────────────────────────────────────┐
│          USER ACTION INITIATED              │
└──────────────────┬─────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ↓                   ↓
    CREATE/UPDATE        READ/DELETE
         │                   │
         ↓                   ↓
┌─────────────────┐  ┌─────────────────┐
│ OPTIMISTIC      │  │ DIRECT STATE    │
│ UPDATE          │  │ CHECK           │
│ (Local first)   │  │ (Check cache)   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ↓                    ↓
┌─────────────────────────────────────┐
│      SUPABASE API CALL              │
│  supabase.from(table).operation()   │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    SUCCESS       FAILURE
         │           │
         ↓           ↓
┌─────────────┐  ┌──────────────┐
│ UPDATE UI   │  │ ROLLBACK     │
│ & CACHE     │  │ LOCAL STATE  │
└──────┬──────┘  └──────┬───────┘
       │                │
       ↓                ↓
   COMPLETE        SHOW ERROR
       │                │
       └────────┬───────┘
                ↓
               END
```

---

## 📊 STATE MANAGEMENT ARCHITECTURE

### **Zustand Stores Structure**

```
APPLICATION STATE (Zustand)
│
├─ authStore
│  ├─ user: { id, email, name, role, avatar }
│  ├─ isAuthenticated: boolean
│  ├─ isLoading: boolean
│  └─ Actions:
│     ├─ signUp(email, password, name, role)
│     ├─ signIn(email, password)
│     ├─ signOut()
│     └─ checkAuth()
│
├─ clockInStore
│  ├─ viewMode: 'mobile' | 'kiosk'
│  ├─ student: { id, name, destination, building, room }
│  ├─ clockInTime: Date | null
│  ├─ status: 'not-clocked-in' | 'clocked-in' | 'viewing-route'
│  ├─ activeStudents: number
│  ├─ dailyVisits: number
│  ├─ isRouteAnimating: boolean
│  ├─ currentWaypoint: number (0-5)
│  └─ Actions:
│     ├─ setViewMode(mode)
│     ├─ clockIn()
│     ├─ clockOut()
│     ├─ startRouteView()
│     ├─ setRouteAnimating(bool)
│     ├─ setCurrentWaypoint(index)
│     └─ resetRoute()
│
└─ recordsStore
   ├─ records: ClockInRecord[]
   ├─ isLoading: boolean
   ├─ error: string | null
   └─ Actions:
      ├─ fetchRecords()
      ├─ fetchTodayRecords()
      ├─ addRecord(data)
      ├─ updateRecord(id, data)
      └─ deleteRecord(id)
```

---

## 🎯 API ENDPOINTS (Supabase Auto-generated)

### **Authentication**
```
POST   /auth/v1/signup
POST   /auth/v1/token?grant_type=password
POST   /auth/v1/logout
GET    /auth/v1/user
```

### **Database Operations (PostgREST)**
```
GET    /rest/v1/users?id=eq.{id}
POST   /rest/v1/users
PATCH  /rest/v1/users?id=eq.{id}
DELETE /rest/v1/users?id=eq.{id}

GET    /rest/v1/clock_in_records?user_id=eq.{id}
GET    /rest/v1/clock_in_records?select=*,users(name)
POST   /rest/v1/clock_in_records
PATCH  /rest/v1/clock_in_records?id=eq.{id}
DELETE /rest/v1/clock_in_records?id=eq.{id}

GET    /rest/v1/schedules?user_id=eq.{id}
POST   /rest/v1/schedules
PATCH  /rest/v1/schedules?id=eq.{id}
DELETE /rest/v1/schedules?id=eq.{id}
```

---

## 🔍 KEY DATABASE QUERIES

### **Fetch Records with User Names (JOIN)**
```typescript
const { data, error } = await supabase
  .from('clock_in_records')
  .select(`
    *,
    users:user_id (
      name
    )
  `)
  .order('time_in', { ascending: false });

// Result structure:
// {
//   id: "uuid",
//   user_id: "uuid",
//   destination: "TESDA Electronics Lab",
//   time_in: "2024-01-15T08:30:00Z",
//   time_out: "2024-01-15T10:15:00Z",
//   status: "completed",
//   duration: "1 hour 45 minutes",
//   users: {
//     name: "John Doe"
//   }
// }
```

### **Fetch Today's Records**
```typescript
const today = new Date().toISOString().split('T')[0];

const { data, error } = await supabase
  .from('clock_in_records')
  .select(`
    *,
    users:user_id (name)
  `)
  .gte('time_in', `${today}T00:00:00`)
  .order('time_in', { ascending: false });
```

### **Get Active Clock-Ins**
```typescript
const { data, error } = await supabase
  .from('clock_in_records')
  .select('*')
  .eq('status', 'active');

const activeCount = data?.length || 0;
```

### **Clock-Out Update**
```typescript
const duration = calculateDuration(timeIn, timeOut);

const { data, error } = await supabase
  .from('clock_in_records')
  .update({
    time_out: new Date().toISOString(),
    status: 'completed',
    duration: duration
  })
  .eq('id', recordId);
```

---

## 📋 SUMMARY

### **Database Tables:** 4
- `auth.users` (Supabase managed)
- `public.users` (User profiles)
- `public.clock_in_records` (Attendance)
- `public.schedules` (Pre-scheduled visits)

### **Relationships:** 4
- auth.users ↔ public.users (1:1)
- public.users ↔ clock_in_records (1:many)
- public.users ↔ schedules (1:many)
- schedules ↔ clock_in_records (1:1 optional)

### **Security Policies:** 9 RLS policies
- User data isolation
- Admin full access
- Role-based permissions

### **Key Flows:** 4
- Registration flow (7 steps)
- Login flow (6 steps)
- Clock-in flow (12 steps)
- Admin dashboard flow (8 steps)

### **State Stores:** 3
- authStore (Authentication)
- clockInStore (QR & 3D Route)
- recordsStore (Database records)

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Production Ready ✅
