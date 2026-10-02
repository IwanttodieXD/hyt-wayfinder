import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create/delete a user account.
//
// Creating a real login requires an auth.users row, and deleting one must
// remove it. Neither is possible with the anon key, so both use the service
// role key, which must stay server-side.
//
// Until SUPABASE_SERVICE_ROLE_KEY is configured, this returns 501 and the UI
// disables Create/Delete while Read/Update keep working over RLS.

const SERVICE_KEY_NOT_SET =
  'User creation/deletion needs SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to enable.';

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

  const { email, name, role, password, destination } = body ?? {};

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

  // Optional, but must be a string when present so a stray object or number
  // can't reach the column.
  if (destination !== undefined && destination !== null && typeof destination !== 'string') {
    return NextResponse.json({ error: 'Invalid destination' }, { status: 400 });
  }

  const trimmedDestination =
    typeof destination === 'string' ? destination.trim() : '';

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
      // Omitted when blank so the column falls back to its NULL default
      // instead of being written as an empty string.
      ...(trimmedDestination ? { destination: trimmedDestination } : {}),
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
      { error: 'You cannot delete your own account' },
      { status: 400 }
    );
  }

  // Remove the login first; the public.users row cascades from auth.users.
  const { error } = await service.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
