'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoomsStore } from '@/store/roomsStore';
import { formatPhone, sanitisePhone, isAllowedPhoneKey } from '@/lib/phone';
import Link from 'next/link';

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
  } = useRoomsStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    destination: '',
    purpose: '',
    // Visitor profile. Asked here so the front desk has it before the person
    // reaches the desk, and so an orientation attendee is classified once
    // instead of being tidied up afterwards. All optional.
    //
    // Deliberately NOT asked here: `host_name` and `notes`. A visitor cannot
    // meaningfully supply either - they do not know who they are meeting by
    // name, and there is nothing they could put in a front-desk note. Both
    // remain on the admin form, which is written by staff who do know.
    visitorTypeId: '',
    company: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Set once the account exists but the email still needs confirming. Drives the
  // "check your inbox" screen instead of an error message.
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(
    null
  );

  const purposes = getActivePurposes();
  const visitorTypes = getActiveVisitorTypes();
  // Already ordered by floor then room number by the store.
  const rooms = getActiveRooms();

  useEffect(() => {
    fetchPurposes();
    fetchVisitorTypes();
    fetchRooms();
  }, [fetchPurposes, fetchVisitorTypes, fetchRooms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
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

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      destination: formData.destination || undefined,
      purpose: formData.purpose || undefined,
      pendingRoomId: chosenRoom?.id,
      pendingPurposeId: chosenPurpose?.id,
      visitorTypeId: formData.visitorTypeId || undefined,
      company: formData.company.trim() || undefined,
      phone: formData.phone.trim() || undefined,
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
        router.push('/check-in');
      } else {
        setError(result.error || 'Registration failed');
        setLoading(false);
      }
    };

  return (
    <>
      {/* Account created, email not yet confirmed. A success screen, not an
          error: there is genuinely nothing to fix, they just need to click the
          link Supabase emailed them. */}
      {pendingConfirmation && (
        <div className='min-h-screen flex items-center justify-center p-4'>
          <div className='w-full max-w-md text-center'>
            <div className='glass-panel border-navy-700 rounded-lg p-8'>
              <div className='w-16 h-16 mx-auto mb-5 rounded-full bg-orange-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-envelope-open-text text-orange-400 text-2xl'></i>
              </div>
              <h1 className='text-2xl font-bold text-white mb-3'>
                Check your email
              </h1>
              <p className='text-navy-300 text-sm mb-2'>
                We sent a confirmation link to
              </p>
              <p className='text-white font-semibold mb-6 break-all'>
                {pendingConfirmation}
              </p>
              <p className='text-navy-400 text-sm mb-6'>
                Open it to activate your account, then sign in. The link expires
                after a while, so if it has gone stale just register again.
              </p>
              <Link
                href='/login'
                className='
                  inline-block w-full px-4 py-3 rounded-lg
                  bg-orange-500 hover:bg-orange-600 text-paper
                  font-semibold text-sm transition-colors
                '
              >
                Go to Sign In
              </Link>
              <button
                onClick={() => {
                  setPendingConfirmation(null);
                  setError('');
                }}
                className='mt-4 text-navy-400 hover:text-navy-200 text-sm transition-colors'
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      )}

      {!pendingConfirmation && (
        // items-start on small screens. Centring a tall form with flex centres
        // the overflow too, so the top and bottom get clipped and become
        // unreachable on a phone - including the Create Account button.
        <div className='min-h-screen flex items-start sm:items-center justify-center p-4 sm:py-8'>
        {/* Register Card */}
        <div className='relative w-full max-w-md'>
          {/* Logo. Smaller on phones so it does not push the form off screen. */}
          <div className='text-center mb-6 sm:mb-8'>
            <div className='inline-block w-16 h-16 sm:w-24 sm:h-24 mb-4'>
              <img
                src='/hyt_logo.png'
                alt='HYT Logo'
                className='w-full h-full object-contain'
              />
            </div>
            <h1 className='text-2xl sm:text-3xl font-bold text-white mb-2'>
              Create Account
            </h1>
            <p className='text-orange-300'>Join HYT Wayfinder</p>
          </div>

          {/* Register Form */}
          <div className='border border-orange-400/30 rounded-lg p-5 sm:p-8 bg-navy-900/60'>
            <form onSubmit={handleSubmit} className='space-y-5'>
              {/* Error Message */}
              {error && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm'>
                  <div className='flex items-start gap-2'>
                    <i className='fa-solid fa-circle-exclamation mt-0.5'></i>
                    <span>{error}</span>
                  </div>

                  {/* An address that already has a login can never register
                      again, so don't leave them on this form with no way out.
                      Signing in repairs a missing profile automatically. */}
                  {/already has an account|already registered/i.test(error) && (
                    <Link
                      href='/login'
                      className='mt-3 inline-flex items-center gap-2 text-orange-300 hover:text-orange-200 font-semibold transition-colors'
                    >
                      <i className='fa-solid fa-right-to-bracket'></i>
                      Go to sign in
                    </Link>
                  )}
                </div>
              )}

              {/* Name Field */}
              <div>
                <label
                  htmlFor='name'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Full Name
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-user text-orange-400'></i>
                  </div>
                  <input
                    type='text'
                    id='name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='Juan C. Dela Cruz'
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-envelope text-orange-400'></i>
                  </div>
                  <input
                    type='email'
                    id='email'
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='you@example.com'
                  />
                </div>
              </div>

              {/* Assigned room. Not saved to the account: the new schema has no
                destination column on `users`. It is held for this session and
                written to the visitor's first attendance record when they check
                in, which is where a room belongs. */}
              <div>
                <label
                  htmlFor='destination'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Assigned room
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-location-dot text-orange-400'></i>
                  </div>
                  <select
                    id='destination'
                    value={formData.destination}
                    onChange={(e) =>
                      setFormData({ ...formData, destination: e.target.value })
                    }
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg appearance-none
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                  >
                    <option value=''>No assigned room</option>
                    {/* Options come from the `rooms` table, not a hardcoded list, so
                        a room added in /admin/rooms is selectable here immediately.
                        The VALUE is the room number because that is what
                        `getRoomByNumber` resolves at check-in; the LABEL is the room
                        name, which is what a person recognises. */}
                    {rooms.map((room) => (
                      <option key={room.id} value={room.roomNumber} className='bg-navy-900'>
                        {room.name} ({room.roomNumber})
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                </div>
                <p className='text-navy-400 text-xs mt-2'>
                  Optional. Recorded on your first check-in; you can go to any
                  room later by scanning its door code.
                </p>
              </div>

              {/* Purpose picker. Also per visit, not per person: the schema puts
                  purpose_id on clock_in_records so a visitor can attend a Meeting
                  one day and an Orientation the next. This seeds the first visit. */}
              <div>
                <label
                  htmlFor='purpose'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Purpose
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-clipboard-question text-orange-400'></i>
                  </div>
                  <select
                    id='purpose'
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg appearance-none
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors cursor-pointer
                    '
                  >
                    <option value='' className='bg-navy-900'>
                      Not sure yet
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
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                </div>
                <p className='text-navy-400 text-xs mt-2'>
                  Optional. Applied to your first check-in, and you can pick a
                  different reason on later visits.
                </p>
              </div>

              {/* Visitor profile. Optional, and asked here so the front desk has it before the
                  person reaches the desk. An admin can correct any of it later. */}
              <div className='rounded-lg border border-navy-700 bg-navy-950/40 p-4 space-y-4'>
                <p className='text-sm font-semibold text-orange-200'>
                  About your visit
                  <span className='ml-2 text-xs font-normal text-navy-400'>
                    all optional
                  </span>
                </p>

                <div>
                  <label
                    htmlFor='visitorTypeId'
                    className='block text-sm font-medium text-orange-200 mb-2'
                  >
                    Visitor type
                  </label>
                  <div className='relative'>
                    <select
                      id='visitorTypeId'
                      value={formData.visitorTypeId}
                      onChange={(e) =>
                        setFormData({ ...formData, visitorTypeId: e.target.value })
                      }
                      className='
                        w-full pl-12 pr-4 py-3 rounded-lg appearance-none
                        bg-navy-900/80 border-2 border-orange-500/30
                        text-white placeholder-navy-500
                        focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                        transition-colors cursor-pointer
                      '
                    >
                      <option value='' className='bg-navy-900'>
                        Not sure
                      </option>
                      {visitorTypes.map((type) => (
                        <option key={type.id} value={type.id} className='bg-navy-900'>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <i className='fa-solid fa-id-card text-orange-400'></i>
                    </div>
                    <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                  </div>
                </div>

                {/* `host_name` is not asked here: a visitor cannot name the person they are
                    meeting. Staff set it on /admin/users. */}
                {/* Two-up on wider screens, stacked on a phone. */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='company'
                      className='block text-sm font-medium text-orange-200 mb-2'
                    >
                      Company / school
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <i className='fa-solid fa-building text-orange-400'></i>
                      </div>
                      <input
                        type='text'
                        id='company'
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder='Optional'
                        className='
                          w-full pl-12 pr-4 py-3 rounded-lg
                          bg-navy-900/80 border-2 border-orange-500/30
                          text-white placeholder-navy-500
                          focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                          transition-colors
                        '
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='phone'
                      className='block text-sm font-medium text-orange-200 mb-2'
                    >
                      Phone
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <i className='fa-solid fa-phone text-orange-400'></i>
                      </div>
                      <input
                        type='tel'
                        id='phone'
                        inputMode='tel'
                        autoComplete='tel'
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
                        placeholder='Optional'
                        className='
                          w-full pl-12 pr-4 py-3 rounded-lg
                          bg-navy-900/80 border-2 border-orange-500/30
                          text-white placeholder-navy-500
                          focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                          transition-colors
                        '
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type='password'
                    id='password'
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor='confirmPassword'
                  className='block text-sm font-medium text-orange-200 mb-2'
                >
                  Confirm Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <i className='fa-solid fa-lock text-orange-400'></i>
                  </div>
                  <input
                    type='password'
                    id='confirmPassword'
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className='
                      w-full pl-12 pr-4 py-3 rounded-lg
                      bg-navy-900/80 border-2 border-orange-500/30
                      text-white placeholder-navy-500
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors
                      '
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Submit Button. Sticky on a phone: the form is long and
                  the page is centred, so a plain button can sit far below
                  the fold and out of reach. */}
              <button
                type='submit'
                disabled={loading}
                className='
                  sticky bottom-4 z-10 sm:static sm:z-auto
                  w-full py-3 rounded-lg font-semibold text-paper
                  bg-orange-600 hover:bg-orange-700
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  border border-orange-500/50
                  shadow-lg shadow-black/40 sm:static sm:shadow-none
                  '
              >
                {loading ? (
                  <>
                    <i className='fa-solid fa-spinner fa-spin'></i>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-user-plus'></i>
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className='mt-6 text-center text-sm text-navy-300'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-orange-400 hover:text-orange-300 font-semibold transition-colors'
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
