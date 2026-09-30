# Quick Start Guide - HYT Wayfinder

## 🚀 Setup Steps

### 1. Fix API Key Issue (401 Error)

Your `.env.local` currently has an invalid API key. Get the correct one:

1. Go to: https://supabase.com/dashboard
2. Select project: `qdakobfrrkntpzuvmxqv`
3. Go to **Settings** → **API**
4. Copy the **anon/public** key
5. Replace in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qdakobfrrkntpzuvmxqv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste_your_actual_key_here>
```

### 2. Set Up Database

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy all SQL from `SUPABASE_DATABASE_SETUP.md`
3. Run **Step 1** (Create Tables)
4. Run **Step 2** (Enable RLS)
5. Run **Step 3** (Auto-update triggers)

### 3. Create Demo Users

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add User** → **Create new user**
3. Create these accounts:
   - `admin@hyt.com` / `admin123`
   - `trainer@hyt.com` / `trainer123`
   - `visitor@hyt.com` / `visitor123`
4. After creating, run **Step 4** SQL to add their profiles

### 4. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## ✅ Testing

1. Go to http://localhost:3000
2. You'll be redirected to login
3. Try logging in with: `admin@hyt.com` / `admin123`
4. Should redirect to admin dashboard

## 🐛 Troubleshooting

### Still getting 401 errors?
- Make sure you copied the COMPLETE key (it's very long)
- Restart your dev server after changing .env.local
- Clear browser cache or use incognito mode

### Tables not working?
- Make sure you ran ALL the SQL commands in order
- Check the **Table Editor** in Supabase to verify tables exist

### Can't login?
- Make sure you created users in **Authentication** → **Users**
- Make sure you ran Step 4 SQL to create user profiles

## 📚 Schema Overview

**users** - User profiles linked to auth
**clock_in_records** - QR check-in/out records
**schedules** - Pre-scheduled visits (future feature)

## 🎯 Demo Flow

1. **Login** as admin
2. See **Dashboard** with metrics
3. Click **QR Scanner** 
4. Simulate scan
5. Watch **3D Route Animation**
6. Clock out
7. Check **Records** page

---

Need help? Check `SUPABASE_DATABASE_SETUP.md` for detailed setup.
