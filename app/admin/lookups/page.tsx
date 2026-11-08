'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { usePagination } from '@/hooks/usePagination';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  TablePagination,
  buttonStyles,
} from '@/components/ui';

/**
 * Form option management, admin-only.
 *
 * `purposes` and `courses` are the lists the register form and the admin
 * trainee form read from. They were previously editable only through SQL,
 * which meant adding a course or a visit reason required a developer. This
 * page gives them the same create/edit/retire treatment as rooms, without
 * turning them into free text. Visitor types stay in the data model, but their
 * tab is hidden because every new account is assigned Trainee automatically.
 *
 * Deletion is offered because these tables have no history of their own, but it
 * is guarded: a purpose already attached to attendance cannot be removed
 * (`ON DELETE RESTRICT`), so the page falls back to deactivation - the row stays
 * queryable for old records but disappears from every picker.
 */

type TabKey = 'purposes' | 'visitor_types' | 'courses';

interface LookupItem {
  id: string;
  label: string;
  isActive: boolean;
  isPrimary: boolean;
  roomId: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  name: string;
  isActive: boolean;
}

const TABS: Array<{
  key: TabKey;
  label: string;
  singular: string;
  icon: string;
  blurb: string;
}> = [
  {
    key: 'purposes',
    label: 'Purposes',
    singular: 'Purpose',
    icon: 'fa-clipboard-question',
    blurb: 'Why someone is visiting. Shown in the register and check-in forms.',
  },
  {
    key: 'visitor_types',
    label: 'Visitor Types',
    singular: 'Visitor Type',
    icon: 'fa-user-tag',
    blurb:
      'How a visitor relates to the building. Primary types appear as tiles on the register form.',
  },
  {
    key: 'courses',
    label: 'Courses',
    singular: 'Course',
    icon: 'fa-graduation-cap',
    blurb:
      'Courses a visitor can be enrolled in. A course may also assign its visitors to a room.',
  },
];

// Visitor types are no longer managed from the console: registration and the
// admin user form both assign Trainee automatically, so the tab would only
// invite edits that the rest of the app ignores. Kept in `TABS` so the lookup
// data and modal logic remain intact if it is ever surfaced again.
const VISIBLE_TABS = TABS.filter((item) => item.key !== 'visitor_types');

const INPUT =
  'w-full px-4 py-2.5 rounded-lg bg-navy-950/60 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors';

/**
 * Postgres reports a row blocked by RLS as "zero rows affected", not as an
 * error. Every write therefore asks for the row back (`.select('id')`) and
 * treats an empty result as a failure. Without this, a missing policy made the
 * page announce "Visitor Type deactivated" while the row stayed active.
 */
const WRITE_BLOCKED =
  'The database did not change the row. The admin write policy for lookups is missing - run supabase/migrations/20260101000000_full_setup.sql, then try again.';

type FormState = {
  label: string;
  isActive: boolean;
  isPrimary: boolean;
  roomId: string;
};

const EMPTY_FORM: FormState = {
  label: '',
  isActive: true,
  isPrimary: false,
  roomId: '',
};

function normaliseRow(row: any): LookupItem {
  return {
    id: row.id,
    label: row.label,
    isActive: row.is_active,
    isPrimary: row.is_primary ?? false,
    roomId: row.room_id ?? '',
  };
}

export default function LookupsPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const [tab, setTab] = useState<TabKey>('purposes');
  const [purposes, setPurposes] = useState<LookupItem[]>([]);
  const [visitorTypes, setVisitorTypes] = useState<LookupItem[]>([]);
  const [courses, setCourses] = useState<LookupItem[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<LookupItem | null>(null);
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

  // Always refetched rather than read from the shared store: this is an edit
  // surface, so it must show every row (including inactive ones), not the
  // cached active-only lists the register form uses.
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purposeResult, visitorResult, courseResult, roomResult] = await Promise.all([
        supabase.from('purposes').select('*').order('label'),
        supabase.from('visitor_types').select('*').order('label'),
        supabase.from('courses').select('*').order('label'),
        supabase
          .from('rooms')
          .select('id, room_number, name, is_active')
          .order('room_number'),
      ]);

      const firstError =
        purposeResult.error ??
        visitorResult.error ??
        courseResult.error ??
        roomResult.error;

      if (firstError) {
        setNotice({ kind: 'error', text: firstError.message });
        return;
      }

      setPurposes((purposeResult.data ?? []).map(normaliseRow));
      setVisitorTypes((visitorResult.data ?? []).map(normaliseRow));
      setCourses((courseResult.data ?? []).map(normaliseRow));
      setRooms(
        (roomResult.data ?? []).map((row: any) => ({
          id: row.id,
          roomNumber: row.room_number,
          name: row.name,
          isActive: row.is_active,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      loadData();
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const tabConfig = useMemo(() => TABS.find((t) => t.key === tab) ?? TABS[0], [tab]);

  const items =
    tab === 'purposes' ? purposes : tab === 'visitor_types' ? visitorTypes : courses;

  const roomsById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);

  const pagination = usePagination(items.length, tab);
  const visibleItems = items.slice(pagination.start, pagination.end);

  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (target: LookupItem) => {
    setEditing(target);
    setForm({
      label: target.label,
      isActive: target.isActive,
      isPrimary: target.isPrimary,
      roomId: target.roomId,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);

    const label = form.label.trim();
    if (!label) {
      setFormError(`${tabConfig.singular} name is required.`);
      return;
    }

    const payload: Record<string, unknown> = {
      label,
      is_active: form.isActive,
    };

    if (tab === 'visitor_types') {
      payload.is_primary = form.isPrimary;
    }

    if (tab === 'courses') {
      payload.room_id = form.roomId || null;
    }

    setIsSaving(true);
    try {
      const query = editing
        ? supabase.from(tab).update(payload).eq('id', editing.id)
        : supabase.from(tab).insert(payload);

      const { data, error } = await query.select('id');

      if (error) {
        setFormError(error.message);
        return;
      }
      if (!data || data.length === 0) {
        setFormError(WRITE_BLOCKED);
        return;
      }

      setIsModalOpen(false);
      setNotice({
        kind: 'success',
        text: editing ? `${tabConfig.singular} updated.` : `${tabConfig.singular} added.`,
      });
      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSaving(false);
    }
  };

  /** Retire/reactivate so a lookup already used by old records is never hidden. */
  const toggleActive = async (item: LookupItem) => {
    const { data, error } = await supabase
      .from(tab)
      .update({ is_active: !item.isActive })
      .eq('id', item.id)
      .select('id');

    if (error) {
      setNotice({ kind: 'error', text: error.message });
      return;
    }
    if (!data || data.length === 0) {
      setNotice({ kind: 'error', text: WRITE_BLOCKED });
      return;
    }

    setNotice({
      kind: 'success',
      text: item.isActive
        ? `${item.label} deactivated. It no longer appears in the pickers.`
        : `${item.label} reactivated.`,
    });
    await loadData();
  };

  /**
   * Delete, with a deactivation fallback.
   *
   * Purposes referenced by attendance are protected by `ON DELETE RESTRICT`, so
   * Postgres answers with foreign-key violation 23503. That is not a failure to
   * report and walk away from: the correct outcome is to retire the row, which
   * keeps the history readable. Offer that as a second confirmation rather than
   * silently deactivating something the admin asked to delete.
   */
  const deleteItem = async (item: LookupItem) => {
    const consequence =
      tab === 'purposes'
        ? 'If it is already used by existing visit records it will be deactivated instead.'
        : tab === 'visitor_types'
          ? 'Visitors currently marked with this type will be left without one.'
          : 'Visitors currently enrolled in this course will be left without one.';

    if (!window.confirm(`Delete "${item.label}" permanently?\n\n${consequence}`)) {
      return;
    }

    const { data, error } = await supabase
      .from(tab)
      .delete()
      .eq('id', item.id)
      .select('id');

    if (!error) {
      if (!data || data.length === 0) {
        setNotice({ kind: 'error', text: WRITE_BLOCKED });
        return;
      }
      setNotice({ kind: 'success', text: `${item.label} deleted.` });
      await loadData();
      return;
    }

    if (error.code === '23503') {
      const shouldDeactivate = window.confirm(
        `"${item.label}" is referenced by existing records, so it cannot be deleted.\n\nDeactivate it instead? It will stay on old records but disappear from the pickers.`
      );

      if (!shouldDeactivate) {
        setNotice({
          kind: 'error',
          text: `"${item.label}" was not deleted. Deactivate it to keep it out of the pickers.`,
        });
        return;
      }

      const { data: deactivated, error: deactivateError } = await supabase
        .from(tab)
        .update({ is_active: false })
        .eq('id', item.id)
        .select('id');

      if (deactivateError) {
        setNotice({ kind: 'error', text: deactivateError.message });
        return;
      }
      if (!deactivated || deactivated.length === 0) {
        setNotice({ kind: 'error', text: WRITE_BLOCKED });
        return;
      }

      setNotice({
        kind: 'success',
        text: `${item.label} could not be deleted, so it was deactivated instead.`,
      });
      await loadData();
      return;
    }

    setNotice({ kind: 'error', text: error.message });
  };

  const columns =
    tab === 'visitor_types'
      ? ['Name', 'Primary', 'Status', 'Actions']
      : tab === 'courses'
        ? ['Name', 'Room', 'Status', 'Actions']
        : ['Name', 'Status', 'Actions'];

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow='Manage'
        title='Manage Form Options'
        subtitle='Purposes and courses used across forms'
        actions={
          <button onClick={openCreate} className={buttonStyles('quiet', 'md')}>
            <i className='fa-solid fa-plus text-xs'></i>
            Add {tabConfig.singular}
          </button>
        }
      />

      <Card padded={false} className='mb-4 p-2'>
        <div className='flex flex-wrap gap-2'>
          {VISIBLE_TABS.map((item) => {
            const count =
              item.key === 'purposes'
                ? purposes.length
                : item.key === 'visitor_types'
                  ? visitorTypes.length
                  : courses.length;
            const selected = tab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex-1 min-w-[160px] px-4 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 border-2 ${
                  selected
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                    : 'bg-navy-900/50 text-navy-300 border-transparent hover:border-navy-600'
                }`}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    selected
                      ? 'bg-yellow-500/20 text-yellow-200'
                      : 'bg-navy-700 text-navy-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <p className='mb-4 text-sm text-navy-400'>{tabConfig.blurb}</p>

      {notice && (
        <Alert tone={notice.kind === 'success' ? 'success' : 'danger'} className='mb-4'>
          {notice.text}
        </Alert>
      )}

      <Card padded={false} className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-navy-900/50 border-b border-navy-800'>
              <tr>
                {columns.map((heading) => (
                  <th
                    key={heading}
                    className={`px-3 py-2 text-left text-xs font-semibold text-navy-400 uppercase tracking-wider ${
                      // Let the name absorb the spare width so the status and
                      // action columns stay as narrow as their contents.
                      heading === 'Name'
                        ? 'w-full'
                        : 'w-px whitespace-nowrap'
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-navy-800'>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className='transition-colors hover:bg-blue-500/20'
                >
                  <td className='px-3 py-2'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-500/20'>
                        <i className={`fa-solid ${tabConfig.icon} text-sm text-yellow-400`}></i>
                      </div>
                      <p className='text-sm font-semibold text-white'>{item.label}</p>
                    </div>
                  </td>

                  {tab === 'visitor_types' && (
                    <td className='px-3 py-2 text-navy-300 whitespace-nowrap'>
                      {item.isPrimary ? (
                        <Badge tone='brand'>Primary</Badge>
                      ) : (
                        <span className='text-xs text-navy-500'>-</span>
                      )}
                    </td>
                  )}

                  {tab === 'courses' && (
                    <td className='px-3 py-2 text-navy-300 whitespace-nowrap'>
                      {item.roomId
                        ? (roomsById.get(item.roomId)?.roomNumber ?? 'Unknown')
                        : 'No room assigned'}
                    </td>
                  )}

                  <td className='px-3 py-2 whitespace-nowrap'>
                    <Badge tone={item.isActive ? 'success' : 'neutral'} dot>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => openEdit(item)}
                        className='px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white text-xs font-semibold transition-colors'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(item)}
                        className='px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white text-xs font-semibold transition-colors'
                      >
                        {item.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className='px-3 py-1.5 rounded-lg bg-red-600 border border-red-500/30 text-paper hover:bg-red-700 text-xs font-semibold transition-colors'
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={tabConfig.icon}
            title={`No ${tabConfig.label.toLowerCase()} yet`}
            description='Add one to make it selectable in the forms.'
          />
        )}

        {isLoading && (
          <div className='py-12 text-center text-sm text-navy-400'>
            Loading form options...
          </div>
        )}

        <TablePagination pagination={pagination} itemLabel={tabConfig.label.toLowerCase()} />
      </Card>

      {isModalOpen && (
        <div
          className='fixed inset-0 z-50 bg-navy-950/80 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto'
          role='dialog'
          aria-modal='true'
        >
          <div className='glass-panel border-navy-700 sm:rounded-lg p-6 w-full sm:max-w-lg my-0 sm:my-8 max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)] flex flex-col'>
            <h2 className='text-lg font-bold mb-4 flex-shrink-0'>
              {editing ? `Edit ${tabConfig.singular}` : `Add ${tabConfig.singular}`}
            </h2>

            <div className='space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain pr-1'>
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Name
                </label>
                <input
                  className={INPUT}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={`e.g. ${
                    tab === 'purposes'
                      ? 'Interview'
                      : tab === 'visitor_types'
                        ? 'Trainee'
                        : 'Barista NC II'
                  }`}
                  autoFocus
                />
                <p className='text-navy-500 text-xs mt-1'>
                  Must be unique. This is the label shown in the forms.
                </p>
              </div>

              {tab === 'visitor_types' && (
                <div>
                  <label className='flex items-start gap-2 text-sm text-navy-200'>
                    <input
                      type='checkbox'
                      className='mt-1'
                      checked={form.isPrimary}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isPrimary: e.target.checked }))
                      }
                    />
                    <span>
                      Primary type
                      <span className='block text-navy-500 text-xs mt-0.5'>
                        Primary types are surfaced as their own tiles on the register form
                        and admin filter.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {tab === 'courses' && (
                <div>
                  <label className='block text-sm font-medium text-navy-200 mb-2'>
                    Assigned room
                  </label>
                  <select
                    className={INPUT}
                    value={form.roomId}
                    onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  >
                    <option value='' className='bg-navy-900'>
                      No room (no auto-assignment)
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id} className='bg-navy-900'>
                        {room.roomNumber}
                        {room.name !== room.roomNumber ? ` - ${room.name}` : ''}
                        {room.isActive ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </select>
                  <p className='text-navy-500 text-xs mt-1'>
                    A visitor enrolled in this course is assigned here unless the desk
                    chooses a different room.
                  </p>
                </div>
              )}

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
                {isSaving
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : `Add ${tabConfig.singular}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
