import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

/**
 * System permission level. Drives what a person may see and do.
 *
 * Only two levels exist, because only two behave differently: an admin runs the
 * building, everyone else is a visitor using the mobile check-in. The trainer and
 * trainee roles were removed - they were never granted anything by any RLS policy
 * and their portal was byte-identical to the visitor one.
 *
 * Note the `user_role` enum in Postgres still declares 'trainer' and 'trainee'.
 * They are retired but retained in the type, because Postgres cannot drop an enum
 * label and recreating the type would mean dropping and rebuilding a column on a
 * table that attendance history depends on. Nothing writes them any more; see
 * 20260101000003_retire_trainee_roles.sql, which normalises existing rows.
 */
export type UserRole = 'admin' | 'visitor';

/**
 * Destinations a user can be assigned to.
 *
 * Room numbers are the authoritative identifier, so this is derived from the
 * `rooms` table rather than hardcoded - a room that exists in the database but
 * not in this list would silently be unassignable. Kept as a fallback for the
 * admin form's initial render, before the fetch resolves.
 *
 * Note the user's assigned room is stored on the attendance record, not on the
 * user row; this list only describes what may be chosen.
 */
export const DESTINATIONS = [
  'Room 201',
  'Room 202',
  'Room 301',
  'Room 302',
  'Room 303',
  'Room 304',
  'Room 401',
  'Room 402',
  'Room 403',
  'Room 404',
  'Roofdeck',
] as const;

export type Destination = (typeof DESTINATIONS)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /**
   * The room this person is assigned to, held pending.
   *
   * There is no destination column on `users` any more: the assigned room is
   * recorded per visit on `clock_in_records.room_id`. This value is applied to
   * the visitor's first attendance record when they check in (see QRScanner),
   * after which the database is the source of truth.
   */
  destination?: string;
  /**
   * Why this person is here, held pending.
   *
   * Like the assigned room, purpose is deliberately NOT on the user row: the
   * schema puts `purpose_id` on `clock_in_records` so it can change per visit
   * (a visitor attends a Meeting one day and an Orientation the next). This
   * value only seeds the visitor's first attendance record at check-in, after
   * which they pick a purpose per visit and the database is the source of truth.
   */
  purpose?: string;
  qrCode?: string;
  createdAt: Date;
}

/**
 * True when a visitor's pass has run out.
 *
 * Mirrors `isPassExpired` in usersStore - compared against the start of today,
 * not the current instant, so a pass set to expire "on the 10th" is still valid
 * for the whole of the 10th. Using the raw timestamp would lock someone out at
 * midnight on the night before the event they were registered for.
 *
 * A null `valid_until` means the pass never expires, which is the default for
 * everyone created before migration 004.
 */
function isPassExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  const expiry = new Date(validUntil);
  if (Number.isNaN(expiry.getTime())) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return expiry.getTime() < startOfToday.getTime();
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    destination?: string;
    purpose?: string;
    // Visitor profile, self-declared at registration. The same columns the admin
    // form writes (migration 004); an admin can correct any of them later.
    visitorTypeId?: string;
    company?: string;
    phone?: string;
    /**
     * When this pass stops working, as an ISO timestamp.
     *
     * The register form sets this to the end of the registering day, so a
     * walk-in account cannot quietly stay valid for months. `isPassExpired`
     * compares against the START of today, so an end-of-today value is valid for
     * the whole day and expires the next morning. Admin-created users set their
     * own date instead; leaving it undefined means the pass never expires.
     */
    validUntil?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    /**
     * True when the account was created but the address still needs confirming,
     * so there is no session yet. The caller should show this as a success state
     * and send the person to their inbox, not as a failure.
     */
    needsConfirmation?: boolean;
  }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

/**
 * Ensures a profile row exists for the signed-in user, creating it if missing.
 *
 * Accounts can end up orphaned: an auth login with no `users` row. That is
 * exactly what happened while the profile trigger was missing, and it leaves the
 * person unable to sign in at all - the login itself succeeds, then the profile
 * fetch comes back empty. Re-registering does not help either, because auth
 * answers "user already registered" for the address that already has a login.
 *
 * So this repairs it in place rather than making them start over. The insert is
 * permitted by the "users insert own row" policy, which only allows a row for
 * the caller's own id with role 'visitor', so this cannot be used to invent an
 * account or grant a role.
 *
 * Returns the profile row, or null if it could not be read or created.
 */
async function ensureProfile(authUser: {
  id: string;
  email?: string;
}): Promise<any | null> {
  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (readError) {
    console.error('Could not read user profile:', readError);
    return null;
  }

  if (existing) return existing;

  // Missing profile: create it. Only name/email/id are set, so the role falls
  // back to the schema default of 'visitor'.
  const { data: created, error: createError } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email ?? '',
      name: authUser.email?.split('@')[0] ?? 'User',
    })
    .select()
    .single();

  if (createError) {
    console.error('Could not create the missing user profile:', createError);
    return null;
  }

  return created;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Sign in with Supabase Auth
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (authError) {
            set({ isLoading: false });
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            set({ isLoading: false });
            return { success: false, error: 'No user data returned' };
          }

          // Read the profile, creating it if this account was orphaned by the missing
          // trigger. Without the repair step the login succeeds and then fails
          // with "Failed to fetch user profile", leaving them stuck.
          const userData = await ensureProfile(authData.user);

          if (!userData) {
            set({ isLoading: false });
            return {
              success: false,
              error:
                'Signed in, but your profile could not be loaded. Please contact an administrator.',
            };
          }

          // An archived account can still hold a valid auth session. Treat it as signed
          // out rather than letting a retired person keep checking in. The server also
          // bans the auth login on archive, so this is a second line of defence.
          if (userData.archived_at) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false });
            return {
              success: false,
              error: 'This account has been archived. Contact an administrator.',
            };
          }

          // An event pass that has run out. Sign out rather than refuse, so the
          // person is not left with a session that half-works: they get a clear
          // reason and their history stays intact, and an admin can extend
          // `valid_until` to let them back in.
          if (isPassExpired(userData.valid_until)) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false });
            return {
              success: false,
              error:
                'Your visitor pass has expired. Please contact reception to renew it.',
            };
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            qrCode: `HYT-USER:${userData.id}`,
            createdAt: new Date(userData.created_at),
          };

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An unexpected error occurred' };
        }
      },

      register: async (data) => {
        set({ isLoading: true });

        try {
          // Sign up with Supabase Auth.
          //
          // No role is sent in the metadata, and none is accepted: the
          // handle_new_user trigger hardcodes 'visitor' and deliberately ignores
          // raw_user_meta_data, so a client-supplied role could never take effect
          // anyway. Sending one implied a privilege the visitor does not have.
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: data.name,
              },
            },
          });

          if (authError) {
            // A repeated signup for an address that already has an auth login. This is
            // not necessarily an error the person caused: earlier failures left
            // logins behind with no profile, and registration will always say
            // "already registered" for those. Signing in now repairs the
            // missing profile automatically, so send them there rather than
            // telling them they're stuck.
            const alreadyRegistered =
              /already registered|already been registered/i.test(authError.message);

            set({ isLoading: false });
            return {
              success: false,
              error: alreadyRegistered
                ? 'This email already has an account. Sign in with your password instead - if you have forgotten it, ask an administrator to reset it.'
                : authError.message,
            };
          }

          if (!authData.user) {
            set({ isLoading: false });
            return { success: false, error: 'No user data returned' };
          }

          // When email confirmation is enabled, Supabase creates the auth user
          // but returns NO session until the address is confirmed. Everything
          // below writes under RLS, and RLS evaluates auth.uid() as NULL without
          // a session - so the profile write would fail with "permission denied
          // for table users" however correct it is.
          //
          // The handle_new_user trigger has already created the profile row, so
          // there is nothing to do until they confirm. Say so plainly instead of
          // letting a confusing permission error surface.
          if (!authData.session) {
            set({ isLoading: false });
            return {
              success: false,
              needsConfirmation: true,
              error:
                'Almost done - check your email for a confirmation link, then sign in.',
            };
          }

          // Wait a moment for the auth user to be fully created
          await new Promise((resolve) => setTimeout(resolve, 500));

          // The database trigger (handle_new_user) already created this profile row,
          // so a plain INSERT would collide on the primary key. Upserting on id
          // is therefore the right call here.
          //
          // `role` is deliberately NOT written, on either path:
          //   - INSERT is checked by the self-insert policy, which only permits
          //     role = 'visitor' for your own id. Letting the client pick its
          //     own role would be a privilege escalation.
          //   - The conflict update is limited to name/email, so re-registering
          //     can never downgrade a role an admin granted.
          // Elevated roles are assigned through /admin/users.
          //
          // The visitor profile columns are written here but only from the
          // values the person actually filled in. Sending them unconditionally
          // would blank anything an admin had since filled in, because the
          // trigger-created row already exists and this is the update path.
          const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert(
              {
                id: authData.user.id, // This links to auth.users(id)
                email: data.email,
                name: data.name,
                ...(data.visitorTypeId
                  ? { visitor_type_id: data.visitorTypeId }
                  : {}),
                ...(data.company ? { company: data.company } : {}),
                ...(data.phone ? { phone: data.phone } : {}),
                // Only written when supplied, so re-registering an account an admin
                // had already given a long pass does not silently shorten it back to
                // today. The register form always supplies one.
                ...(data.validUntil ? { valid_until: data.validUntil } : {}),
              },
              { onConflict: 'id' }
            )
            .select()
            .single();

          if (userError) {
            console.error('Profile creation error:', userError);

            // Roll back the auth user so registration doesn't leave an
            // account that can sign in but has no profile.
            //
            // The anon key cannot call auth.admin.*, so this best-effort
            // call usually fails during self-registration. That is why the
            // upsert above matters: with the trigger in place the profile
            // write succeeds, so we rarely reach this path at all.
            await supabase.auth.admin
              .deleteUser(authData.user.id)
              .catch(() => supabase.auth.signOut());

            // No profile cleanup here on purpose. `users.id` references
            // `auth.users(id) ON DELETE CASCADE`, so deleting the auth user above
            // already removes the orphaned profile. The previous explicit
            // DELETE could never have worked anyway: the new schema grants no
            // DELETE policy on `users`, precisely so attendance history cannot be
            // destroyed through the API.

            set({ isLoading: false });
            return {
              success: false,
              error: `Failed to create user profile: ${userError.message}`,
            };
          }

          if (!userData) {
            set({ isLoading: false });
            return { success: false, error: 'No profile data returned' };
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            // The assigned room was chosen moments ago and is not in the
            // database, so it is carried in the (persisted) session. The room is
            // applied to this user's first attendance record at check-in.
            ...(data.destination ? { destination: data.destination } : {}),
            ...(data.purpose ? { purpose: data.purpose } : {}),
            qrCode: `HYT-USER:${userData.id}`,
            createdAt: new Date(userData.created_at),
          };

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          return {
            success: false,
            error: error?.message || 'An unexpected error occurred during registration',
          };
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Same repair as on login: a session can outlive a missing profile row.
          const userData = await ensureProfile(session.user);

          if (!userData) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Archived accounts have no valid session, same as on login, and an expired
          // event pass is treated the same way.
          if (userData.archived_at || isPassExpired(userData.valid_until)) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            qrCode: `HYT-USER:${userData.id}`,
            createdAt: new Date(userData.created_at),
          };

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'hyt-auth-storage',
    }
  )
);
