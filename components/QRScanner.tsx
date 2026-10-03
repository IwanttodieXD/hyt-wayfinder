'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseQrValue, getRoute, routeIdForDestination } from '@/lib/wayfinding';
import QRCode from 'react-qr-code';

export default function QRScanner() {
  const {
    status,
    clockIn,
    clockOut,
    activeRecordId,
    startRouteView,
    setActiveRoute,
  } = useClockInStore();
  const { addRecord, clockOutRecord } = useRecordsStore();
  const { enterRoom, getCurrentRoom } = useRoomPresenceStore();
  const { user } = useAuthStore();

  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showQR, setShowQR] = useState(false);
  // Room of the last successful door scan, so the viewfinder can confirm where
  // the person was recorded rather than leaving them guessing.
  const [lastRoom, setLastRoom] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
const handledRef = useRef(false);
  // The viewfinder element, so the scan box can be sized to what's actually
  // rendered. A hardcoded px value drifts out of sync with the frame on every
  // screen that isn't the one it was tuned for.
  const frameRef = useRef<HTMLDivElement | null>(null);
  // Read by the qrbox callback below. A ref rather than state, because
  // startCamera's closure is created once - reading state there would pin it to
  // whatever the frame measured on first render.
  const frameSizeRef = useRef(0);

  // Track the rendered frame so the scanner's search box matches it. Also covers
  // rotation and the frame resizing between the scanner and the 3D route view.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const measure = () => {
      frameSizeRef.current = Math.min(el.clientWidth, el.clientHeight);
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stop only if the scanner is actually running. html5-qrcode throws
  // "Cannot stop, scanner is not running or paused" otherwise, which logs a
  // console error every time the view unmounts or the camera is already off.
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Teardown is best-effort; never block the UI on it.
    }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      const parsed = parseQrValue(decodedText);

      if (!parsed) {
        setScanError('Not an HYT QR code. Scan the ground floor check-in code or a room door code.');
        handledRef.current = false;
        return;
      }

      // Stop the camera
      await stopScanner();

      setScannerActive(false);
      setScanning(true);

      // A room door code only records that this person is in that room. It must
      // never touch attendance, so branch before any clock-in state is read.
      if (parsed.kind === 'room') {
        if (!user) {
          setScanError('Sign in before scanning a room code.');
          handledRef.current = false;
          setTimeout(() => setScanning(false), 1500);
          return;
        }

        const route = getRoute(parsed.routeId);
        const result = await enterRoom({
          userId: user.id,
          room: parsed.room,
          roomLabel: route.label,
        });

        if (!result.success) {
          setScanError(result.error || 'Could not record your room. Please try again.');
        } else {
          setLastRoom(parsed.room);
        }

        handledRef.current = false;
        setTimeout(() => setScanning(false), 1500);
        return;
      }

      // Ground floor code: this is the attendance action.
      // Scanning again while clocked in clocks back out.
      if (status !== 'not-clocked-in') {
        if (!activeRecordId) {
          // Should not happen, but without a record id there is no row to
          // close. Say so instead of silently showing "clocked out".
          setScanError('Could not clock out: no active check-in was found.');
          handledRef.current = false;
          setTimeout(() => setScanning(false), 1200);
          return;
        }

        const result = await clockOutRecord(activeRecordId);

        if (!result.success) {
          // Keep the session marked as clocked in so the next scan retries
          // rather than losing the record.
          setScanError(result.error || 'Could not clock out. Please try again.');
          handledRef.current = false;
          setTimeout(() => setScanning(false), 2000);
          return;
        }

        clockOut();
        setTimeout(() => setScanning(false), 1200);
        return;
      }

      // First scan: clock in + create the DB record. Keep the returned record
      // id so the next scan can close the same row (time_out).
      // The ground floor code carries no room, so the route comes from the
      // person's assigned destination rather than from the code.
      setActiveRoute(routeIdForDestination(user?.destination));
      let recordId: string | undefined;
      if (user) {
        // The ground floor code carries no room, so the destination comes from
        // the person's profile and the building/room from the route registry.
        const route = getRoute(routeIdForDestination(user.destination));
        const result = await addRecord({
          userId: user.id,
          destination: user.destination || route.label,
          building: route.building,
          room: route.room,
          timeIn: new Date(),
        });
        recordId = result.recordId;
      }
      clockIn(recordId);
      setTimeout(() => setScanning(false), 1200);
    },
    [
      user,
      status,
      activeRecordId,
      clockIn,
      clockOut,
      addRecord,
      clockOutRecord,
      stopScanner,
      enterRoom,
      setActiveRoute,
    ]
  );

  const startCamera = useCallback(async () => {
    setScanError('');
    handledRef.current = false;

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-mobile');
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          // Search box tracks the rendered frame so the highlighted region always
          // matches the brackets on screen. Falls back to a sane 250px on the
          // first run, before layout has been measured.
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const side =
              frameSizeRef.current ||
              Math.min(viewfinderWidth, viewfinderHeight) ||
              250;
            const box = Math.floor(side * 0.8);
            return { width: box, height: box };
          },
          // Keep the video square: without this html5-qrcode letterboxes the
          // feed to the container's aspect and the frame stops lining up.
          aspectRatio: 1,
        },
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // per-frame failure; ignore
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      setScanError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start camera. ' +
              (err?.message ||
                'Please ensure a camera is connected and you are on HTTPS/localhost.')
      );
      setScannerActive(false);
    }
  }, [handleScanSuccess]);

  const stopCamera = useCallback(async () => {
    await stopScanner();
    setScannerActive(false);
  }, [stopScanner]);

  // Toggle the viewfinder between the live camera and the personal QR code
  const handleToggleQR = useCallback(async () => {
    if (showQR) {
      setShowQR(false);
      startCamera();
    } else {
      await stopCamera();
      setShowQR(true);
    }
  }, [showQR, startCamera, stopCamera]);

  useEffect(() => {
    // Always release the camera on unmount, but only stop it if it's live.
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      try {
        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
        }
        scanner.clear();
      } catch {
        // best-effort
      }
    };
  }, []);
  // Auto-open the camera on load
  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='
        w-full h-full flex flex-col items-center relative
        p-4 pt-5 pb-3
        // Safe-area padding keeps the frame clear of notches and the home
        // indicator on phones that have both.
        pb-[max(0.75rem,env(safe-area-inset-bottom))]
        overflow-y-auto
      '>
      {/* Camera Viewfinder. `aspect-square` keeps it square, and the size is derived
          from the available width/height rather than hardcoded, so it fills a
          small phone without overflowing a large one. dvh matters because mobile
          browsers report vh against a viewport that includes the collapsing
          address bar, which pushed the frame off screen on short screens. */}
          <div
            ref={frameRef}
            className='
              relative w-full aspect-square shrink-0
              max-w-[min(100%,calc(100dvh-20rem))]
            '
          >
        {/* Viewfinder Frame */}
        <div className='absolute inset-0 rounded-lg border-2 border-orange-400/50 overflow-hidden bg-navy-900'>
          {/* Real Camera Feed */}
          <div id='qr-reader-mobile' className='w-full h-full' />

          {/* Placeholder when camera is off */}
          {!scannerActive && !scanning && (
            <div className='absolute inset-0 bg-navy-900 flex items-center justify-center'>
              <div className='text-center'>
                <i className='fa-solid fa-camera text-navy-600 text-5xl mb-3'></i>
                <p className='text-navy-500 text-xs'>Camera is off</p>
              </div>
            </div>
          )}

          {/* Scanning Laser (overlay) */}
          {scannerActive && !scanning && (
            <div
              className='absolute left-0 right-0 h-0.5 pointer-events-none'
              style={{ animation: 'scan 2s ease-in-out infinite', top: '50%' }}
            ></div>
          )}

          {/* Success Animation */}
          {scanning && (
            <div className='absolute inset-0 bg-green-500/20 flex items-center justify-center animate-pulse'>
              <div className='w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-scale-in'>
                <i className='fa-solid fa-check text-paper text-3xl'></i>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {scanError && !scannerActive && !scanning && (
            <div className='absolute inset-0 bg-navy-950/90 flex flex-col items-center justify-center p-4'>
              <i className='fa-solid fa-circle-exclamation text-red-500 text-4xl mb-3'></i>
              <p className='text-red-400 text-xs text-center'>{scanError}</p>
            </div>
          )}

          {/* Corner brackets. Sized as a percentage of the frame so they stay
                proportionate on every screen, rather than a fixed 32px that
                looked oversized on a small phone. */}
          {[
            'top-0 left-0 border-t-4 border-l-4',
            'top-0 right-0 border-t-4 border-r-4',
            'bottom-0 left-0 border-b-4 border-l-4',
            'bottom-0 right-0 border-b-4 border-r-4',
          ].map((position, idx) => (
            <div
              key={idx}
              className={`absolute ${position} border-orange-400 w-[15%] h-[15%] min-w-6 min-h-6 pointer-events-none rounded-sm ${scanning ? 'border-green-400' : ''}`}
            ></div>
          ))}
        </div>

        {/* Targeting Reticle. Tracks the scan box (80% of the frame) rather than
            sitting at a fixed 192px inside a frame that may now be much wider or
            narrower. */}
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='relative w-[80%] aspect-square'>
            <div className='absolute inset-0 border border-orange-400/30 rounded-lg'></div>
            <div className='absolute top-1/2 left-0 right-0 h-px bg-orange-400/30'></div>
            <div className='absolute left-1/2 top-0 bottom-0 w-px bg-orange-400/30'></div>
          </div>
        </div>

        {/* Personal QR code shown in place of the camera */}
        {showQR && (
          <div className='absolute inset-0 z-20 bg-paper flex flex-col items-center justify-center p-4'>
            {user?.qrCode ? (
              <QRCode
                value={user.qrCode}
                size={180}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox='0 0 180 180'
              />
            ) : (
              <p className='text-navy-500 text-sm text-center'>
                No QR code available for your account.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Camera / My QR switch */}
      <div className='mt-4 flex items-center justify-center gap-3'>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            !showQR ? 'text-orange-300' : 'text-navy-500'
          }`}
        >
          <i className='fa-solid fa-camera'></i>
          Camera
        </span>
        <button
          type='button'
          role='switch'
          aria-checked={showQR}
          aria-label='Toggle between camera and personal QR code'
          onClick={handleToggleQR}
          // The visual pill stays 48x24, but the hit area is padded out to
          // 48x44 - the minimum comfortable touch target on a phone.
          className={`relative w-12 h-6 my-2.5 rounded-full transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] ${
            showQR ? 'bg-orange-500' : 'bg-navy-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-paper shadow transition-transform duration-150 ${
              showQR ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            showQR ? 'text-orange-300' : 'text-navy-500'
          }`}
        >
          <i className='fa-solid fa-qrcode'></i>
          My QR
        </span>
      </div>

      {/* Instructions */}
      <div className='mt-5 text-center'>
        {showQR ? (
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4'>
            <i className='fa-solid fa-qrcode text-orange-400 text-sm'></i>
            <span className='text-orange-300 text-sm font-medium'>
              Show this QR at check-in
            </span>
          </div>
        ) : !scannerActive && !scanning ? (
          <button
            onClick={startCamera}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-paper text-sm font-medium transition-colors duration-150 mb-4'
          >
            <i className='fa-solid fa-camera text-sm'></i>
            {status === 'not-clocked-in'
              ? 'Start camera to scan'
              : 'Scan again to clock out'}
          </button>
        ) : (
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4'>
            <i className='fa-solid fa-camera text-orange-400 text-sm'></i>
            <span className='text-orange-300 text-sm font-medium'>
              {status === 'not-clocked-in'
                ? 'Point at the ground floor check-in code'
                : 'Clocked in — scan again to clock out'}
            </span>
          </div>
        )}

        <p className='text-navy-300 text-xs max-w-xs mx-auto mb-2'>
          {showQR
            ? 'Present your personal QR code to the check-in scanner to clock in.'
            : status === 'not-clocked-in'
              ? 'Scan the ground floor code to clock in and receive your route.'
              : 'You are clocked in. Scan the ground floor code again to clock out, or view your 3D route.'}
        </p>

        {/* Room codes are a separate action from attendance, so they are called
            out separately rather than folded into the instructions above. */}
        <p className='text-navy-500 text-xs max-w-xs mx-auto mb-4'>
          <i className='fa-solid fa-door-open'></i> Room door codes only record
          which room you are in — they do not clock you in or out.
        </p>

        {/* Confirms the last door scan actually registered. */}
        {lastRoom && !scanError && !scannerActive && (
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-4'>
            <i className='fa-solid fa-location-dot text-green-400 text-sm'></i>
            <span className='text-green-300 text-sm font-medium'>
              Recorded in {lastRoom}
            </span>
          </div>
        )}

        {/* Where they're recorded as being right now. */}
        {user && getCurrentRoom(user.id) && (
          <p className='text-navy-400 text-xs mb-4'>
            Currently in {getCurrentRoom(user.id)?.roomLabel} ·{' '}
            {getCurrentRoom(user.id)?.enteredAt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* View Route (when clocked in) */}
      {status !== 'not-clocked-in' && (
        <button
          onClick={startRouteView}
          className='
            relative px-4 py-3 rounded-lg font-bold text-base text-white
            bg-navy-700 hover:bg-navy-600
            transition-colors duration-150
            '
        >
          <span className='relative z-10 flex items-center gap-2'>
            <i className='fa-solid fa-route'></i>
            View 3D Route
          </span>
        </button>
      )}
    </div>
  );
}
