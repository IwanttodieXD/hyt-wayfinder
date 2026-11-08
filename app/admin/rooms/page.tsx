'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { ROOM_PREFIX_FACTORY } from '@/lib/wayfinding';
import type { Room } from '@/store/roomsStore';
import { usePagination } from '@/hooks/usePagination';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  StatCard,
  TablePagination,
  buttonStyles,
} from '@/components/ui';

/** Floors the schema's CHECK constraint permits. */
const FLOORS = ['G', '2', '3', '4', 'Roof'] as const;

const INPUT =
  'w-full px-4 py-2.5 rounded-lg bg-navy-950/60 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors';

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
    roomNumber
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
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
      router.push('/verify');
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

  const activeCount = useMemo(() => rooms.filter((r) => r.isActive).length, [rooms]);

  const pagination = usePagination(rooms.length, 'rooms');
  const visibleRooms = rooms.slice(pagination.start, pagination.end);

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
    <AdminShell>
      <AdminPageHeader
        eyebrow='Manage'
        title='Manage Rooms'
        subtitle='Rooms and their door codes'
        actions={
          <button onClick={openCreate} className={buttonStyles('quiet', 'md')}>
            <i className='fa-solid fa-plus text-xs'></i>
            Add Room
          </button>
        }
      />

      {/* Summary tiles, matching the dashboard metrics. */}
      <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
        <StatCard
          label='Total rooms'
          value={rooms.length}
          hint='Including retired rooms'
          icon='fa-door-closed'
          tone='brand'
        />
        <StatCard
          label='Active'
          value={activeCount}
          hint='Scannable right now'
          icon='fa-circle-check'
          tone='success'
        />
        <StatCard
          label='Inactive'
          value={rooms.length - activeCount}
          hint='Codes do not resolve'
          icon='fa-circle-pause'
          tone='neutral'
        />
        <StatCard
          label='Floors in use'
          value={new Set(rooms.filter((r) => r.isActive).map((r) => r.floor)).size}
          hint='Across active rooms'
          icon='fa-layer-group'
          tone='info'
        />
      </div>

      <p className='mb-4 text-sm text-navy-400'>
        Rooms are never deleted &mdash; deactivating one keeps its visit history
        queryable.
      </p>

      {notice && (
        <Alert tone={notice.kind === 'success' ? 'success' : 'danger'} className='mb-4'>
          {notice.text}
        </Alert>
      )}

      <Card padded={false} className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-navy-900/30 border-b border-navy-800'>
              <tr>
                {['Room', 'Name', 'Floor', 'QR Code', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className='px-3 py-2 text-left text-xs font-semibold text-navy-300 uppercase tracking-wider'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room) => (
                <tr key={room.id} className='border-b border-navy-800/50 last:border-0'>
                  <td className='px-3 py-2 font-medium'>{room.roomNumber}</td>
                  <td className='px-3 py-2 text-navy-200'>{room.name}</td>
                  <td className='px-3 py-2 text-navy-300'>{room.floor}</td>
                  <td className='px-3 py-2'>
                    <code className='text-xs text-navy-400'>{room.qrValue}</code>
                  </td>
                  <td className='px-3 py-2'>
                    <Badge tone={room.isActive ? 'success' : 'neutral'} dot>
                      {room.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className='px-3 py-2'>
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
          <EmptyState
            icon='fa-door-closed'
            title='No rooms yet'
            description='Add one, or run the seed script.'
          />
        )}

        <TablePagination pagination={pagination} itemLabel='rooms' />
      </Card>
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
                    onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  QR code value
                </label>
                <input
                  className={INPUT}
                  value={form.qrValue}
                  onChange={(e) => setForm((f) => ({ ...f, qrValue: e.target.value }))}
                  placeholder='HYT-ROOM-01:ROOM-304'
                />
                <p className='text-navy-500 text-xs mt-1'>
                  Must be unique. Changing it after posters are printed means reprinting
                  them.
                </p>
              </div>

              <label className='flex items-center gap-2 text-sm text-navy-200'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
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
                className='flex-1 px-4 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold text-sm transition-colors disabled:opacity-50'
              >
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
