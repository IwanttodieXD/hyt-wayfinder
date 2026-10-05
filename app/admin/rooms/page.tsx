'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { ROOM_PREFIX_FACTORY } from '@/lib/wayfinding';
import type { Room } from '@/store/roomsStore';
import UserProfile from '@/components/UserProfile';

/** Floors the schema's CHECK constraint permits. */
const FLOORS = ['G', '2', '3', '4', 'Roof'] as const;

const INPUT =
  'w-full px-4 py-2.5 rounded-lg bg-navy-950/60 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors';

type FormState = {
  roomNumber: string;
  name: string;
  floor: string;
  building: string;
  qrValue: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  roomNumber: '',
  name: '',
  floor: '2',
  building: 'HYT-Business Center',
  qrValue: '',
  isActive: true,
};

/** Suggests the code that will be printed on the door. */
function suggestQrValue(roomNumber: string): string {
  if (!roomNumber.trim()) return '';
  return ROOM_PREFIX_FACTORY(
    roomNumber.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-')
  );
}

/**
 * Rooms management, admin-only.
 *
 * Rooms are referenced by id everywhere else, so this page is the only place a
 * room is created or retired. There is deliberately no delete: rooms with visit
 * history must survive, so deactivation (`is_active`) is how a room is taken out
 * of circulation. Its history stays queryable.
 */
export default function RoomsPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/login');
    }
  }, [isAuthenticated, currentUser, router]);

  // Always refetched rather than served from the shared store: this is an edit
  // surface, so it must not show a cached copy a previous screen left behind.
  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number');

      if (error) {
        setNotice({ kind: 'error', text: error.message });
        return;
      }

      setRooms(
        (data ?? []).map((row: any) => ({
          id: row.id,
          roomNumber: row.room_number,
          name: row.name,
          floor: row.floor,
          building: row.building,
          qrValue: row.qr_value,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      loadRooms();
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeCount = useMemo(
    () => rooms.filter((r) => r.isActive).length,
    [rooms]
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

  const openEdit = (target: Room) => {
    setEditing(target);
    setForm({
      roomNumber: target.roomNumber,
      name: target.name,
      floor: target.floor,
      building: target.building,
      qrValue: target.qrValue,
      isActive: target.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };
  const handleSave = async () => {
    setFormError(null);

    if (!form.roomNumber.trim() || !form.name.trim()) {
      setFormError('Room number and name are both required.');
      return;
    }

    if (!FLOORS.includes(form.floor as (typeof FLOORS)[number])) {
      setFormError(`Floor must be one of: ${FLOORS.join(', ')}.`);
      return;
    }

    const qrValue = form.qrValue.trim() || suggestQrValue(form.roomNumber);

    setIsSaving(true);
    try {
      const payload = {
        room_number: form.roomNumber.trim(),
        name: form.name.trim(),
        floor: form.floor,
        building: form.building.trim() || 'HYT-Business Center',
        qr_value: qrValue,
        is_active: form.isActive,
      };

      const query = editing
        ? supabase.from('rooms').update(payload).eq('id', editing.id)
        : supabase.from('rooms').insert(payload);

      const { error } = await query;

      if (error) {
        setFormError(error.message);
        return;
      }

      setIsModalOpen(false);
      setNotice({
        kind: 'success',
        text: editing ? 'Room updated.' : 'Room added.',
      });
      await loadRooms();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSaving(false);
    }
  };

  /** Deactivate/reactivate rather than delete, so history is never destroyed. */
  const toggleActive = async (room: Room) => {
    const { error } = await supabase
      .from('rooms')
      .update({ is_active: !room.isActive })
      .eq('id', room.id);

    if (error) {
      setNotice({ kind: 'error', text: error.message });
      return;
    }

    setNotice({
      kind: 'success',
      text: room.isActive
        ? `${room.roomNumber} deactivated. Its visit history is kept.`
        : `${room.roomNumber} reactivated.`,
    });
    await loadRooms();
  };
  return (
    <div className='min-h-screen'>
      {/* Header matches the other admin pages: sticky, logo lockup, px-4 py-3.
          This page previously used a different bar (icon + text, px-6, not
          sticky), which made it read as a separate app when navigating between
          admin screens. */}
      <header className='app-header border-b sticky top-0 z-50'>
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
                Manage Rooms
              </h1>
              <p className='text-navy-300 text-xs mt-0.5'>
                Rooms and their door codes
              </p>
            </div>
          </Link>
          <UserProfile />
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 py-5'>
        {/* Back link on the left, primary action on the right - the same row
            layout as /admin/records and /admin/users. */}
        <div className='mb-6 flex items-center justify-between gap-4'>
          <Link
            href='/admin'
            className='text-navy-300 hover:text-navy-200 flex items-center gap-2 transition-colors'
          >
            <i className='fa-solid fa-arrow-left'></i>
            <span>Back to Dashboard</span>
          </Link>
          <button
            onClick={openCreate}
            className='px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors flex items-center gap-2 font-semibold text-sm'
          >
            <i className='fa-solid fa-plus'></i>
            Add Room
          </button>
        </div>

        {/* Summary tiles, matching the glass-panel stat cards used on the
            dashboard and the room-visits page. */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Total Rooms</p>
            <p className='text-white text-3xl font-bold'>{rooms.length}</p>
          </div>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Active</p>
            <p className='text-green-400 text-3xl font-bold'>{activeCount}</p>
          </div>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Inactive</p>
            <p className='text-navy-300 text-3xl font-bold'>
              {rooms.length - activeCount}
            </p>
          </div>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Floors In Use</p>
            <p className='text-white text-3xl font-bold'>
              {new Set(
                rooms.filter((r) => r.isActive).map((r) => r.floor)
              ).size}
            </p>
          </div>
        </div>

        <p className='text-navy-400 text-sm mb-4'>
          Rooms are never deleted &mdash; deactivating one keeps its visit history
          queryable.
        </p>

        {notice && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              notice.kind === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className='glass-panel border-navy-800 rounded-lg overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-navy-900/30 border-b border-navy-800'>
                <tr>
                  {['Room', 'Name', 'Floor', 'QR Code', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className='px-4 py-3 text-left text-xs font-semibold text-navy-300 uppercase tracking-wider'
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className='border-b border-navy-800/50 last:border-0'
                  >
                    <td className='px-4 py-3 font-medium'>{room.roomNumber}</td>
                    <td className='px-4 py-3 text-navy-200'>{room.name}</td>
                    <td className='px-4 py-3 text-navy-300'>{room.floor}</td>
                    <td className='px-4 py-3'>
                      <code className='text-xs text-navy-400'>
                        {room.qrValue}
                      </code>
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          room.isActive
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-navy-700 text-navy-300 border border-navy-600'
                        }`}
                      >
                        {room.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => openEdit(room)}
                          className='px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-xs font-semibold transition-colors'
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(room)}
                          className='px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-xs font-semibold transition-colors'
                        >
                          {room.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && rooms.length === 0 && (
            <div className='text-center py-12'>
              <i className='fa-solid fa-door-closed text-navy-600 text-4xl mb-4'></i>
              <p className='text-navy-300'>No rooms yet.</p>
              <p className='text-navy-500 text-sm mt-1'>
                Add one, or run the seed script.
              </p>
            </div>
          )}
        </div>
      </main>
      {/* Add / edit modal. Scroll container + height cap, matching the Add Visitor
          modal on /admin/users: on a phone a form this tall would otherwise run
          past the bottom of the screen with no way to reach its buttons. */}
      {isModalOpen && (
        <div
          className='fixed inset-0 z-50 bg-navy-950/80 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto'
          role='dialog'
          aria-modal='true'
        >
          <div className='glass-panel border-navy-700 sm:rounded-lg p-6 w-full sm:max-w-lg my-0 sm:my-8 max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)] flex flex-col'>
            <h2 className='text-lg font-bold mb-4 flex-shrink-0'>
              {editing ? `Edit ${editing.roomNumber}` : 'Add Room'}
            </h2>

            <div className='space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain pr-1'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-navy-200 mb-2'>
                    Room number
                  </label>
                  <input
                    className={INPUT}
                    value={form.roomNumber}
                    onChange={(e) => {
                      const roomNumber = e.target.value;
                      setForm((f) => ({
                        ...f,
                        roomNumber,
                        // Only auto-fill while adding, so editing never silently
                        // rewrites a code that posters are already printed with.
                        qrValue: editing ? f.qrValue : suggestQrValue(roomNumber),
                      }));
                    }}
                    placeholder='Room 304'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-navy-200 mb-2'>
                    Floor
                  </label>
                  <select
                    className={INPUT}
                    value={form.floor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, floor: e.target.value }))
                    }
                  >
                    {FLOORS.map((f) => (
                      <option key={f} value={f} className='bg-navy-900'>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Display name
                </label>
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder='Room 304'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Building
                </label>
                <input
                  className={INPUT}
                  value={form.building}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, building: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  QR code value
                </label>
                <input
                  className={INPUT}
                  value={form.qrValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, qrValue: e.target.value }))
                  }
                  placeholder='HYT-ROOM-01:ROOM-304'
                />
                <p className='text-navy-500 text-xs mt-1'>
                  Must be unique. Changing it after posters are printed means
                  reprinting them.
                </p>
              </div>

              <label className='flex items-center gap-2 text-sm text-navy-200'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                Active
              </label>

              {formError && <p className='text-red-400 text-sm'>{formError}</p>}
            </div>

            {/* Buttons outside the scroll region, matching /admin/users. Inside it
                they would scroll out of reach on a short screen, leaving no way
                to submit the form. */}
            <div className='flex gap-3 mt-6 flex-shrink-0'>
              <button
                onClick={() => setIsModalOpen(false)}
                className='flex-1 px-4 py-3 rounded-lg bg-navy-700 hover:bg-navy-600 font-semibold text-sm transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className='flex-1 px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm transition-colors disabled:opacity-50'
              >
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}