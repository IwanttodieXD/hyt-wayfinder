import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/store/authStore';

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  /** Set when the account was retired. History is kept; the row is not deleted. */
  archivedAt: Date | null;
}

export interface NewUserInput {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

interface UsersState {
  users: ManagedUser[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  createUser: (input: NewUserInput) => Promise<{ success: boolean; error?: string }>;
  updateUser: (
    id: string,
    updates: UpdateUserInput
  ) => Promise<{ success: boolean; error?: string }>;
  /** Retires the account by setting `archived_at`. Nothing is deleted. */
  archiveUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  getUserCount: () => number;
  getUsersByRole: (role: UserRole) => number;
}

function mapRow(row: any): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    createdAt: new Date(row.created_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  };
}

/**
 * Posts JSON to the admin route with the caller's access token attached.
 *
 * The token is required: without it, RLS evaluates `auth.uid()` as NULL and the
 * admin check inside the route fails. Creating and archiving accounts also need
 * the service role key server-side, which is why they cannot be done from the
 * browser directly.
 */
async function adminRequest(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; status: number; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await res.json().catch(() => ({}));

  return {
    ok: res.ok,
    status: res.status,
    error: res.ok ? undefined : payload.error || `Request failed (${res.status})`,
  };
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });

    try {
      // Archived accounts are hidden by default: the admin list is about who is
      // currently active. They are still readable for attendance history.
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .is('archived_at', null)
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

  // Creating an account needs a real auth.users row, which the anon key cannot
  // make. This goes through a server route using the service role key. Until
  // SUPABASE_SERVICE_ROLE_KEY is set, that route returns 501.
  createUser: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const { ok, error } = await adminRequest('/api/admin/users', 'POST', input);

      if (!ok) {
        set({ isLoading: false, error: error || 'Failed to create user' });
        return { success: false, error: error || 'Failed to create user' };
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

  // Goes through the server route rather than writing with the anon key: RLS
  // only permits updating your own row, so editing another user directly from
  // the browser would be rejected by the database.
  updateUser: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const { ok, error } = await adminRequest('/api/admin/users', 'PATCH', {
        id,
        ...updates,
      });

      if (!ok) {
        set({ isLoading: false, error: error || 'Failed to update user' });
        return { success: false, error: error || 'Failed to update user' };
      }

      // Keep local state in sync without a full refetch.
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id
            ? {
                ...u,
                name: updates.name,
                email: updates.email,
                role: updates.role,
              }
            : u
        ),
        isLoading: false,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to update user';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  // Archiving, not deleting. The new schema forbids deleting a user outright:
  // `users` is referenced by attendance with ON DELETE RESTRICT and no DELETE
  // policy is granted, so history would be destroyed (or the delete rejected).
  archiveUser: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { ok, error } = await adminRequest(
        `/api/admin/users?id=${encodeURIComponent(id)}`,
        'DELETE'
      );

      if (!ok) {
        set({ isLoading: false, error: error || 'Failed to archive user' });
        return { success: false, error: error || 'Failed to archive user' };
      }

      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        isLoading: false,
      }));

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to archive user';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  getUserCount: () => get().users.length,

  getUsersByRole: (role) => get().users.filter((u) => u.role === role).length,
}));
