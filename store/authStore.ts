import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'trainer' | 'trainee' | 'visitor';

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
   * Client-side only. `users` has no avatar column on the new schema, so the
   * chosen photo is kept in the persisted store rather than the database. It is
   * cosmetic and nothing joins on it.
   */
  avatar?: string;
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
   * (a trainee attends a Meeting one day and an Orientation the next). This
   * value only seeds the visitor's first attendance record at check-in, after
   * which they pick a purpose per visit and the database is the source of truth.
   */
  purpose?: string;
  qrCode?: string;
  createdAt: Date;
}

/** Fallback avatar per role, used when no photo was uploaded. */
function roleAvatar(role: UserRole): string {
  if (role === 'admin') return '👨‍💼';
  if (role === 'trainer') return '👨‍🏫';
  if (role === 'trainee') return '🎓';
  return '👩‍🎓';
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
    role: UserRole;
    avatar?: string;
    destination?: string;
    purpose?: string;
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
          // out rather than letting a retired person keep checking in.
          if (userData.archived_at) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false });
            return {
              success: false,
              error: 'This account has been archived. Contact an administrator.',
            };
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            // Neither column exists on the new schema, so the photo is not
            // persisted server-side and the assigned room is not held here.
            avatar: roleAvatar(userData.role as UserRole),
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
          // Sign up with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: data.name,
                role: data.role,
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

          // The photo if one was uploaded, otherwise a neutral placeholder. Derived from
          // the *granted* role (always 'visitor' at this point) rather than the
          // requested one, which the database has not accepted - showing a
          // trainer emoji for someone who is still a visitor would be a lie.
          const avatar = data.avatar || '👩‍🎓';

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
          const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert(
              {
                id: authData.user.id, // This links to auth.users(id)
                email: data.email,
                name: data.name,
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
            // The photo and assigned room were chosen moments ago and are not in
            // the database, so they are carried in the (persisted) session. The
            // room is applied to this user's first attendance record at check-in.
            avatar,
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

          // Archived accounts have no valid session, same as on login.
          if (userData.archived_at) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            avatar: roleAvatar(userData.role as UserRole),
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
