import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create/update/archive a user account.
//
// Creating a real login requires an auth.users row, which the anon key cannot
// make. Updating *another* user's profile also needs the service role key: RLS
// grants "users update own row" only, so an admin editing someone else through
// the anon key would be silently rejected by the database.
//
// Until SUPABASE_SERVICE_ROLE_KEY is configured, create/archive return 501 and
// the UI disables those actions.

const SERVICE_KEY_NOT_SET =
  'User creation/archiving needs SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to enable.';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Confirms the caller is an authenticated admin, using the caller's own
// access token so RLS applies and the service key never leaks upward.
async function requireAdmin(
  request: Request
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }

  const token = authHeader.slice(7);
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonUrl || !anonKey) {
    return { ok: false, status: 500, error: 'Supabase is not configured' };
  }

  // Verify the token and read the caller's role.
  // The caller's access token must be attached to every request, otherwise
  // RLS evaluates auth.uid() as NULL and the profile lookup returns nothing.
  const callerClient = createClient(anonUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' };
  }

  const { data: profile, error: profileError } = await callerClient
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  // Distinguish "profile unreadable" from "genuinely not an admin", so a
  // missing profile or blocked read doesn't look like a permissions problem.
  if (profileError || !profile) {
    return {
      ok: false,
      status: 403,
      error:
        'Could not read your user profile. The admin user-management RLS ' +
        'policies may not be applied yet (see SUPABASE_SETUP.md).',
    };
  }

  if (profile.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      error: `Admin access required. Your role is "${profile.role}".`,
    };
  }

  return { ok: true, userId: userData.user.id };
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: SERVICE_KEY_NOT_SET }, { status: 501 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, name, role, password } = body ?? {};

  if (!email || !name || !role || !password) {
    return NextResponse.json(
      { error: 'email, name, role and password are all required' },
      { status: 400 }
    );
  }

  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  }

  if (!['admin', 'trainer', 'trainee', 'visitor'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // 1. Create the login. email_confirm skips the verification email step,
  //    which suits an admin provisioning accounts by hand.
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message || 'Could not create the login' },
      { status: 400 }
    );
  }

  // 2. Make sure the profile row matches what was requested.
  //
  // This project has a database trigger that inserts a public.users row as
  // soon as the auth user exists, so a plain INSERT here collides on the
  // primary key ("duplicate key value violates unique constraint
  // users_pkey"). Upserting on id makes this correct whether or not the
  // trigger is present, and still applies the chosen name and role.
  const { error: profileError } = await service.from('users').upsert(
    {
      id: created.user.id,
      email,
      name,
      role,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    // Don't leave a half-created account behind.
    await service.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json(
      { error: `Could not save the profile: ${profileError.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, id: created.user.id }, { status: 201 });
}

/**
 * Edit another user's profile.
 *
 * Routed through the service key on purpose. RLS only permits updating your own
 * row (`USING (auth.uid() = id)`), so an admin editing someone else over the anon
 * key is rejected by the database no matter what the UI believes.
 *
 * Only the columns that exist on the new schema are writable here.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: SERVICE_KEY_NOT_SET }, { status: 501 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, name, email, role } = body ?? {};

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'A user id is required' }, { status: 400 });
  }

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!['admin', 'trainer', 'trainee', 'visitor'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Guard against an admin demoting themselves and locking everyone out of
  // the admin area.
  if (id === admin.userId && role !== 'admin') {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    );
  }

  const { error } = await service
    .from('users')
    .update({ name: name.trim(), email: email.trim(), role })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Archive a user rather than deleting them.
 *
 * Attendance history must survive someone leaving, so the schema has no DELETE
 * path at all: `users` is referenced by `clock_in_records` and `room_visits`
 * with ON DELETE RESTRICT, and no DELETE policy is granted. Setting
 * `archived_at` retires the account while keeping every visit row intact.
 */
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: SERVICE_KEY_NOT_SET }, { status: 501 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'A user id is required' }, { status: 400 });
  }

  // Guard against an admin locking themselves out.
  if (id === admin.userId) {
    return NextResponse.json(
      { error: 'You cannot archive your own account' },
      { status: 400 }
    );
  }

  // Only the profile row is touched. Deliberately NOT
  // `auth.admin.deleteUser`: `users.id` cascades from `auth.users`, so removing
  // the login would delete the profile and take the attendance history with it
  // (or fail outright on the ON DELETE RESTRICT foreign keys).
  //
  // Consequence: an archived person keeps a working login. Their sessions stop
  // resolving a usable profile, so the app treats them as signed out, but to
  // revoke authentication itself you must ban the user in Supabase Auth.
  const { error } = await service
    .from('users')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
