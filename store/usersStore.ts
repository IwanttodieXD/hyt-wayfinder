import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/store/authStore';

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string | null;
  createdAt: Date;
}

export interface NewUserInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

interface UsersState {
  users: ManagedUser[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  createUser: (input: NewUserInput) => Promise<{ success: boolean; error?: string }>;
  updateUser: (
    id: string,
    updates: Partial<Pick<ManagedUser, 'name' | 'role' | 'email'>>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  getUserCount: () => number;
  getUsersByRole: (role: UserRole) => number;
}

function mapRow(row: any): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    avatar: row.avatar ?? null,
    createdAt: new Date(row.created_at),
  };
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        set({ isLoading: false, error: error.message });
        return;
      }

      set({ users: (data ?? []).map(mapRow), isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load users' });
    }
  },

  // Creating an account needs a real auth.users row, which the anon key
  // cannot make. This goes through a server route using the service role
  // key. Until SUPABASE_SERVICE_ROLE_KEY is set, that route returns 501.
  createUser: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        set({ isLoading: false, error: payload.error || 'Failed to create user' });
        return { success: false, error: payload.error || 'Failed to create user' };
      }

      // Refresh so the new row lands in the right sort position.
      await get().fetchUsers();
      set({ isLoading: false });
      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to create user';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // Update only touches public.users, so the anon key + RLS is enough.
  updateUser: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        set({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Keep local state in sync without a full refetch.
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? mapRow(data) : u)),
        isLoading: false,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to update user';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // Deleting must remove the auth.users row too, so it needs the service
  // role key via the server route.
  deleteUser: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        set({ isLoading: false, error: payload.error || 'Failed to delete user' });
        return { success: false, error: payload.error || 'Failed to delete user' };
      }

      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        isLoading: false,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to delete user';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  getUserCount: () => get().users.length,

  getUsersByRole: (role) => get().users.filter((u) => u.role === role).length,
}));
