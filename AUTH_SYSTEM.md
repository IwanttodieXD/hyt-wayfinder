# HYT Wayfinder - Authentication & Admin System

## Overview

Complete authentication system with role-based access control (RBAC), admin dashboard with live clock-in tracking, and dedicated portals for trainers and visitors.

---

## ✨ Features Implemented

### 🔐 Authentication System
- **Login Page** with email/password authentication
- **Register Page** with role selection (Trainer/Visitor)
- **Persistent Sessions** using Zustand with localStorage
- **Role-Based Redirects** after login (Admin → Dashboard, Trainer/Visitor → QR Scanner)
- **Protected Routes** with automatic redirect to login
- **Demo Credentials** for testing

### 👥 User Roles

#### 1. **Admin**
- Access to Admin Dashboard
- View live clock-in metrics
- Browse all records with search/filter
- Export functionality
- System status monitoring

#### 2. **Trainer**
- Direct access to QR scanner on login
- Can clock in/out for sessions
- Training-specific tracking

#### 3. **Visitor**
- Direct access to QR scanner on login
- Can clock in/out for visits
- Visitor-specific tracking

### 📊 Admin Dashboard Features

**Live Metrics Cards:**
- **Active Clock-Ins** (real-time count with green pulse indicator)
- **Today's Total** visits
- **Total Records** in database
- **System Status** indicator

**Recent Activity Feed:**
- Last 5 clock-in/out events
- User names, destinations, timestamps
- Status indicators (Active/Completed)

**Quick Actions:**
- Navigate to full records table
- Access kiosk station view
- Launch 3D building tour

### 📋 Records Management

**Features:**
- **Search** by name, destination, or room
- **Filter** by status (All/Active/Completed)
- **Sortable Table** with columns:
  - User (name, ID)
  - Role (Trainer/Visitor)
  - Destination (building, room)
  - Time In/Out
  - Duration
  - Status
- **Export to CSV** (button ready for implementation)

### 🎯 Visitor/Trainer Portals

**Auto-Opening QR Scanner:**
- Automatically sets view mode to "mobile"
- Opens QR scanner on page load
- Shows user's name in header
- Quick access to profile menu

---

## 🔑 Demo Credentials

### Admin Account
```
Email: admin@hyt.com
Password: admin123
```

### Trainer Account
```
Email: trainer@hyt.com
Password: trainer123
```

### Visitor Account
```
Email: visitor@hyt.com
Password: visitor123
```

---

## 🚀 Quick Start

### 1. Run the Development Server
```bash
npm run dev
```

### 2. Access Pages

| Page | URL | Access |
|------|-----|--------|
| Home | `http://localhost:3000` | Public |
| Login | `http://localhost:3000/login` | Public |
| Register | `http://localhost:3000/register` | Public |
| Admin Dashboard | `http://localhost:3000/admin` | Admin only |
| Admin Records | `http://localhost:3000/admin/records` | Admin only |
| Trainer Portal | `http://localhost:3000/trainer` | Trainer only |
| Visitor Portal | `http://localhost:3000/visitor` | Visitor only |

### 3. Test Authentication Flow

**Login as Admin:**
1. Go to `/login`
2. Use `admin@hyt.com` / `admin123`
3. Redirects to `/admin` dashboard
4. View live metrics and records

**Login as Trainer:**
1. Go to `/login`
2. Use `trainer@hyt.com` / `trainer123`
3. Redirects to `/trainer` portal
4. QR scanner opens automatically

**Login as Visitor:**
1. Go to `/login`
2. Use `visitor@hyt.com` / `visitor123`
3. Redirects to `/visitor` portal
4. QR scanner opens automatically

**Register New Account:**
1. Go to `/register`
2. Fill in: Name, Email, Password
3. Select role: Trainer or Visitor
4. Click "Create Account"
5. Auto-login and redirect to respective portal

---

## 📁 File Structure

```
hyt-wayfinder/
├── store/
│   ├── authStore.ts           # Authentication state (Zustand + persist)
│   ├── recordsStore.ts        # Clock-in records management
│   └── clockInStore.ts        # (Existing) QR scanner state
├── app/
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── register/
│   │   └── page.tsx           # Registration page
│   ├── admin/
│   │   ├── page.tsx           # Admin dashboard
│   │   └── records/
│   │       └── page.tsx       # Records management table
│   ├── trainer/
│   │   └── page.tsx           # Trainer portal (auto QR scanner)
│   ├── visitor/
│   │   └── page.tsx           # Visitor portal (auto QR scanner)
│   └── page.tsx               # Home (added Login/Register button)
└── components/
    └── UserProfile.tsx        # User dropdown menu component
```

---

## 🛠️ State Management

### Auth Store (`authStore.ts`)

**State:**
```typescript
{
  user: User | null,
  isAuthenticated: boolean
}
```

**Actions:**
- `login(email, password)` - Authenticate user
- `register(data)` - Create new account
- `logout()` - Clear session
- `updateProfile(updates)` - Update user info

**Persistence:**
- Uses Zustand `persist` middleware
- Stored in localStorage as `hyt-auth-storage`
- Survives page refresh

### Records Store (`recordsStore.ts`)

**State:**
```typescript
{
  records: ClockInRecord[]
}
```

**Actions:**
- `addRecord(data)` - Log new clock-in
- `clockOutRecord(id)` - Complete session
- `getActiveCount()` - Count active sessions
- `getTodayCount()` - Count today's total
- `getAllRecords()` - Get all records
- `getRecordsByDate(date)` - Filter by date

**Record Structure:**
```typescript
{
  id: string,
  userId: string,
  userName: string,
  userRole: 'trainer' | 'visitor',
  destination: string,
  building: string,
  room: string,
  timeIn: Date,
  timeOut: Date | null,
  status: 'active' | 'completed',
  duration?: string
}
```

---

## 🔒 Protected Routes

### Implementation

Each protected page checks authentication on mount:

```typescript
useEffect(() => {
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/login');
  }
}, [isAuthenticated, user, router]);
```

**Routes Protected:**
- `/admin` - Admin only
- `/admin/records` - Admin only
- `/trainer` - Trainer only
- `/visitor` - Visitor only

**Public Routes:**
- `/` (Home)
- `/login`
- `/register`
- `/clock-in` (Kiosk view)
- `/tour` (3D building)

---

## 🎨 UI Components

### UserProfile Component

**Features:**
- Avatar with role icon
- User name and role display
- Dropdown menu with:
  - Dashboard link (admin only)
  - Records link (admin only)
  - Home link
  - Clock-In System link
  - Logout button
- Click-outside to close
- Role-based color coding

**Role Icons:**
- Admin: `fa-user-shield` (red theme)
- Trainer: `fa-chalkboard-user` (blue theme)
- Visitor: `fa-id-card` (purple theme)

### Login Page

**Features:**
- Email input with envelope icon
- Password input with lock icon
- Demo credentials info box
- Loading spinner during login
- Error message display
- "Create account" link
- "Back to Home" link

### Register Page

**Features:**
- Full name input
- Email input
- Role selection cards (Trainer/Visitor)
- Password input
- Confirm password input
- Password validation (min 6 chars)
- Password match validation
- Auto-login after registration
- "Sign in" link for existing users

---

## 📈 Admin Dashboard Details

### Live Metrics

**Active Clock-Ins Card:**
- Real-time count from `getActiveCount()`
- Green pulse indicator
- "Live" badge
- Updates automatically when records change

**Today's Total Card:**
- Count of visits today
- Calculated from `getTodayCount()`
- Resets at midnight

**Total Records Card:**
- All-time record count
- Includes active and completed

**System Status Card:**
- Always shows "Online" (can be enhanced)
- Green checkmark icon
- Ready for health checks

### Recent Activity Feed

**Display:**
- Last 5 clock-in records
- User avatar with role icon
- Name and destination
- Status badge (Active/Completed)
- Time-in timestamp
- "View All" link to records page

---

## 🔄 Integration with Clock-In System

### How It Works

1. **User logs in** (trainer or visitor)
2. **Redirects to portal** (`/trainer` or `/visitor`)
3. **QR scanner auto-opens** (StudentMobileView)
4. **User scans QR code**
5. **Clock-in recorded** in recordsStore
6. **Admin sees update** in dashboard metrics

### Adding Records

When a user clocks in via QR scanner:

```typescript
import { useRecordsStore } from '@/store/recordsStore';

const { addRecord } = useRecordsStore();

// On successful clock-in
addRecord({
  userId: user.id,
  userName: user.name,
  userRole: user.role,
  destination: 'TESDA Electronics Lab',
  building: 'Building B',
  room: 'Room 304',
  timeIn: new Date(),
});
```

---

## 🔧 Customization

### Add New User Role

**1. Update authStore.ts:**
```typescript
export type UserRole = 'admin' | 'trainer' | 'visitor' | 'instructor';
```

**2. Add demo user:**
```typescript
mockUsers.push({
  id: 'instructor-001',
  email: 'instructor@hyt.com',
  password: 'instructor123',
  name: 'Sarah Instructor',
  role: 'instructor',
  createdAt: new Date(),
});
```

**3. Create portal page:**
```bash
# Create app/instructor/page.tsx
```

**4. Add role check to login:**
```typescript
if (user?.role === 'instructor') {
  router.push('/instructor');
}
```

### Modify Dashboard Metrics

**Add new metric card:**

```tsx
<div className="glass-panel border-slate-800 p-6 rounded-2xl">
  <div className="flex items-center justify-between mb-4">
    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
      <i className="fa-solid fa-chart-bar text-orange-400 text-xl"></i>
    </div>
  </div>
  <p className="text-slate-400 text-sm mb-1">Your Metric</p>
  <p className="text-white text-3xl font-bold">{yourValue}</p>
</div>
```

### Add Export Functionality

**records/page.tsx - Export button:**

```typescript
const handleExport = () => {
  const csv = [
    ['Name', 'Role', 'Destination', 'Time In', 'Time Out', 'Duration', 'Status'].join(','),
    ...filteredRecords.map(r => [
      r.userName,
      r.userRole,
      r.destination,
      r.timeIn.toISOString(),
      r.timeOut?.toISOString() || '',
      r.duration || '',
      r.status
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clock-in-records-${new Date().toISOString()}.csv`;
  link.click();
};
```

---

## 🧪 Testing Checklist

### Authentication
- [ ] Login with admin credentials
- [ ] Login with trainer credentials
- [ ] Login with visitor credentials
- [ ] Register new trainer account
- [ ] Register new visitor account
- [ ] Logout and verify session cleared
- [ ] Try accessing protected route without login (should redirect)
- [ ] Try accessing admin page as trainer (should redirect)

### Admin Dashboard
- [ ] View live active clock-ins count
- [ ] View today's total count
- [ ] View total records count
- [ ] Check system status shows "Online"
- [ ] View recent activity feed
- [ ] Click "View All Records" link
- [ ] Click "Kiosk View" card
- [ ] Click "3D Building Tour" card
- [ ] Open user profile dropdown
- [ ] Navigate to different pages from dropdown

### Records Management
- [ ] Search by user name
- [ ] Search by destination
- [ ] Search by room
- [ ] Filter by "All" status
- [ ] Filter by "Active" status
- [ ] Filter by "Completed" status
- [ ] View all record details in table
- [ ] Check results summary updates
- [ ] Click "Export CSV" button (ready for implementation)

### Visitor/Trainer Portals
- [ ] Login as visitor
- [ ] Verify QR scanner opens automatically
- [ ] Login as trainer
- [ ] Verify QR scanner opens automatically
- [ ] Simulate QR scan
- [ ] Verify record appears in admin dashboard
- [ ] Clock out
- [ ] Verify status changes to "Completed"

---

## 🚨 Known Limitations

1. **Mock Authentication**
   - Currently using in-memory mock users
   - To persist: Connect to database via API

2. **No Email Verification**
   - Accounts created instantly
   - To add: Send verification email after registration

3. **No Password Reset**
   - Forgot password not implemented
   - To add: Create reset flow with email tokens

4. **No Session Expiry**
   - Sessions persist indefinitely
   - To add: JWT tokens with expiration

5. **Client-Side Only**
   - No backend API yet
   - To secure: Move auth to server-side

---

## 🔐 Security Considerations

**For Production:**

1. **Move Auth to Backend**
   - Use Next.js API routes or separate backend
   - Implement JWT tokens or session cookies
   - Never store passwords in frontend

2. **Hash Passwords**
   - Use bcrypt or argon2
   - Current plain text is for demo only

3. **HTTPS Only**
   - Enforce secure connections
   - Set secure cookie flags

4. **Rate Limiting**
   - Limit login attempts
   - Prevent brute force attacks

5. **CSRF Protection**
   - Use CSRF tokens
   - Validate request origins

6. **Input Validation**
   - Sanitize all inputs
   - Validate on server-side

---

## 📚 Next Steps

**Immediate:**
1. Test all authentication flows
2. Verify role-based redirects
3. Check protected routes work correctly
4. Test QR scanner integration with records

**Future Enhancements:**
1. Connect to actual database (Prisma + PostgreSQL)
2. Build API routes for auth and records
3. Add real-time updates with WebSockets
4. Implement email notifications
5. Add password reset flow
6. Create user settings page
7. Add user profile editing
8. Implement CSV export
9. Add date range filters
10. Create analytics charts

---

**Status**: ✅ **COMPLETE & READY TO TEST**  
**Version**: 1.0  
**Last Updated**: 2026-09-22
