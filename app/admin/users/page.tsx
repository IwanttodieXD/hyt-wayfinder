'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRoomsStore } from '@/store/roomsStore';
import { tidyPhone, formatPhone, sanitisePhone, isAllowedPhoneKey } from '@/lib/phone';
import {
  useUsersStore,
  isPassExpired,
  renewedPassValidUntil,
  type ManagedUser,
} from '@/store/usersStore';
import { usePagination } from '@/hooks/usePagination';
import { isTraineeType } from '@/lib/trainee';
import { composeFullName } from '@/lib/fullName';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import {
  Alert,
  Card,
  EmptyState,
  StatCard,
  TablePagination,
  buttonStyles,
} from '@/components/ui';

const INPUT =
  'w-full px-4 py-2.5 rounded-lg bg-navy-950/60 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors';

/** Compact pill used by both filter groups. */
const filterChipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
    active
      ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200'
      : 'border-navy-700 bg-navy-950/40 text-navy-300 hover:border-navy-500 hover:bg-navy-800/70 hover:text-white'
  }`;

/** The count inside a filter pill, quieter than the label. */
const filterCountClass = (active: boolean) =>
  `rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums ${
    active ? 'bg-yellow-500/20 text-yellow-200' : 'bg-navy-800 text-navy-400'
  }`;

type FormState = {
  firstName: string;
  middleInitial: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  /** Room id (rooms.id), or '' for none. Seeds the first attendance record. */
  pendingRoomId: string;
  /** Purpose id (purposes.id), or '' for none. */
  pendingPurposeId: string;
  /** Course id (courses.id), or '' for none. Required when creating. */
  courseId: string;
  /** `yyyy-mm-dd`, the format an `<input type="date">` produces. */
  validUntil: string;
};

const EMPTY_FORM: FormState = {
  firstName: '',
  middleInitial: '',
  lastName: '',
  email: '',
  company: '',
  phone: '',
  pendingRoomId: '',
  pendingPurposeId: '',
  courseId: '',
  validUntil: '',
};

/** `Date` -> `yyyy-mm-dd` for a date input, in local time (not UTC). */
function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * "Joined" as a plain date. The previous relative format ("2 days ago") drifts
 * out of date the moment the page sits open, which matters on a registration
 * desk where the list is left up all day.
 */
const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const {
    fetchVisitorTypes,
    getActiveVisitorTypes,
    fetchRooms,
    getActiveRooms,
    fetchPurposes,
    getActivePurposes,
    fetchCourses,
    getActiveCourses,
    getRoomForCourse,
  } = useRoomsStore();
  const {
    users,
    archivedUsers,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    archiveUser,
    restoreUser,
    renewPass,
  } = useUsersStore();

  const [searchTerm, setSearchTerm] = useState('');
  // Course is always shown on this page because every row is a trainee.
  const [courseFilter, setCourseFilter] = useState('all');
  // Active / valid / expired / archived are mutually exclusive views of the
  // same list. Active is the full unarchived set; valid and expired are slices
  // of it.
  const [showArchived, setShowArchived] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showValid, setShowValid] = useState(false);
  // Newest account first by default, matching the store's initial order and
  // the attendance log's default. Clicking Joined flips to oldest first.
  const [joinedSort, setJoinedSort] = useState<'latest' | 'oldest'>('latest');

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
  // Id of the row being renewed, or 'all' while the bulk action runs.
  const [renewing, setRenewing] = useState<string | null>(null);

  // Whether the admin picked a room by hand in the create modal. Once they
  // have, the course no longer overwrites it.
  const roomTouched = useRef(false);

  const visitorTypes = getActiveVisitorTypes();
  // Add User creates a trainee. The visitor type is no longer chosen by hand;
  // the real lookup UUID is resolved once the table loads. Fallback ids are
  // ignored because they are not valid foreign keys.
  const traineeType = visitorTypes.find(
    (type) => isTraineeType(type.label) && !type.id.startsWith('fallback-')
  );
  // Rooms and purposes back the assigned-room and purpose pickers, which mirror
  // the register form. Both are ordered by the store (rooms by floor).
  const rooms = getActiveRooms();
  const purposes = getActivePurposes();
  const courses = getActiveCourses();

  // This page manages trainees only. The visitor type is joined from the
  // profile, so non-trainees (and legacy rows with no classification) are
  // scoped out before search/course/archived filtering.
  const traineeUsers = useMemo(
    () => users.filter((u) => isTraineeType(u.visitorType)),
    [users]
  );
  const traineeArchivedUsers = useMemo(
    () => archivedUsers.filter((u) => isTraineeType(u.visitorType)),
    [archivedUsers]
  );
  const expiredUsers = useMemo(
    () => traineeUsers.filter((u) => isPassExpired(u)),
    [traineeUsers]
  );
  const expiredCount = expiredUsers.length;
  // A "valid" pass is the complement among active trainees: not expired,
  // including passes with no expiry date at all.
  const validUsers = useMemo(
    () => traineeUsers.filter((u) => !isPassExpired(u)),
    [traineeUsers]
  );
  const validCount = validUsers.length;

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/verify');
    } else {
      fetchUsers();
      fetchVisitorTypes();
      fetchRooms();
      fetchPurposes();
      fetchCourses();
    }
  }, [
    isAuthenticated,
    currentUser,
    router,
    fetchUsers,
    fetchVisitorTypes,
    fetchRooms,
    fetchPurposes,
    fetchCourses,
  ]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Auto-assign the room from the chosen course, but ONLY when creating. On
  // edit the room is left exactly as stored: auto-filling there would write a
  // pending_room_id for existing users, which is a backfill this feature
  // deliberately avoids (existing users derive their room at runtime instead).
  useEffect(() => {
    if (editing || roomTouched.current) return;
    const mapped = getRoomForCourse(form.courseId);
    const next = mapped && rooms.some((r) => r.id === mapped.id) ? mapped.id : '';
    setForm((f) => (f.pendingRoomId === next ? f : { ...f, pendingRoomId: next }));
  }, [editing, form.courseId, rooms, getRoomForCourse]);

  // Archived and expired rows are searched with the same filter as the active
  // list so the views cannot drift apart. Expired is a slice of the active list,
  // not a separate bucket: an archived pass is already out of the way.
  const source = showArchived
    ? traineeArchivedUsers
    : showExpired
      ? expiredUsers
      : showValid
        ? validUsers
        : traineeUsers;

  // Course tally for the filter buttons, counted from every loaded row in the
  // current active/archived view.
  const courseCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const u of source) {
      if (!u.courseId) continue;
      counts.set(u.courseId, (counts.get(u.courseId) ?? 0) + 1);
    }

    return courses
      .map((course) => ({
        id: course.id,
        label: course.label,
        count: counts.get(course.id) ?? 0,
      }))
      .filter((course) => course.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [source, courses]);

  // Number of people the course filter is choosing between.
  const courseScopeCount = source.length;

  const filteredUsers = useMemo(
    () =>
      source.filter((u) => {
        const term = searchTerm.trim().toLowerCase();
        // Room and purpose are searchable by their display text, not their ids,
        // so "Room 304" or "Orientation" finds the person. Resolved through the
        // same lists the table renders from.
        const room = rooms.find((r) => r.id === u.pendingRoomId);
        const purpose = purposes.find((p) => p.id === u.pendingPurposeId);

        const matchesSearch =
          !term ||
          u.name.toLowerCase().includes(term) ||
          // Nullable in the current schema: roster rows with no address
          // have NULL here. Calling .toLowerCase() unguarded throws and takes the
          // ENTIRE list down, not just this row - one keystroke in the search box
          // would blank the admin page.
          (u.email ?? '').toLowerCase().includes(term) ||
          (u.company ?? '').toLowerCase().includes(term) ||
          // Still searched even though it is no longer editable: legacy rows may
          // carry a host name, and staff looking someone up should still find them.
          (u.hostName ?? '').toLowerCase().includes(term) ||
          (room?.name ?? '').toLowerCase().includes(term) ||
          (room?.roomNumber ?? '').toLowerCase().includes(term) ||
          (purpose?.label ?? '').toLowerCase().includes(term);

        // Course is always shown here: every row in scope is a trainee, and a
        // trainee is enrolled in a course.
        const matchesCourse = courseFilter === 'all' || u.courseId === courseFilter;

        return matchesSearch && matchesCourse;
      }),
    [source, searchTerm, courseFilter, rooms, purposes]
  );

  // Sorting runs on the full filtered list, before pagination, so page one is
  // always the true latest (or oldest) result rather than the latest of a page.
  const sortedUsers = useMemo(() => {
    const direction = joinedSort === 'latest' ? -1 : 1;
    return [...filteredUsers].sort(
      (a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * direction
    );
  }, [filteredUsers, joinedSort]);

  const pagination = usePagination(
    sortedUsers.length,
    [
      searchTerm,
      courseFilter,
      showArchived,
      showExpired,
      showValid,
      joinedSort,
    ].join('|')
  );
  const visibleUsers = sortedUsers.slice(pagination.start, pagination.end);

  const toggleJoinedSort = () =>
    setJoinedSort((current) => (current === 'latest' ? 'oldest' : 'latest'));

  if (!isAuthenticated || currentUser?.role !== 'admin') {
    return null;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    // A fresh create: let the course drive the room again.
    roomTouched.current = false;
    setIsModalOpen(true);
  };

  const openEdit = (target: ManagedUser) => {
    setEditing(target);
    setForm({
      firstName: target.firstName,
      middleInitial: target.middleInitial ?? '',
      lastName: target.lastName,
      // Nullable in the current schema; the form's own field stays a string
      // because an admin editing this person is expected to supply an address.
      email: target.email ?? '',
      company: target.company ?? '',
      phone: target.phone ?? '',
      pendingRoomId: target.pendingRoomId ?? '',
      pendingPurposeId: target.pendingPurposeId ?? '',
      courseId: target.courseId ?? '',
      validUntil: toDateInputValue(target.validUntil),
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

    if (!form.firstName.trim() || !form.lastName.trim()) {
      return setFormError('First name and last name are required.');
    }
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!editing && !traineeType) {
      return setFormError(
        'Trainee registration is still loading. Please wait a moment and try again.'
      );
    }
    if (!editing && !form.courseId) {
      return setFormError('Please select a course.');
    }
    if (!form.pendingPurposeId) {
      return setFormError('Please select a purpose.');
    }

    // For the confirmation notice only. The server composes its own display
    // name from the same parts, so this is never the source of truth.
    const fullName = composeFullName(form.firstName, form.middleInitial, form.lastName);

    setIsSaving(true);

    // Shared between create and edit so the two paths cannot drift on which
    // fields are sent. Empty strings are meaningful: the server turns them into
    // SQL NULL, which is how a field gets cleared. The visitor type is absent on
    // purpose: edits leave the existing classification alone.
    const profileFields = () => ({
      company: form.company,
      phone: form.phone,
      pendingRoomId: form.pendingRoomId,
      pendingPurposeId: form.pendingPurposeId,
      courseId: form.courseId,
      validUntil: form.validUntil,
    });

    if (editing) {
      const { success, error } = await updateUser(editing.id, {
        firstName: form.firstName,
        middleInitial: form.middleInitial,
        lastName: form.lastName,
        email: form.email.trim(),
        ...profileFields(),
      });
      setIsSaving(false);
      if (!success) return setFormError(error || 'Could not save changes.');
      closeModal();
      setNotice({ kind: 'success', text: `Updated ${fullName}.` });
      return;
    }

    const { success, error } = await createUser({
      firstName: form.firstName,
      middleInitial: form.middleInitial,
      lastName: form.lastName,
      email: form.email.trim(),
      // The password field was removed from this form: every admin-created
      // account uses this shared default, which the person can reset later.
      password: 'pass123',
      visitorTypeId: traineeType?.id,
      ...profileFields(),
    });
    setIsSaving(false);
    if (!success) return setFormError(error || 'Could not create the user.');
    closeModal();
    setNotice({ kind: 'success', text: `Created ${fullName}.` });
  };

  const confirmArchive = async () => {
    if (!deleteTarget) return;
    const { success, error } = await archiveUser(deleteTarget.id);
    const name = deleteTarget.name;
    setDeleteTarget(null);
    setNotice(
      success
        ? {
            kind: 'success',
            text: `Archived ${name}. Their login is revoked and their visit history is kept.`,
          }
        : { kind: 'error', text: error || 'Could not archive the user.' }
    );
  };

  const confirmRestore = async (target: ManagedUser) => {
    const { success, error } = await restoreUser(target.id);
    setNotice(
      success
        ? { kind: 'success', text: `Restored ${target.name}.` }
        : { kind: 'error', text: error || 'Could not restore the user.' }
    );
  };

  const handleRenew = async (target: ManagedUser) => {
    setRenewing(target.id);
    const validUntil = renewedPassValidUntil();
    const { success, error } = await renewPass(target.id, validUntil);
    setRenewing(null);

    setNotice(
      success
        ? {
            kind: 'success',
            text: `Renewed ${target.name}'s pass until ${formatDate(new Date(validUntil))}.`,
          }
        : { kind: 'error', text: error || 'Could not renew the pass.' }
    );
  };

  const handleRenewAll = async () => {
    if (expiredUsers.length === 0) return;

    setRenewing('all');
    const validUntil = renewedPassValidUntil();
    let renewed = 0;
    let failed = 0;

    // Sequential rather than a burst of parallel writes: the route talks to
    // Supabase Auth for some paths and a long list should not flood it.
    for (const target of expiredUsers) {
      const result = await renewPass(target.id, validUntil);
      if (result.success) renewed += 1;
      else failed += 1;
    }

    setRenewing(null);
    setNotice(
      failed === 0
        ? {
            kind: 'success',
            text: `Renewed ${renewed} expired ${renewed === 1 ? 'pass' : 'passes'} until ${formatDate(new Date(validUntil))}.`,
          }
        : {
            kind: 'error',
            text: `Renewed ${renewed}, but ${failed} could not be renewed. Try again for the remaining rows.`,
          }
    );
  };

  return (
    <>
      <AdminShell>
        <AdminPageHeader
          eyebrow='Manage'
          title='Trainee Management'
          subtitle='Manage trainee accounts'
          actions={
            <>
              <Link href='/admin/lookups' className={buttonStyles('secondary', 'md')}>
                <i className='fa-solid fa-list-check text-xs'></i>
                Manage Form Options
              </Link>
              <button onClick={openCreate} className={buttonStyles('primary', 'md')}>
                <i className='fa-solid fa-user-plus text-xs'></i>
                Add Trainee
              </button>
            </>
          }
        />

        {/* Total trainees. Given the same prominence as on the dashboard,
            since it is the headline number for this page. */}
        <Card className='mb-3 border-yellow-500/30'>
          <div className='flex items-center gap-5'>
            <div className='flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500/15'>
              <i className='fa-solid fa-users text-3xl text-yellow-400'></i>
            </div>
            <div className='min-w-0'>
              <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-300'>
                Total Trainees
              </p>
              <p className='text-5xl font-bold leading-none tabular-nums text-white'>
                {traineeUsers.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Headline counts. "Expired" is surfaced because an out-of-date pass
            is the thing most likely to go unnoticed until it matters. */}
        <div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-3'>
          <StatCard
            label='Active trainees'
            value={traineeUsers.length}
            hint='Not archived'
            icon='fa-user-check'
            tone='brand'
          />
          <StatCard
            label='Archived trainees'
            value={traineeArchivedUsers.length}
            hint='History kept'
            icon='fa-box-archive'
            tone='info'
          />
          <StatCard
            label='Expired passes'
            value={expiredCount}
            hint='Need renewing'
            icon='fa-triangle-exclamation'
            tone={expiredCount > 0 ? 'danger' : 'neutral'}
            action={
              expiredCount > 0 ? (
                <button
                  type='button'
                  onClick={handleRenewAll}
                  disabled={renewing !== null}
                  className='inline-flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/15 px-3 py-2 text-xs font-semibold text-yellow-200 transition-colors hover:bg-yellow-500/25 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <i
                    className={`fa-solid ${
                      renewing === 'all' ? 'fa-spinner fa-spin' : 'fa-rotate'
                    }`}
                  ></i>
                  {renewing === 'all' ? 'Renewing…' : 'Renew all'}
                </button>
              ) : undefined
            }
          />
        </div>

        {notice && (
          <Alert tone={notice.kind === 'success' ? 'success' : 'danger'} className='mb-4'>
            {notice.text}
          </Alert>
        )}

        {/* Search - its own panel above the filters so the input spans the
              full width instead of sharing a column with the filter buttons. */}
        <Card className='mb-4'>
          <label className='mb-2 block text-sm font-medium text-navy-200'>Search</label>
          <div className='relative'>
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4'>
              <i className='fa-solid fa-magnifying-glass text-navy-500'></i>
            </div>
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='Search trainee name, email, room, or purpose...'
              className={`${INPUT} pl-12`}
            />
          </div>
        </Card>

        {/* Filters */}
        <Card className='mb-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Course. This page only manages trainees, so the filter is
                  always present. */}
            <div>
              <label className='mb-2 block text-xs font-semibold uppercase tracking-wider text-navy-400'>
                Course
              </label>
              <div className='flex flex-wrap gap-1.5'>
                <button
                  onClick={() => setCourseFilter('all')}
                  className={filterChipClass(courseFilter === 'all')}
                >
                  All
                  <span className={filterCountClass(courseFilter === 'all')}>
                    {courseScopeCount}
                  </span>
                </button>
                {courseCounts.map(({ id, label, count }) => {
                  const active = courseFilter === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setCourseFilter(id)}
                      className={filterChipClass(active)}
                    >
                      {label}
                      <span className={filterCountClass(active)}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className='mb-2 block text-xs font-semibold uppercase tracking-wider text-navy-400'>
                Show
              </label>
              <div className='flex flex-wrap gap-1.5'>
                <button
                  onClick={() => {
                    setShowArchived(false);
                    setShowExpired(false);
                    setShowValid(false);
                  }}
                  className={filterChipClass(
                    !showArchived && !showExpired && !showValid
                  )}
                >
                  Active
                  <span
                    className={filterCountClass(
                      !showArchived && !showExpired && !showValid
                    )}
                  >
                    {traineeUsers.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowArchived(false);
                    setShowExpired(false);
                    setShowValid(true);
                  }}
                  className={filterChipClass(showValid)}
                >
                  Valid
                  <span className={filterCountClass(showValid)}>{validCount}</span>
                </button>
                <button
                  onClick={() => {
                    setShowArchived(false);
                    setShowExpired(true);
                    setShowValid(false);
                  }}
                  className={filterChipClass(showExpired)}
                >
                  Expired
                  <span className={filterCountClass(showExpired)}>
                    {expiredCount}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowArchived(true);
                    setShowExpired(false);
                    setShowValid(false);
                  }}
                  className={filterChipClass(showArchived)}
                >
                  Archived
                  <span className={filterCountClass(showArchived)}>
                    {traineeArchivedUsers.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card padded={false} className='overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full lg:table-fixed'>
              <thead className='bg-navy-900/50 border-b border-navy-800'>
                <tr>
                  {[
                    { label: 'Trainee', width: 'lg:w-[24%]' },
                    { label: 'Course', width: 'lg:w-[13%]' },
                    { label: 'Assigned / Purpose', width: 'lg:w-[21%]' },
                    { label: 'Pass', width: 'lg:w-[12%]' },
                    { label: 'Joined', width: 'lg:w-[11%]' },
                    { label: 'Actions', width: 'lg:w-[19%]' },
                  ].map(({ label, width }) => (
                    <th
                      key={label}
                      className={`${width} px-3 py-2 text-left text-xs font-semibold text-navy-400 uppercase tracking-wider`}
                    >
                      {label === 'Joined' ? (
                        <button
                          type='button'
                          onClick={toggleJoinedSort}
                          className='flex items-center gap-2 uppercase tracking-wider transition-colors hover:text-white'
                          title={
                            joinedSort === 'latest'
                              ? 'Sorted latest first — click for oldest'
                              : 'Sorted oldest first — click for latest'
                          }
                        >
                          <span>{label}</span>
                          <i
                            className={`fa-solid text-[10px] ${
                              joinedSort === 'latest'
                                ? 'fa-arrow-down text-yellow-400'
                                : 'fa-arrow-up text-yellow-400'
                            }`}
                          ></i>
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-navy-800'>
                {visibleUsers.map((u) => {
                  const expired = isPassExpired(u);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        expired
                          ? 'row-expired hover:bg-blue-500/20'
                          : // Brighter blue hover on valid rows so they
                            // stand out against the dimmed expired ones.
                            'hover:bg-blue-500/20'
                      }`}
                    >
                      {/* Expired rows are dimmed as a unit via the row
                            background and dimmed text on the info cells, NOT
                            via `opacity` on the <tr>. CSS opacity stacks, so a
                            child's `opacity:1` cannot undo a parent's
                            `opacity:0.6` — using opacity on the row would dim
                            the action buttons too, with no way to un-dim them.
                            The buttons below keep their own colours and stay
                            full-bright on the dimmed row. */}
                      <td className={`px-3 py-2 ${expired ? 'row-expired-cell' : ''}`}>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-500/20'>
                            <i className='fa-solid fa-user text-sm text-yellow-400'></i>
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-semibold text-white'>
                              {u.name}
                            </p>
                            <p className='text-navy-500 text-xs truncate'>
                              {/* 'No email on file' rather than a blank line: a
                                silent gap reads as a rendering bug, and this is
                                the registrar's cue to collect an address. */}
                              {u.email ?? 'No email on file'}
                            </p>
                            {u.phone && (
                              // Tidied on display as well, so rows typed before
                              // this existed read the same as new ones. The stored
                              // value is never rewritten by this.
                              <p className='text-navy-500 text-xs truncate'>
                                {tidyPhone(u.phone)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-3 py-2 whitespace-nowrap ${expired ? 'row-expired-cell' : ''}`}
                      >
                        {(() => {
                          const course = courses.find((c) => c.id === u.courseId);
                          return course ? (
                            <span className='inline-block max-w-full truncate rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 align-bottom text-xs font-medium text-yellow-300'>
                              {course.label}
                            </span>
                          ) : (
                            <span className='text-navy-500 text-xs'>&mdash;</span>
                          );
                        })()}
                      </td>
                      {/* What this person is expected to be here for. Room and purpose are the two
                            things staff now assign, so they are what the list shows
                            in the primary slot; company is secondary context.
                            Resolved from the rooms/purposes lists already loaded on
                            this page. */}
                      <td className={`px-3 py-2 text-sm ${expired ? 'row-expired-cell' : ''}`}>
                        {(() => {
                          const room = rooms.find((r) => r.id === u.pendingRoomId);
                          const purpose = purposes.find(
                            (p) => p.id === u.pendingPurposeId
                          );

                          if (!room && !purpose) {
                            return <p className='text-navy-500'>-</p>;
                          }

                          return (
                            <>
                              {room && (
                                <p className='truncate text-white'>
                                  {room.name}
                                  <span className='text-navy-500 text-xs'>
                                    {' '}
                                    {room.roomNumber}
                                  </span>
                                </p>
                              )}
                              {purpose && (
                                <p className='truncate text-navy-400 text-xs'>
                                  {purpose.label}
                                </p>
                              )}
                            </>
                          );
                        })()}
                        {u.company && (
                          <p className='text-navy-500 text-xs truncate'>{u.company}</p>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-sm ${expired ? 'row-expired-cell' : ''}`}
                      >
                        {u.validUntil ? (
                          <span className={expired ? 'text-red-400' : 'text-navy-300'}>
                            {expired ? 'Expired ' : ''}
                            {formatDate(u.validUntil)}
                          </span>
                        ) : (
                          <span className='text-navy-500'>No expiry</span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-navy-300 text-sm ${expired ? 'row-expired-cell' : ''}`}
                      >
                        {formatDate(u.createdAt)}
                      </td>
                      {/* Actions cell is deliberately NOT dimmed. The buttons
                            keep their own colours so they stay readable and
                            clickable on the dimmed row. */}
                      <td className='px-3 py-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <button
                            onClick={() => openEdit(u)}
                            className='px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 text-navy-200 hover:bg-navy-700 hover:text-white text-xs font-semibold transition-colors'
                          >
                            Edit
                          </button>
                          {!showArchived && expired && (
                            <button
                              onClick={() => handleRenew(u)}
                              disabled={renewing !== null}
                              title='Extend this pass by 30 days'
                              className='inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/15 px-3 py-1.5 text-xs font-semibold text-yellow-200 transition-colors hover:bg-yellow-500/25 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                              <i
                                className={`fa-solid ${
                                  renewing === u.id
                                    ? 'fa-spinner fa-spin'
                                    : 'fa-rotate'
                                }`}
                              ></i>
                              Renew
                            </button>
                          )}
                          {showArchived ? (
                            <button
                              onClick={() => confirmRestore(u)}
                              className='px-3 py-1.5 rounded-lg bg-green-600 border border-green-500/30 text-paper hover:bg-green-700 text-xs font-semibold transition-colors'
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              title='Revoke access and archive this visitor'
                              className='px-3 py-1.5 rounded-lg bg-red-600 border border-red-500/30 text-paper hover:bg-red-700 text-xs font-semibold transition-colors'
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!isLoading && filteredUsers.length === 0 && (
              <EmptyState
                icon='fa-users'
                title={
                  showArchived
                    ? 'No archived trainees'
                    : showExpired
                      ? 'No expired passes'
                      : showValid
                        ? 'No valid passes'
                        : 'No trainees found'
                }
                description={
                  !showArchived && !showExpired && !showValid && traineeUsers.length === 0
                    ? 'Add your first trainee to get started'
                    : showExpired && expiredCount === 0
                      ? 'Every active pass is still valid.'
                      : showValid && validCount === 0
                        ? 'Every active trainee currently has an expired pass.'
                        : undefined
                }
              />
            )}

            {isLoading && traineeUsers.length === 0 && (
              <div className='py-12 text-center'>
                <i className='fa-solid fa-spinner fa-spin text-2xl text-yellow-400'></i>
                <p className='mt-2 text-navy-300'>Loading trainees...</p>
              </div>
            )}
          </div>

          <TablePagination pagination={pagination} itemLabel='trainees' />
        </Card>
      </AdminShell>

      {isModalOpen && (
        // `items-start` on small screens so a long form scrolls from the top
        // instead of being vertically centred and clipped at both ends.
        <div className='fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto'>
          <div
            className='fixed inset-0 bg-black/60'
            onClick={closeModal}
            aria-hidden='true'
          ></div>
          {/* max-h + internal scroll. The form grew from 3 fields to 10, which
              no longer fits a viewport, and a modal that runs off the bottom of
              the screen cannot be submitted from. `sm:my-8` gives the scroll
              container breathing room once the modal is height-capped. */}
          <div className='relative w-full sm:max-w-md bg-navy-900 border border-navy-700 sm:rounded-lg my-0 sm:my-8 max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)] flex flex-col'>
            <div className='px-4 py-3 border-b border-navy-700 flex items-center justify-between flex-shrink-0'>
              <h2 className='text-white font-bold'>
                {editing ? 'Edit Trainee' : 'Add Trainee'}
              </h2>
              <button
                onClick={closeModal}
                className='text-navy-400 hover:text-white transition-colors'
                aria-label='Close'
              >
                <i className='fa-solid fa-xmark'></i>
              </button>
            </div>
            {/* The form is a flex column: a scrollable field region and a fixed footer.
                Both need to be children of the form, and the footer must not be
                inside the scroll container, or Cancel/Save scroll out of reach. */}
            <form onSubmit={handleSubmit} className='flex flex-col min-h-0 flex-1'>
              <div className='p-4 space-y-3 overflow-y-auto flex-1 min-h-0 overscroll-contain'>
                {formError && (
                  <div className='p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm'>
                    {formError}
                  </div>
                )}
                {/* Three fields, not one: these are the columns the entrance
                  check matches on. The middle initial is optional and is
                  normalised to a single letter server-side. */}
                <div className='grid grid-cols-1 sm:grid-cols-[1fr_4.5rem_1fr] gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-navy-200 mb-2'>
                      First name <span className='text-red-400'>*</span>
                    </label>
                    <input
                      type='text'
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-navy-200 mb-2'>
                      M.I.
                    </label>
                    <input
                      type='text'
                      value={form.middleInitial}
                      onChange={(e) =>
                        setForm({ ...form, middleInitial: e.target.value })
                      }
                      // Two, so an admin who types "O." is not stopped mid-word.
                      maxLength={2}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-navy-200 mb-2'>
                      Last name <span className='text-red-400'>*</span>
                    </label>
                    <input
                      type='text'
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                      className={INPUT}
                    />
                  </div>
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

                {/* Assigned room. Same picker as the register form, but storing the
                  room id rather than the number: this value is persisted on
                  `users.pending_room_id` (migration 007) and resolved to a room at
                  check-in. The register form keeps the number in the visitor's
                  session instead, so the two differ deliberately. */}
                <div>
                  <label
                    htmlFor='pendingRoomId'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Assigned room
                  </label>
                  <div className='relative'>
                    <select
                      id='pendingRoomId'
                      value={form.pendingRoomId}
                      onChange={(e) => {
                        // A deliberate choice: stop deriving the room from the course.
                        roomTouched.current = true;
                        setForm({ ...form, pendingRoomId: e.target.value });
                      }}
                      className={`${INPUT} appearance-none cursor-pointer`}
                    >
                      <option value='' className='bg-navy-900'>
                        No assigned room
                      </option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id} className='bg-navy-900'>
                          {room.name} ({room.roomNumber})
                        </option>
                      ))}
                    </select>
                    <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                  </div>
                  <p className='text-navy-500 text-xs mt-1'>
                    Filled in from the course; you can change it. Applied to their first
                    check-in; after that the room is recorded when they scan a door code.
                  </p>
                </div>

                {/* Purpose. Same reasoning as the room above: seeded onto the first
                  attendance record, not a permanent property of the person. */}
                <div>
                  <label
                    htmlFor='pendingPurposeId'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Purpose <span className='text-yellow-400'>*</span>
                  </label>
                  <div className='relative'>
                    <select
                      id='pendingPurposeId'
                      value={form.pendingPurposeId}
                      onChange={(e) =>
                        setForm({ ...form, pendingPurposeId: e.target.value })
                      }
                      className={`${INPUT} appearance-none cursor-pointer`}
                    >
                      <option value='' className='bg-navy-900'>
                        Select a purpose
                      </option>
                      {purposes.map((purpose) => (
                        <option
                          key={purpose.id}
                          value={purpose.id}
                          className='bg-navy-900'
                        >
                          {purpose.label}
                        </option>
                      ))}
                    </select>
                    <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                  </div>
                  <p className='text-navy-500 text-xs mt-1'>
                    Applied to their first check-in, and they can pick a different reason
                    on later visits.
                  </p>
                </div>

                {/* Course. Unlike room/purpose, this is a permanent attribute of
                  the visitor, persisted on users.course_id. Required when
                  creating; an admin can change it later. */}
                <div>
                  <label
                    htmlFor='courseId'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Course <span className='text-yellow-400'>*</span>
                  </label>
                  <div className='relative'>
                    <select
                      id='courseId'
                      value={form.courseId}
                      onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                      className={`${INPUT} appearance-none cursor-pointer`}
                    >
                      <option value='' className='bg-navy-900'>
                        Select a course
                      </option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id} className='bg-navy-900'>
                          {course.label}
                        </option>
                      ))}
                    </select>
                    <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                  </div>
                </div>
                {/* `host_name` and `notes` are deliberately not editable here any more, so this
                  form matches what the register form collects: a visitor cannot
                  supply either, so letting staff set them here only created a
                  field one of two paths could fill. Both columns still exist and
                  existing values are still shown in the list above. */}
                <div>
                  <label
                    htmlFor='company'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Company / school
                  </label>
                  <input
                    id='company'
                    type='text'
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder='e.g. ABC College'
                    className={INPUT}
                  />
                </div>
                <div>
                  <label
                    htmlFor='phone'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Phone
                  </label>
                  <input
                    id='phone'
                    type='tel'
                    inputMode='tel'
                    autoComplete='tel'
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: sanitisePhone(e.target.value),
                      }))
                    }
                    // Block the keystroke rather than filtering it afterwards: a
                    // character that appears and then vanishes reads as a broken
                    // field. onChange still sanitises, which is what catches a paste
                    // (keydown does not fire for pasted content).
                    onKeyDown={(e) => {
                      if (!isAllowedPhoneKey(e.key, e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                      }
                    }}
                    // Grouping runs on BLUR, not on every keystroke. Regrouping
                    // mid-type reorders characters and drags the caret backwards
                    // over what was just typed; on blur there is no caret to move,
                    // so the number is tidied while the field is not being edited.
                    onBlur={() =>
                      setForm((prev) => ({ ...prev, phone: formatPhone(prev.phone) }))
                    }
                    placeholder='For the front desk to call ahead'
                    className={INPUT}
                  />
                </div>
                <div>
                  <label
                    htmlFor='validUntil'
                    className='block text-sm font-medium text-navy-200 mb-2'
                  >
                    Pass valid until
                  </label>
                  <input
                    id='validUntil'
                    type='date'
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className={INPUT}
                  />
                  <p className='text-navy-500 text-xs mt-1'>
                    Leave empty for a pass that never expires. Expired passes are flagged
                    in the list but their history is kept.
                  </p>
                </div>
                {/* See the note above: `notes` is not editable here. */}
                {/* The assigned room and purpose live on `users.pending_room_id` /
                  `pending_purpose_id` (migration 007) as PENDING intent, seeding the
                  first attendance record. The authoritative room and purpose are on
                  `clock_in_records`, one row per visit, because a person can attend a
                  Meeting today and an Orientation next week.

                  Before 007 this form had no room or purpose field at all, because
                  there was nowhere to put them: the register form holds the same two
                  values in the visitor's own session, and an admin creating someone
                  else has no such session. `host_name` and `notes` remain genuinely
                  uneditable — staff can still see them in the list, but the register
                  form does not collect them either. */}
                <p className='text-navy-500 text-xs'>
                  Assigned rooms are no longer stored on the account. They are recorded
                  per visit when the person checks in.
                </p>
              </div>

              {/* Submit controls sit outside the scroll region. Inside it they
                  would scroll out of reach on a short screen, which means the
                  form cannot be submitted without scrolling back to the bottom. */}
              <div className='p-4 border-t border-navy-700 flex gap-2 flex-shrink-0 bg-navy-900'>
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
                  className='flex-1 px-4 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
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
                <h2 className='text-white font-bold'>Archive user?</h2>
                <p className='text-navy-300 text-sm mt-1'>
                  <span className='text-white font-semibold'>{deleteTarget.name}</span>{' '}
                  will no longer be able to sign in, and will be hidden from this list.
                  Their attendance and room-visit history is kept.
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
                onClick={confirmArchive}
                className='flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-paper font-semibold text-sm transition-colors'
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
