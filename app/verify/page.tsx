'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRoomsStore } from '@/store/roomsStore';
import { verifyVisitor, type VerifyRecord } from '@/lib/publicUrl';

type Stage =
  | 'form'
  | 'approved'
  | 'declined'
  | 'pending'
  | 'not-found'
  | 'ambiguous'
  | 'no-email'
  | 'link-sent';

const INPUT =
  'w-full px-4 py-3 rounded-lg bg-navy-900/80 border-2 border-orange-500/30 text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors';

/**
 * Entrance verification.
 *
 * Reached by scanning the QR poster at the front desk. Asks who the visitor is,
 * looks them up against the roster (migration 20260101000013), and routes on the
 * result:
 *
 *   found + approved  -> email a magic link to the address on file
 *   found + declined  -> explain, point at the front desk
 *   found + pending   -> explain, point at the front desk
 *   not found         -> /register, prefilled with what they typed
 *   ambiguous         -> explain, send to the front desk (two people, one name)
 *
 * The visitor types their name and picks their course. The EMAIL IS NEVER TYPED
 * HERE: it is read back off the matched row and is where the sign-in link goes,
 * so the person at the door cannot redirect the link at somebody else.
 *
 * WHY THERE IS NO PASSWORD BOX
 * --------------------------
 * The brief asked to "automatically authenticate/log in" on name + course. That
 * is not authentication: those two strings are printed on the orientation roster
 * and are guessable, so it would hand anyone who types a colleague's name that
 * colleague's session, attendance record and room access. On a system that tracks
 * who is physically inside a building, that is an impersonation backdoor.
 *
 * So this page proves identity rather than assuming it - the magic link proves
 * the visitor controls the mailbox. The brief's "proper authentication/session
 * handling" requirement is what this satisfies; "automatically log in" is the part
 * that could not be done safely, and this is the closest safe equivalent.
 */
export default function VerifyPage() {
  const router = useRouter();
  const { fetchCourses, getActiveCourses } = useRoomsStore();
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [record, setRecord] = useState<VerifyRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The course picker needs the courses table. Same store the register form uses,
  // so the two screens cannot drift onto different course lists.
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const courses = getActiveCourses();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const outcome = await verifyVisitor(name, courseId, supabase);

    if (outcome.kind === 'error') {
      setError(outcome.message);
      setBusy(false);
      return;
    }

    if (outcome.kind === 'not-found') {
      setStage('not-found');
      setBusy(false);
      return;
    }

    if (outcome.kind === 'ambiguous') {
      // More than one person in this course shares this name, so there is no way
      // to tell which one is standing at the desk. Refuse rather than guess:
      // picking one would send this visitor somebody else's sign-in link.
      setStage('ambiguous');
      setBusy(false);
      return;
    }

    setRecord(outcome.record);

    if (outcome.record.orientation_status === 'declined') {
      setStage('declined');
      setBusy(false);
      return;
    }
    if (outcome.record.orientation_status === 'pending') {
      setStage('pending');
      setBusy(false);
      return;
    }

    // Approved, but with no address on file (migration 20260101000014). There is
    // no link to send and no password to fall back on, so the only honest outcome
    // is the front desk. Saying "check your email" here would leave somebody
    // standing at a door waiting for mail that was never going to be sent.
    if (!outcome.record.has_email || !outcome.record.email) {
      setStage('no-email');
      setBusy(false);
      return;
    }

    // Approved. Establish the session by email rather than by assertion.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: outcome.record.email,
      options: {
        // Land on check-in, the same place the login page sends a visitor.
        emailRedirectTo: `${window.location.origin}/check-in`,
      },
    });

    if (otpError) {
      // They are genuinely approved and genuinely found - a failure here is an
      // infrastructure problem, not grounds to tell them they are not on the
      // list. Say so, and give them the normal sign-in as a way forward.
      setError(
        'We found your record and you are approved, but the sign-in email could not be sent. Use the normal sign-in page, or ask the front desk.'
      );
      setStage('approved');
      setBusy(false);
      return;
    }

    setStage('link-sent');
    setBusy(false);
  };

  // Carry their name into registration so it is not retyped. Only the name: the
  // course is deliberately NOT forwarded. /register keys its picker on course id
  // and the course list loads asynchronously, so a label in the query string
  // could not be applied without a re-render race - and the visitor is picking
  // their course fresh anyway, since that is what told us they had no record.
  const registerHref = `/register?name=${encodeURIComponent(name.trim())}`;

  return (
    <div className='min-h-screen flex items-start sm:items-center justify-center p-4 sm:py-8'>
      <div className='w-full max-w-md'>
        <div className='glass-panel border-navy-700 rounded-lg p-6 sm:p-8'>
          {/* Same mark as the other auth screens, so this reads as part of the
              product rather than a separate app bolted on. */}
          <div className='text-center mb-6'>
            <div className='w-14 h-14 mx-auto mb-3 flex items-center justify-center'>
              <img
                src='/hyt_logo.png'
                alt='HYT Global'
                className='w-full h-full object-contain'
              />
            </div>
            <h1 className='text-2xl font-bold text-white mb-1'>Visitor Check-in</h1>
            <p className='text-orange-300 text-sm'>HYT Global Institute</p>
          </div>
          {stage === 'form' && (
            <>
              <p className='text-navy-300 text-sm mb-5'>
                Enter the name and course on your orientation record.
              </p>

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label
                    htmlFor='v-name'
                    className='block text-sm font-medium text-navy-200 mb-1.5'
                  >
                    Full name <span className='text-red-400'>*</span>
                  </label>
                  <input
                    id='v-name'
                    className={INPUT}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='As it appears on your record'
                    autoComplete='name'
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor='v-course'
                    className='block text-sm font-medium text-navy-200 mb-1.5'
                  >
                    Course <span className='text-red-400'>*</span>
                  </label>
                  <div className='relative'>
                    <select
                      id='v-course'
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
                      className={`${INPUT} appearance-none cursor-pointer pl-11`}
                    >
                      <option value='' className='bg-navy-900'>
                        Select your course
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
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <i className='fa-solid fa-graduation-cap text-orange-400'></i>
                    </div>
                    <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 text-xs pointer-events-none'></i>
                  </div>
                </div>

                {error && (
                  <p
                    role='alert'
                    className='text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2'
                  >
                    {error}
                  </p>
                )}

                <button
                  type='submit'
                  disabled={busy}
                  className='w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  {busy ? 'Checking…' : 'Check my record'}
                </button>
              </form>

              <div className='mt-5 pt-5 border-t border-navy-800 text-center'>
                <p className='text-navy-400 text-xs mb-2'>Never attended orientation?</p>
                <Link
                  href='/register'
                  className='text-orange-300 hover:text-orange-200 text-sm font-semibold'
                >
                  Register as a new visitor
                </Link>
              </div>
            </>
          )}
          {stage === 'link-sent' && (
            <div className='text-center py-4'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-envelope-open-text text-green-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>Check your email</h2>
              {record && (
                <p className='text-navy-300 text-sm mb-3'>
                  Welcome back,{' '}
                  <span className='text-white font-semibold'>{record.full_name}</span>.
                  Your record is approved
                  {record.programme ? ` (${record.programme})` : ''}.
                </p>
              )}
              <p className='text-navy-400 text-sm mb-6'>
                We sent a sign-in link to{' '}
                <span className='text-white font-semibold break-all'>
                  {record?.email}
                </span>
                . Open it on this phone to continue. The link expires, so if it has
                gone stale just scan again.
              </p>
              <button
                onClick={() => {
                  setStage('form');
                  setError('');
                }}
                className='text-navy-400 hover:text-navy-200 text-sm'
              >
                Use a different email
              </button>
            </div>
          )}

          {stage === 'approved' && (
            <div className='text-center py-4'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-circle-check text-green-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>You are approved</h2>
              {error && (
                <p
                  role='alert'
                  className='text-orange-300 text-sm bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 mb-4'
                >
                  {error}
                </p>
              )}
              <Link
                href='/login'
                className='inline-block w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm'
              >
                Go to Sign In
              </Link>
            </div>
          )}
          {(stage === 'declined' || stage === 'pending') && (
            <div className='text-center py-4'>
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  stage === 'declined' ? 'bg-red-500/20' : 'bg-orange-500/20'
                }`}
              >
                <i
                  className={`fa-solid ${
                    stage === 'declined' ? 'fa-circle-xmark' : 'fa-clock'
                  } ${
                    stage === 'declined' ? 'text-red-400' : 'text-orange-400'
                  } text-2xl`}
                ></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>
                {stage === 'declined' ? 'Not approved' : 'Awaiting review'}
              </h2>
              <p className='text-navy-300 text-sm mb-6'>
                {stage === 'declined'
                  ? 'We found your record, but the last orientation was not approved. Please speak to the front desk before entering.'
                  : 'We found your record, but your result has not been processed yet. Please speak to the front desk.'}
              </p>
              <button
                onClick={() => {
                  setStage('form');
                  setError('');
                }}
                className='text-navy-400 hover:text-navy-200 text-sm'
              >
                Try a different name
              </button>
            </div>
          )}

          {stage === 'ambiguous' && (
            <div className='text-center py-4'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-users text-orange-400 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>
                More than one match
              </h2>
              <p className='text-navy-300 text-sm mb-6'>
                We found more than one person with that name in this course, so we
                cannot tell which record is yours. Please speak to the front desk and
                they will confirm it for you.
              </p>
              <button
                onClick={() => {
                  setStage('form');
                  setError('');
                }}
                className='text-navy-400 hover:text-navy-200 text-sm'
              >
                Check a different name
              </button>
            </div>
          )}

          {stage === 'no-email' && (
            <div className='text-center py-4'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-envelope-circle-exclamation text-blue-300 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>
                No email on file
              </h2>
              <p className='text-navy-300 text-sm mb-2'>
                {record && (
                  <>
                    Welcome back,{' '}
                    <span className='text-white font-semibold'>
                      {record.full_name}
                    </span>
                    . Your record is approved
                    {record.programme ? ` (${record.programme})` : ''}.
                  </>
                )}
              </p>
              <p className='text-navy-300 text-sm mb-6'>
                We cannot email you a sign-in link because there is no address on
                your record. Please speak to the front desk to get set up.
              </p>
              <button
                onClick={() => {
                  setStage('form');
                  setError('');
                }}
                className='text-navy-400 hover:text-navy-200 text-sm'
              >
                Check a different name
              </button>
            </div>
          )}

          {stage === 'not-found' && (
            <div className='text-center py-4'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center'>
                <i className='fa-solid fa-user-plus text-blue-300 text-2xl'></i>
              </div>
              <h2 className='text-xl font-bold text-white mb-2'>No record found</h2>
              <p className='text-navy-300 text-sm mb-6'>
                We have no orientation record for that name in this course. Register
                as a new visitor and the front desk will review it.
              </p>
              <button
                onClick={() => router.push(registerHref)}
                className='w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm'
              >
                Register as new visitor
              </button>
            </div>
          )}
        </div>

        <p className='text-center text-navy-500 text-xs mt-4'>
          HYT Global Institute · Visitor Management System
        </p>
      </div>
    </div>
  );
}