# Vercel Deployment Guide - HYT Wayfinder

## ✅ Pre-Deployment Checklist

Your app is ready for Vercel! Here's what's already configured:

- ✅ Next.js 14 with App Router
- ✅ All dependencies in package.json
- ✅ TypeScript configured
- ✅ Tailwind CSS configured
- ✅ Client-side state management (Zustand)
- ⚠️ **Environment variables ARE required** (Supabase auth + database)

---

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Visit Vercel**
   ```
   https://vercel.com
   ```

2. **Sign In / Sign Up**
   - Use GitHub, GitLab, or Bitbucket account
   - Or create new Vercel account

3. **Import Project**
   - Click "Add New..." → "Project"
   - Import Git repository or upload folder

4. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: ./hyt-wayfinder (if in subdirectory)
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Done! 🎉

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Root**
   ```bash
   cd hyt-wayfinder
   vercel
   ```

4. **Follow Prompts**
   ```
   ? Set up and deploy? [Y/n] Y
   ? Which scope? (your account)
   ? Link to existing project? [N/y] N
   ? What's your project's name? hyt-wayfinder
   ? In which directory is your code located? ./
   ```

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

---

## 🔧 Build Configuration

**vercel.json** (Optional - Vercel auto-detects Next.js)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## 📦 What Gets Deployed

### Included:
- ✅ All pages (login, register, admin, check-in, tour)
- ✅ Components (QR scanner, 3D visualization, etc.)
- ✅ State stores (auth, records, clock-in)
- ✅ Assets (logo, images)
- ✅ Styles (Tailwind CSS)
- ✅ Three.js 3D engine
- ✅ Font Awesome icons (CDN)

### Excluded:
- ❌ node_modules (rebuilt on Vercel)
- ❌ .next (rebuilt during deployment)
- ❌ .env.local (never committed - set the variables in Vercel instead)

---

## 🌐 After Deployment

### Your Live URLs

Vercel will provide:
```
Production: https://hyt-wayfinder.vercel.app
Preview: https://hyt-wayfinder-xxx.vercel.app (per commit)
```

### Test Your Deployment

1. **Visit Production URL**
   ```
   https://your-app.vercel.app
   ```

2. **Should Redirect to Login**
   - Auto-redirect from home page
   - Shows login form

3. **Test Login**
   ```
   Admin: admin@hyt.com / admin123
   Trainer: trainer@hyt.com / trainer123
   Visitor: visitor@hyt.com / visitor123
   ```

4. **Verify Features**
   - ✅ QR scanner loads
   - ✅ 3D route visualization works
   - ✅ Admin dashboard displays
   - ✅ Records table functions
   - ✅ Session persists on refresh

---

## ⚙️ Environment Variables (REQUIRED)

`.env.local` is gitignored, so it never reaches Vercel. You must add the
variables by hand or the deployed app has no database and no login.

Add them in: **Vercel Dashboard → your project → Settings → Environment Variables**

```env
# Required - the app cannot reach Supabase without these
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Required for admin user create/delete at /admin/users
# Server-only. Do NOT rename to NEXT_PUBLIC_*.
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

Set them for **all three** environments (Production, Preview, Development), then
redeploy - Vercel only injects variables into new builds, so a deploy made
before you added them will still be broken.

### Why the service role key is safe here

Vercel encrypts project variables at rest and never exposes them to the client.
The `NEXT_PUBLIC_` prefix is what marks a variable for browser exposure, and this
one deliberately has no such prefix. It is only read inside
`app/api/admin/users/route.ts`, which runs on the server.

**If you ever need to rotate it:** Supabase Dashboard → Project Settings → API →
Reveal → Regenerate, then update it in Vercel and redeploy. The old value stops
working immediately.

### Verifying the deploy

1. Open the deployed URL - it should load the login page, not error.
2. Log in. If Supabase is misconfigured you'll see a network/auth failure.
3. Sign in as the admin, open `/admin/users`, and confirm the user list loads.
   Create/Delete return a clear 501 until `SUPABASE_SERVICE_ROLE_KEY` is set.

---

## 🔄 Auto-Deploy Setup

### Connect Git Repository

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial deployment"
   git remote add origin https://github.com/yourusername/hyt-wayfinder.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Vercel Dashboard → Import Project
   - Select your GitHub repo
   - Click "Import"

3. **Auto-Deploy Enabled**
   ```
   Every push to main → Production deployment
   Every pull request → Preview deployment
   ```

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install
npm run build
# If builds locally, it will build on Vercel
```

**Error: "Type error"**
```bash
# Solution: Fix TypeScript errors locally first
npm run build
# TypeScript strict mode is on
```

### 3D Not Loading

**Three.js Performance**
- Vercel serves optimized bundles
- 3D loads slower on first visit (caching improves it)
- Check browser WebGL support

### Session Not Persisting

**localStorage Works on Vercel**
- Zustand persist uses localStorage
- Should work same as local
- Check browser privacy settings

---

## 📊 Performance Tips

### 1. Image Optimization
Already configured with Next.js Image component:
```tsx
<Image src="/hyt_logo.png" alt="Logo" width={80} height={80} />
```

### 2. Code Splitting
Next.js automatically splits code by route:
- `/login` → login.js
- `/admin` → admin.js
- Smaller initial bundle

### 3. CDN Caching
Vercel Edge Network caches:
- Static assets
- API responses
- Pages (ISR/SSG)

### 4. Analytics (Optional)
Add Vercel Analytics:
```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🔒 Security Notes

### Current State
- ✅ Supabase Auth (email + password, hashed by Supabase)
- ✅ Row Level Security enabled on `public.users` and `public.clock_in_records`
- ⚠️ Server-side validation only on `/api/admin/users`; the client
  (`useUsersStore.updateUser`) writes through RLS rather than a route handler
- ⚠️ Sessions are Supabase-managed (localStorage persistence)
- ⚠️ The anon key is embedded in the client bundle by design (that is what
  `NEXT_PUBLIC_` means); RLS is what protects your data, not the key

### Still Worth Doing
- ✅ Hash passwords with bcrypt (Supabase already does this)
- ✅ Add rate limiting on `/api/admin/users`
- ✅ Add HTTPS (Vercel provides it automatically)

---

## 📈 Monitoring

### Vercel Dashboard Shows:
- **Deployments** - Build logs and status
- **Analytics** - Page views and performance
- **Logs** - Runtime errors and requests
- **Speed Insights** - Core Web Vitals

Access: `https://vercel.com/dashboard`

---

## 🚦 Deployment Checklist

Before you deploy, verify:

- [ ] `npm run build` succeeds locally
- [ ] No TypeScript errors
- [ ] All imports use `@/` alias correctly
- [ ] Images are in `public/` folder
- [ ] No hardcoded `localhost` URLs
- [ ] `.gitignore` includes `.env.local`, `node_modules`, `.next`
- [ ] Test login flow locally
- [ ] Test QR scanner locally
- [ ] Test 3D visualization locally
- [ ] Test admin dashboard locally

---

## 🎉 You're Ready!

Your HYT Wayfinder is production-ready for Vercel:

1. **Build verified** ✅
2. **No environment secrets needed** ✅
3. **All features client-side** ✅
4. **CDN-friendly assets** ✅

**Deploy command:**
```bash
cd hyt-wayfinder
vercel --prod
```

Or use the Vercel Dashboard for GUI deployment.

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel CLI**: https://vercel.com/docs/cli

---

**Status**: ✅ **READY FOR DEPLOYMENT**  
**Estimated Build Time**: 2-3 minutes  
**Estimated Bundle Size**: ~2-3 MB (with Three.js)
