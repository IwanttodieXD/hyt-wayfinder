'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRoomsStore } from '@/store/roomsStore';
import {
  formatPhone,
  sanitisePhone,
  isAllowedPhoneKey,
  isReasonablePhone,
} from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import {
  fetchOrientationStatus,
  VERIFIED_CHECKIN_PATH,
  type OrientationRecord,
} from '@/lib/publicUrl';
import { isTraineeType } from '@/lib/trainee';
import {
  Alert,
  AuthShell,
  Badge,
  Button,
  Field,
  SelectWrap,
  controlClass,
  selectClass,
} from '@/components/ui';

/**
 * Banner detail per orientation verdict.
 *
 * `null` (not in the cohort) is deliberately absent: a first-time walk-in has no
 * verdict, and showing them "pending" would be inventing a status they do not
 * have. Only the three real states are styled here.
 */
const VERDICT: Record<
  NonNullable<OrientationRecord['orientation_status']>,
  {
    tone: 'success' | 'danger' | 'warning';
    icon: string;
    label: string;
    detail: string;
  }
> = {
  approved: {
    tone: 'success',
    icon: 'fa-circle-check',
    label: 'Approved',
    detail:
      'You are cleared to enter - continue below to finish creating your account.',
  },
  declined: {
    tone: 'danger',
    icon: 'fa-circle-xmark',
    label: 'Not approved',
    detail: 'Please speak to the front desk before entering.',
  },
  pending: {
    tone: 'warning',
    icon: 'fa-clock',
    label: 'Awaiting review',
    detail:
      'Your result is still being processed. Please speak to the front desk.',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  // Purposes and rooms both come from lookup tables, not hardcoded lists, so adding
  // a reason or a room in the database makes it selectable here immediately.
  const {
    fetchPurposes,
    getActivePurposes,
    fetchVisitorTypes,
    getActiveVisitorTypes,
    fetchRooms,
    getActiveRooms,
    fetchCourses,
    getActiveCourses,
    getRoomForCourse,
  } = useRoomsStore();

  // Prefill from /verify. Somebody sent here because we had no record for them has
  // already typed their name once; making them retype it is the kind of small
  // friction that turns into abandoning the form at the door.
  //
  // Read once, in a lazy initializer, rather than via useSearchParams: that hook
  // needs a Suspense boundary in the App Router, and re-reading on every render
  // would fight the user's own edits as soon as they start typing.
  //
  // The query string is attacker-supplied, so every value is treated as display
  // text only - the register path already re-validates the address, and nothing
  // downstream treats these fields as verified.
  const [prefill] = useState(() => {
    if (typeof window === 'undefined') {
      return { firstName: '', lastName: '', email: '' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      firstName: (params.get('firstName') ?? '').slice(0, 120),
      lastName: (params.get('lastName') ?? '').slice(0, 120),
      email: (params.get('email') ?? '').slice(0, 254),
    };
  });

  const [formData, setFormData] = useState({
    firstName: prefill.firstName,
    middleInitial: '',
    lastName: prefill.lastName,
    email: prefill.email,
    password: '',
    confirmPassword: '',
    destination: '',
    purpose: '',
    // Visitor profile. Asked here so the front desk has it before the person
    // reaches the desk, and so an orientation attendee is classified once
    // instead of being tidied up afterwards. Phone is required because it is
    // how the desk reaches someone after they leave; the rest are optional.
    //
    // Deliberately NOT asked here: `host_name` and `notes`. A visitor cannot
    // meaningfully supply either - they do not know who they are meeting by
    // name, and there is nothing they could put in a front-desk note. Both
    // remain on the admin form, which is written by staff who do know.
    visitorTypeId: '',
    company: '',
    phone: '',
    // Required only for trainees and trainers; everyone else is not enrolled
    // in a course. Persisted as users.course_id by the full setup.
    courseId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Orientation verdict for whoever is typing this email, once it resolves to a
  // cohort member. `undefined` = still looking (or not looking), `null` = not in
  // the cohort. Only a non-null record produces a banner.
  const [orientation, setOrientation] = useState<OrientationRecord | null | undefined>(
    undefined
  );
  // Set once the account exists but the email still needs confirming. Drives the
  // "check your inbox" screen instead of an error message.
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(
    null
  );

  const purposes = getActivePurposes();
  const visitorTypes = getActiveVisitorTypes();
  // Already ordered by floor then room number by the store.
  const rooms = getActiveRooms();
  const courses = getActiveCourses();

  // Public registration is trainee-only: the other visitor_types rows still
  // exist for historical records and for staff-created accounts, but a walk-in
  // picking their own classification was extra work with no benefit. The real
  // UUID is resolved once the lookup table loads; fallback ids are ignored
  // because they are not valid foreign keys.
  const traineeType = visitorTypes.find(
    (type) => isTraineeType(type.label) && !type.id.startsWith('fallback-')
  );
  const courseRequired = true;

  useEffect(() => {
    if (!traineeType) return;

    setFormData((prev) =>
      prev.visitorTypeId === traineeType.id
        ? prev
        : { ...prev, visitorTypeId: traineeType.id }
    );
  }, [traineeType]);

  useEffect(() => {
    fetchPurposes();
    fetchVisitorTypes();
    fetchRooms();
    fetchCourses();
  }, [fetchPurposes, fetchVisitorTypes, fetchRooms, fetchCourses]);

  // The assigned room is derived from the chosen course and is not editable on
  // this form, so this is the only writer of `destination`. The same-value guard
  // keeps it from looping when the effect re-runs as the reference lists load.
  useEffect(() => {
    const mapped = getRoomForCourse(formData.courseId);
    // Only offer a room the picker actually renders (the active list).
    const next =
      mapped && rooms.some((r) => r.id === mapped.id) ? mapped.roomNumber : '';
    setFormData((f) => (f.destination === next ? f : { ...f, destination: next }));
  }, [formData.courseId, rooms, getRoomForCourse]);

  // Orientation lookup, debounced.
  //
  // Fires once the address looks like an address AND the typing pauses, rather
  // than on every keystroke - the naive version sends a request per character.
  // 500ms is long enough that a full address is typed in one go before the first
  // lookup, short enough to feel instant on a phone.
  //
  // The `cancelled` flag guards the response ordering: without it, a slow lookup
  // for an earlier address can land after a fast one for a later address and
  // overwrite the banner with somebody else's verdict.
  useEffect(() => {
    const email = formData.email.trim();
    if (!email.includes('@')) {
      setOrientation(undefined);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const record = await fetchOrientationStatus(email, supabase);
      if (!cancelled) setOrientation(record);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!isReasonablePhone(formData.phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    // Password checks are commented out with the password fields below. There is
    // no password input on this form any more, so both would fail on an empty
    // string and block every registration. Restore them if the fields come back.
    //
    // if (formData.password !== formData.confirmPassword) {
    //   setError('Passwords do not match');
    //   return;
    // }
    //
    // if (formData.password.length < 6) {
    //   setError('Password must be at least 6 characters');
    //   return;
    // }

    if (courseRequired && !formData.courseId) {
      setError('Please select a course');
      return;
    }

    if (!formData.purpose) {
      setError('Please select a purpose');
      return;
    }

    if (!formData.visitorTypeId) {
      setError(
        'Trainee registration is still loading. Please wait a moment and try again.'
      );
      return;
    }

    setLoading(true);

    // A self-registered visitor gets a pass that expires at the end of today.
    //
    // Public registration is for walk-ins: someone who has come to the building
    // now. Making the pass day-scoped means a forgotten account cannot quietly
    // stay valid for months. `isPassExpired` compares against the START of today,
    // so an end-of-today timestamp stays valid for the whole day they registered
    // and locks them out tomorrow - which is the intended "one day".
    //
    // Staff creating someone who is staying longer set `valid_until` explicitly
    // on the admin form instead, which overrides this.
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // The pickers work in numbers and labels, but the pending columns are FKs, so
    // resolve the chosen values back to their row ids. Looked up by the same
    // value the <option> carried, so this cannot disagree with the picker.
    const chosenRoom = rooms.find((r) => r.roomNumber === formData.destination);
    const chosenPurpose = purposes.find((p) => p.label === formData.purpose);

    // No password is collected any more (see the commented-out fields below), but
    // Supabase still needs one to create the auth user. This is a throwaway: it
    // is never shown, never sent anywhere, and never used to sign in - trainees
    // authenticate through /verify with their name and course.
    const generatedPassword =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `visitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    const result = await register({
      firstName: formData.firstName,
      middleInitial: formData.middleInitial,
      lastName: formData.lastName,
      email: formData.email,
      password: generatedPassword,
      destination: formData.destination || undefined,
      purpose: formData.purpose || undefined,
      pendingRoomId: chosenRoom?.id,
      pendingPurposeId: chosenPurpose?.id,
      visitorTypeId: formData.visitorTypeId,
      company: formData.company.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      courseId: formData.courseId,
      validUntil: endOfToday.toISOString(),
    });

    // The account exists but the address is not confirmed yet, so there is no
    // session and nothing more to do here. This is a success state, not a
    // failure: sending them to their inbox is the correct next step.
    if (result.needsConfirmation) {
      setPendingConfirmation(formData.email);
      setLoading(false);
      return;
    }

    if (result.success) {
      // Self-registration only ever produces a visitor: the database trigger
      // hardcodes role='visitor' and ignores anything the client sends. Admins
      // are provisioned by hand through /admin/users.
      //
      // The ?verified=1 marker is the same one /verify appends, so
      // /check-in's auto-check-in hook fires as soon as the visitor lands and
      // records them without a second scan. Same destination as a successful
      // /verify, so both entry points end in the same place.
      router.push(VERIFIED_CHECKIN_PATH);
    } else {
      setError(result.error || 'Registration failed');
      setLoading(false);
    }
  };

  /* Account created, email not yet confirmed. A success screen, not an error:
     there is genuinely nothing to fix, they just need to click the link Supabase
     emailed them. */
  if (pendingConfirmation) {
    return (
      <AuthShell
        eyebrow='Almost done'
        title='Check your email'
        subtitle='One more step before your pass is active.'
      >
        <div className='text-center'>
          <div className='mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/15'>
            <i className='fa-solid fa-envelope-open-text text-2xl text-yellow-400'></i>
          </div>
          <p className='mb-2 text-sm text-navy-300'>
            We sent a confirmation link to
          </p>
          <p className='mb-6 break-all font-semibold text-white'>
            {pendingConfirmation}
          </p>
          <p className='mb-6 text-sm leading-relaxed text-navy-400'>
            Open it to activate your account, then sign in. The link expires
            after a while, so if it has gone stale just register again.
          </p>
          <Button
            onClick={() => router.push('/login')}
            icon='fa-right-to-bracket'
            className='w-full'
            size='lg'
          >
            Go to sign in
          </Button>
          <button
            onClick={() => {
              setPendingConfirmation(null);
              setError('');
            }}
            className='mt-4 text-sm text-navy-400 transition-colors hover:text-navy-200'
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow='New pass'
      title='Create your pass'
      subtitle='Register once, then check in at the entrance with your name and course.'
      size='lg'
      aside={
        <div className='space-y-5'>
          <Badge tone='brand' icon='fa-graduation-cap'>
            Trainee check-in
          </Badge>
          <h2 className='text-3xl font-bold leading-tight text-white'>
            One form, then you are ready for the door.
          </h2>
          <p className='max-w-md text-sm leading-relaxed text-navy-400'>
            Your details are used to verify you at the entrance and to show the
            right room for your course. A pass is issued for today only; the
            front desk can extend it if you are staying longer.
          </p>
          <ul className='space-y-3'>
            {[
              'Your name and course must match the orientation roster.',
              'The course picks your assigned room automatically.',
              'After registering, the entrance check-in is automatic.',
            ].map((item) => (
              <li
                key={item}
                className='flex items-start gap-3 text-sm leading-relaxed text-navy-300'
              >
                <i className='fa-solid fa-circle-check mt-0.5 text-yellow-400'></i>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Error Message */}
        {error && (
          <Alert tone='danger' role='alert'>
            <p>{error}</p>

            {/* An address that already has a login can never register
                again, so don't leave them on this form with no way out.
                Signing in repairs a missing profile automatically. */}
            {/already has an account|already registered/i.test(error) && (
              <Link
                href='/login'
                className='mt-2 inline-flex items-center gap-2 text-sm font-semibold text-yellow-300 transition-colors hover:text-yellow-200'
              >
                <i className='fa-solid fa-right-to-bracket'></i>
                Go to sign in
              </Link>
            )}
          </Alert>
        )}

        {/* Your details */}
        <section className='space-y-4'>
          <div>
            <h2 className='text-sm font-semibold text-white'>Your details</h2>
            <p className='mt-0.5 text-xs leading-relaxed text-navy-400'>
              Use the name printed on your orientation roster.
            </p>
          </div>

          {/* Name Field. Three inputs, not one: these are the columns the
              entrance check matches on. First and last are required; the
              middle initial is optional and is stored as a single letter. */}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-[1fr_4.5rem_1fr]'>
            <Field label='First name' htmlFor='firstName' required>
              <input
                type='text'
                id='firstName'
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
                autoComplete='given-name'
                className={controlClass}
                placeholder='Juan'
              />
            </Field>

            <Field label='M.I.' htmlFor='middleInitial' hint='Optional'>
              <input
                type='text'
                id='middleInitial'
                value={formData.middleInitial}
                onChange={(e) =>
                  setFormData({ ...formData, middleInitial: e.target.value })
                }
                // Two, so typing "C." is not cut off mid-word. The stored
                // value is normalised to a single letter.
                maxLength={2}
                className={`${controlClass} px-2 text-center`}
                placeholder='C.'
              />
            </Field>

            <Field label='Last name' htmlFor='lastName' required>
              <input
                type='text'
                id='lastName'
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
                autoComplete='family-name'
                className={controlClass}
                placeholder='Dela Cruz'
              />
            </Field>
          </div>

          <Field label='Email address' htmlFor='email' required>
            <input
              type='email'
              id='email'
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              autoComplete='email'
              className={controlClass}
              placeholder='you@example.com'
            />
          </Field>

          {/* Orientation verdict, shown only once the address matches a
              member of the last cohort. A null result renders nothing: a
              first-time walk-in has no verdict, and inventing one - or
              worse, defaulting to 'declined' - would be actively wrong. */}
          {orientation && (
            <Alert
              tone={VERDICT[orientation.orientation_status].tone}
              icon={VERDICT[orientation.orientation_status].icon}
              title={`Orientation: ${VERDICT[orientation.orientation_status].label}`}
              role='status'
            >
              Found you from the last orientation
              {orientation.programme ? ` (${orientation.programme})` : ''}.{' '}
              {VERDICT[orientation.orientation_status].detail}
            </Alert>
          )}

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Field
              label='Company / school'
              htmlFor='company'
              hint='Optional'
            >
              <input
                type='text'
                id='company'
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder='Where you are from'
                className={controlClass}
              />
            </Field>

            <Field label='Phone' htmlFor='phone' required>
              <input
                type='tel'
                id='phone'
                inputMode='tel'
                autoComplete='tel'
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: sanitisePhone(e.target.value),
                  }))
                }
                // Blocks the keystroke outright; onChange sanitises, which is
                // what catches a paste since keydown does not fire for it.
                onKeyDown={(e) => {
                  if (!isAllowedPhoneKey(e.key, e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                  }
                }}
                // Grouping runs on BLUR, not on every keystroke. Regrouping
                // mid-type reorders characters and drags the caret backwards
                // over what was just typed; on blur there is no caret to move.
                onBlur={() =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: formatPhone(prev.phone),
                  }))
                }
                placeholder='09xx xxx xxxx'
                className={controlClass}
              />
            </Field>
          </div>
        </section>

        {/* Your visit */}
        <section className='space-y-4 border-t border-navy-800 pt-6'>
          <div>
            <h2 className='text-sm font-semibold text-white'>Your visit</h2>
            <p className='mt-0.5 text-xs leading-relaxed text-navy-400'>
              This is what the front desk and the room scanner will see.
            </p>
          </div>

          {/* Purpose picker. Also per visit, not per person: the schema puts
              purpose_id on clock_in_records so a visitor can attend a Meeting
              one day and an Orientation the next. This seeds the first visit. */}
          <Field label='Purpose' htmlFor='purpose' required>
            <SelectWrap>
              <select
                id='purpose'
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                required
                className={selectClass}
              >
                <option value='' className='bg-navy-900'>
                  Select a purpose
                </option>
                {purposes.map((purpose) => (
                  <option
                    key={purpose.id}
                    value={purpose.label}
                    className='bg-navy-900'
                  >
                    {purpose.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>

          {/* A course is a stable attribute of the trainee, persisted on the
              user row (unlike destination/purpose, which are per visit). */}
          <Field label='Course' htmlFor='courseId' required>
            <SelectWrap>
              <select
                id='courseId'
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                required
                className={selectClass}
              >
                <option value='' className='bg-navy-900'>
                  Select a course
                </option>
                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                    className='bg-navy-900'
                  >
                    {course.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>

          <Field
            label='Assigned room'
            htmlFor='destination'
            hint='From your course'
          >
            <SelectWrap>
              <select
                id='destination'
                value={formData.destination}
                disabled
                className={selectClass}
              >
                <option value=''>No assigned room</option>
                {/* The options still come from the `rooms` table, so a room added
                    in /admin/rooms shows up here immediately. The VALUE is the room
                    number because that is what `getRoomByNumber` resolves at
                    check-in; the LABEL is the room name, which is what a person
                    recognises. Read-only: the room follows the course. */}
                {rooms.map((room) => (
                  <option
                    key={room.id}
                    value={room.roomNumber}
                    className='bg-navy-900'
                  >
                    {room.name} ({room.roomNumber})
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
        </section>

        {/* Submit Button. Sticky on a phone: the form is long and the page is
            centred, so a plain button can sit far below the fold and out of
            reach. */}
        <div className='sticky bottom-4 z-10 sm:static sm:z-auto'>
          <Button
            type='submit'
            loading={loading}
            icon='fa-user-plus'
            size='lg'
            className='w-full shadow-lg shadow-black/30 sm:shadow-none'
          >
            {loading ? 'Creating your pass…' : 'Create my pass'}
          </Button>
        </div>
      </form>

      <div className='mt-6 border-t border-navy-800 pt-5 text-center text-sm text-navy-300'>
        Already registered?{' '}
        <Link
          href='/verify'
          className='font-semibold text-yellow-300 transition-colors hover:text-yellow-200'
        >
          Verify at the entrance
        </Link>
      </div>
    </AuthShell>
  );
}
