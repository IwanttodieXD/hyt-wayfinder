'use client';

import { useAuthStore } from '@/store/authStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAttendanceStatus, useClockInProfile } from '@/hooks/useClockInProfile';
import { useAutoCheckInAfterVerify } from '@/hooks/useAutoCheckInAfterVerify';
import StudentMobileView from '@/components/StudentMobileView';
import TraineeHeader from '@/components/TraineeHeader';
import { Alert } from '@/components/ui';

/**
 * The trainee scanner.
 *
 * Camera, attendance and room-presence behaviour all live in QRScanner and are
 * unchanged. This page only provides the shell around it: the shared trainee
 * navigation and the automatic-check-in failure notice.
 */
export default function CheckInPage() {
  const { user } = useAuthStore();

  // Visitors check in from their own phone. Admins use the station instead, so
  // they are sent back to the dashboard.
  const isAllowed = useRoleGuard(['visitor'], '/admin');

  // Pull the signed-in user's name and destination into the check-in store.
  useClockInProfile();

  // Reconciles check-in state with the database, so a refresh doesn't report
  // "not checked in" for someone who is genuinely inside.
  useAttendanceStatus(user?.id);

  // When the trainee arrives signed in from /verify or /register, check them in
  // automatically (reusing the same action as a manual scan) instead of making
  // them scan the entrance code. Returns an error string if that write failed.
  const { error: autoCheckInError } = useAutoCheckInAfterVerify();

  if (!isAllowed) {
    return null;
  }

  return (
    <div className='flex h-[100dvh] flex-col'>
      <TraineeHeader />

      {/* Automatic check-in failure. Shown instead of a false "checked in"
          state: the trainee is genuinely not checked in, so the manual scan
          remains the way forward. */}
      {autoCheckInError && (
        <div className='flex-shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2.5'>
          <div className='mx-auto max-w-6xl'>
            <Alert tone='danger' role='alert'>
              {autoCheckInError}
            </Alert>
          </div>
        </div>
      )}

      {/* The page, not the phone frame, is what scrolls when the scanner
          content is taller than the viewport. `min-h-0` lets the flex child
          shrink so the header always stays put. */}
      <main className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden'>
        <StudentMobileView />
      </main>
    </div>
  );
}
