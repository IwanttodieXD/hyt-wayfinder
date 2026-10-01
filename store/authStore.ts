import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'trainer' | 'trainee' | 'visitor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  qrCode?: string;
  createdAt: Date;
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
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  checkAuth: () => Promise<void>;
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

          // Fetch user profile from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (userError || !userData) {
            set({ isLoading: false });
            return { success: false, error: 'Failed to fetch user profile' };
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            avatar: userData.avatar || undefined,
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
            set({ isLoading: false });
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            set({ isLoading: false });
            return { success: false, error: 'No user data returned' };
          }

          // Wait a moment for the auth user to be fully created
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Use uploaded photo as avatar, or fall back to role-based emoji
          const avatar =
            data.avatar ||
            (data.role === 'admin'
              ? '👨‍💼'
              : data.role === 'trainer'
                ? '👨‍🏫'
                : data.role === 'trainee'
                  ? '🎓'
                  : '👩‍🎓');

          // A database trigger already creates a public.users row as soon as the auth
          // user exists, so a plain INSERT here collides on the primary key
          // ("duplicate key value violates unique constraint users_pkey").
          // Upserting on id works whether or not the trigger is present, and
          // makes sure the chosen name, role and avatar win over the defaults.
          const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert(
              {
                id: authData.user.id, // This links to auth.users(id)
                email: data.email,
                name: data.name,
                role: data.role,
                avatar,
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

            // Clear any orphan profile the trigger may have created, so a
            // later re-registration of the same email isn't blocked by the
            // primary key. RLS allows this only for your own row.
            try {
              const { error: cleanupError } = await supabase
                .from('users')
                .delete()
                .eq('id', authData.user.id);
              if (cleanupError)
                console.warn('Profile cleanup failed:', cleanupError.message);
            } catch {
              // Nothing more we can do client-side.
            }

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
            avatar: userData.avatar || undefined,
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

          // Fetch user profile
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error || !userData) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
            avatar: userData.avatar || undefined,
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
