'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, type UserRole, DESTINATIONS } from '@/store/authStore';
import { useUsersStore, type ManagedUser } from '@/store/usersStore';
import UserProfile from '@/components/UserProfile';

const ROLES: UserRole[] = ['admin', 'trainer', 'trainee', 'visitor'];

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  trainer: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  trainee: 'bg-green-500/20 text-green-300 border-green-500/30',
  visitor: 'bg-navy-600/20 text-navy-300 border-navy-600/30',
};

const INPUT =
  'w-full px-4 py-2.5 rounded-lg bg-navy-950/60 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors';

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  destination: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  role: 'trainee',
  password: '',
  destination: '',
};

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { users, isLoading, fetchUsers, createUser, updateUser, deleteUser } =
    useUsersStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/login');
    } else {
      fetchUsers();
    }
  }, [isAuthenticated, currentUser, router, fetchUsers]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !term ||
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term);
        return matchesSearch && (roleFilter === 'all' || u.role === roleFilter);
      }),
    [users, searchTerm, roleFilter]
  );

  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (target: ManagedUser) => {
    setEditing(target);
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      password: '',
      destination: target.destination ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) return setFormError('Name is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!editing && form.password.length < 6) {
      return setFormError('Password must be at least 6 characters.');
    }

    setIsSaving(true);

    if (editing) {
      const { success, error } = await updateUser(editing.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        // Normalized to null when cleared, so an admin can remove an
        // assignment rather than only ever setting one.
        destination: form.destination || null,
      });
      setIsSaving(false);
      if (!success) return setFormError(error || 'Could not save changes.');
      closeModal();
      setNotice({ kind: 'success', text: `Updated ${form.name.trim()}.` });
      return;
    }

    const { success, error } = await createUser({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      password: form.password,
      destination: form.destination || undefined,
    });
    setIsSaving(false);
    if (!success) return setFormError(error || 'Could not create the user.');
    closeModal();
    setNotice({ kind: 'success', text: `Created ${form.name.trim()}.` });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { success, error } = await deleteUser(deleteTarget.id);
    const name = deleteTarget.name;
    setDeleteTarget(null);
    setNotice(
      success
        ? { kind: 'success', text: `Deleted ${name}.` }
        : { kind: 'error', text: error || 'Could not delete the user.' }
    );
  };

  return (
    <>
      <div className='min-h-screen bg-navy-950'>
        <header className='border-b border-navy-800 bg-navy-900/50 sticky top-0 z-40'>
          <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
            <Link href='/admin' className='flex items-center gap-3'>
              <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                <img
                  src='/hyt_logo.png'
                  alt='HYT Logo'
                  className='w-full h-full object-contain'
                />
              </div>
              <div>
                <h1 className='text-white font-bold text-lg leading-none'>
                  User Management
                </h1>
                <p className='text-navy-300 text-xs mt-0.5'>Manage accounts and roles</p>
              </div>
            </Link>
            <UserProfile />
          </div>
        </header>

        <main className='max-w-7xl mx-auto px-4 py-5'>
          <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
            <Link
              href='/admin'
              className='text-navy-300 hover:text-navy-200 flex items-center gap-2 transition-colors'
            >
              <i className='fa-solid fa-arrow-left'></i>
              <span>Back to Dashboard</span>
            </Link>
            <button
              onClick={openCreate}
              className='px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm transition-colors flex items-center gap-2'
            >
              <i className='fa-solid fa-user-plus'></i>
              Add User
            </button>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
            <div className='glass-panel border-navy-800 p-4 rounded-lg'>
              <p className='text-navy-300 text-xs mb-1'>Total Users</p>
              <p className='text-white text-2xl font-bold'>{users.length}</p>
            </div>
            {ROLES.map((role) => (
              <div key={role} className='glass-panel border-navy-800 p-4 rounded-lg'>
                <p className='text-navy-300 text-xs mb-1 capitalize'>{role}s</p>
                <p className='text-white text-2xl font-bold'>
                  {users.filter((u) => u.role === role).length}
                </p>
              </div>
            ))}
          </div>

          {notice && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg border text-sm flex items-center gap-2 ${notice.kind === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}
            >
              <i
                className={`fa-solid ${notice.kind === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}
              ></i>
              {notice.text}
            </div>
          )}

          <div className='glass-panel border-navy-800 rounded-lg p-4 mb-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Search
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-magnifying-glass text-navy-500'></i>
                  </div>
                  <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search by name or email...'
                    className='w-full pl-12 pr-4 py-2.5 rounded-lg bg-navy-900/50 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Role
                </label>
                <div className='flex flex-wrap gap-2'>
                  {(['all', ...ROLES] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      className={`px-4 py-2.5 rounded-lg font-semibold text-sm capitalize transition-colors border-2 ${roleFilter === role ? 'bg-orange-500/20 text-orange-300 border-orange-500' : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className='glass-panel border-navy-800 rounded-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-navy-900/50 border-b border-navy-800'>
                  <tr>
                    {['User', 'Role', 'Destination', 'Joined', 'Actions'].map((heading) => (
                      <th
                        key={heading}
                        className='px-4 py-3 text-left text-xs font-semibold text-navy-400 uppercase tracking-wider'
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-navy-800'>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className='hover:bg-navy-900/30 transition-colors'>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0'>
                            <i className='fa-solid fa-user text-orange-400'></i>
                          </div>
                          <div className='min-w-0'>
                            <p className='text-white font-semibold text-sm'>
                              {u.name}
                              {u.id === currentUser?.id && (
                                <span className='ml-2 text-navy-400 font-normal text-xs'>
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className='text-navy-500 text-xs truncate'>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${ROLE_STYLES[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        {u.destination ? (
                          <span className='inline-flex items-center gap-1.5 text-navy-300 text-sm'>
                            <i className='fa-solid fa-location-dot text-orange-400 text-xs'></i>
                            {u.destination}
                          </span>
                        ) : (
                          <span className='text-navy-600 text-sm'>—</span>
                        )}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-navy-300 text-sm'>
                        {u.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => openEdit(u)}
                            className='px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white text-xs font-semibold transition-colors'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={u.id === currentUser?.id}
                            title={
                              u.id === currentUser?.id
                                ? 'You cannot delete your own account'
                                : 'Delete user'
                            }
                            className='px-3 py-1.5 rounded-lg bg-red-600 border border-red-500/30 text-paper hover:bg-red-700 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLoading && filteredUsers.length === 0 && (
                <div className='text-center py-12'>
                  <i className='fa-solid fa-users text-navy-600 text-4xl mb-3'></i>
                  <p className='text-navy-300'>No users found</p>
                  {users.length === 0 && (
                    <p className='text-navy-500 text-sm mt-1'>
                      Add your first user to get started
                    </p>
                  )}
                </div>
              )}

              {isLoading && users.length === 0 && (
                <div className='text-center py-12'>
                  <i className='fa-solid fa-spinner fa-spin text-orange-400 text-2xl'></i>
                  <p className='text-navy-300 mt-2'>Loading users...</p>
                </div>
              )}
            </div>
          </div>

          <div className='mt-4 text-center text-navy-400 text-sm'>
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/60'
            onClick={closeModal}
            aria-hidden='true'
          ></div>
          <div className='relative w-full max-w-md bg-navy-900 border border-navy-700 rounded-lg'>
            <div className='px-4 py-3 border-b border-navy-700 flex items-center justify-between'>
              <h2 className='text-white font-bold'>
                {editing ? 'Edit User' : 'Add User'}
              </h2>
              <button
                onClick={closeModal}
                className='text-navy-400 hover:text-white transition-colors'
                aria-label='Close'
              >
                <i className='fa-solid fa-xmark'></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className='p-4 space-y-3'>
              {formError && (
                <div className='p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm'>
                  {formError}
                </div>
              )}
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Name
                </label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className={INPUT}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Email
                </label>
                <input
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className={INPUT}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Role
                </label>
                <div className='relative'>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as UserRole })
                    }
                    className={`w-full px-4 py-2.5 rounded-lg appearance-none capitalize bg-navy-950/60 border border-navy-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors cursor-pointer`}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role} className='bg-navy-900'>
                        {role}
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Destination
                </label>
                <div className='relative'>
                  <select
                    value={form.destination}
                    onChange={(e) =>
                      setForm({ ...form, destination: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 rounded-lg appearance-none bg-navy-950/60 border border-navy-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors cursor-pointer`}
                  >
                    <option value='' className='bg-navy-900'>
                      Not assigned
                    </option>
                    {DESTINATIONS.map((destination) => (
                      <option
                        key={destination}
                        value={destination}
                        className='bg-navy-900'
                      >
                        {destination}
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                </div>
              </div>
              {!editing && (
                <div>
                  <label className='block text-sm font-medium text-navy-200 mb-2'>
                    Password
                  </label>
                  <input
                    type='password'
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder='At least 6 characters'
                    className={INPUT}
                  />
                </div>
              )}
              <div className='flex gap-2 pt-1'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='flex-1 px-4 py-2.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white font-semibold text-sm transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isSaving}
                  className='flex-1 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/60'
            onClick={() => setDeleteTarget(null)}
            aria-hidden='true'
          ></div>
          <div className='relative w-full max-w-sm bg-navy-900 border border-navy-700 rounded-lg p-4'>
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0'>
                <i className='fa-solid fa-triangle-exclamation text-red-400'></i>
              </div>
              <div>
                <h2 className='text-white font-bold'>Delete user?</h2>
                <p className='text-navy-300 text-sm mt-1'>
                  This permanently removes{' '}
                  <span className='text-white font-semibold'>{deleteTarget.name}</span>{' '}
                  and their login. Their clock-in records are deleted too.
                </p>
              </div>
            </div>
            <div className='flex gap-2 mt-4'>
              <button
                onClick={() => setDeleteTarget(null)}
                className='flex-1 px-4 py-2.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white font-semibold text-sm transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className='flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-paper font-semibold text-sm transition-colors'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
