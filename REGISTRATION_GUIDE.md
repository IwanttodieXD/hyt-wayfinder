# Registration System Guide

## How Registration Works with Your Schema

### Registration Flow

1. **User fills registration form** (name, email, password, role)
2. **Supabase Auth creates auth user** → `auth.users` table
3. **Profile created automatically** → `public.users` table (linked via foreign key)
4. **User logged in automatically** → Redirected based on role

### Database Structure

```
auth.users (Supabase managed)
  ├─ id (UUID)
  ├─ email
  └─ encrypted_password

public.users (Your table)
  ├─ id (UUID) → FOREIGN KEY to auth.users(id)
  ├─ email
  ├─ name
  ├─ role ('admin' | 'trainer' | 'visitor')
  ├─ avatar
  ├─ created_at
  └─ updated_at
```

### Key Points

✅ **Foreign Key Relationship**
- `public.users.id` references `auth.users.id`
- When auth user is created, profile MUST use the same ID
- ON DELETE CASCADE ensures cleanup

✅ **Registration Creates Both**
1. Auth user (for authentication)
2. Profile (for app data like name, role)

✅ **Error Handling**
- If profile creation fails → Auth user is cleaned up
- Clear error messages shown to user

## Testing Registration

### 1. Via UI (Recommended)
```
1. Go to http://localhost:3000/register
2. Fill in:
   - Name: John Doe
   - Email: john@example.com
   - Password: password123
   - Role: Visitor or Trainer
3. Click "Create Account"
4. Should redirect to /clock-in
```

### 2. Via Supabase Dashboard
```
1. Go to Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. After creation, run this SQL:

INSERT INTO public.users (id, email, name, role, avatar)
VALUES (
  '<paste_auth_user_id_here>',
  'user@example.com',
  'User Name',
  'visitor',
  '👤'
);
```

## Common Registration Issues

### ❌ Error: "Failed to create user profile"

**Cause:** Database tables not set up or RLS policies blocking

**Fix:**
1. Verify tables exist in Supabase → Table Editor
2. Check RLS policies:
```sql
-- Users should be able to create their own profile
SELECT * FROM pg_policies WHERE tablename = 'users';
```
3. Run the setup SQL from `SUPABASE_DATABASE_SETUP.md`

### ❌ Error: "User already exists"

**Cause:** Email already registered

**Fix:**
- Use different email
- Or delete existing user from Auth → Users

### ❌ Error: "Password must be at least 6 characters"

**Cause:** Supabase requires minimum 6 characters

**Fix:** Use longer password

### ❌ Profile created but can't login

**Cause:** Email confirmation required

**Fix:**
1. Go to Supabase → Authentication → Settings
2. Disable "Enable email confirmations"
3. Or check user's email and confirm manually in Auth → Users

## RLS Policies Needed

Your registration requires these policies on `public.users`:

```sql
-- Allow INSERT during registration
CREATE POLICY "Allow user creation during signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);
```

## Verification

After registration, verify in Supabase:

### Check Auth User
```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test@example.com';
```

### Check Profile
```sql
SELECT * 
FROM public.users 
WHERE email = 'test@example.com';
```

### Both IDs Should Match!
```sql
SELECT 
  au.id as auth_id,
  u.id as profile_id,
  u.email,
  u.name,
  u.role
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email = 'test@example.com';
```

## Admin Registration

⚠️ **Important:** Anyone can register as 'admin' in development!

For production, you should:
1. **Remove admin option** from registration form
2. **Create admins manually** via Supabase Dashboard
3. Or **add validation** to block admin role unless invited

## Next Steps

After successful registration:
- **Admin** → Redirected to `/admin` dashboard
- **Trainer/Visitor** → Redirected to `/clock-in` QR scanner

---

**Troubleshooting?** Check browser console for detailed error messages.
