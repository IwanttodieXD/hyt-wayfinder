'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';

// Check-in QR value. Print this on paper (or show it on a laptop) at the
// check-in station; the mobile app scans it to clock in and back out.
const CHECKIN_QR_VALUE = 'HYT-KIOSK-01-CHECKIN-STATION';

export default function QRScanner() {
  const { status, clockIn, clockOut, activeRecordId, startRouteView, student } =
    useClockInStore();
  const { addRecord, clockOutRecord } = useRecordsStore();
  const { user } = useAuthStore();

  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

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

      // Accept the check-in QR; ignore personal user QRs here
      if (!decodedText.startsWith('HYT-KIOSK-')) {
        setScanError('Invalid QR code. Scan the check-in QR code.');
        handledRef.current = false;
        return;
      }

      // Stop the camera
      await stopScanner();

      setScannerActive(false);
      setScanning(true);

      // Already clocked in? The same check-in QR scans you back out.
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
      let recordId: string | undefined;
      if (user) {
        const result = await addRecord({
          userId: user.id,
          destination: student.destination,
          building: student.building,
          room: student.room,
          timeIn: new Date(),
        });
        recordId = result.recordId;
      }
      clockIn(recordId);
      setTimeout(() => setScanning(false), 1200);
    },
    [
      user,
      student,
      status,
      activeRecordId,
      clockIn,
      clockOut,
      addRecord,
      clockOutRecord,
      stopScanner,
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
        { fps: 10, qrbox: { width: 200, height: 200 } },
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
    <div className='w-full h-full flex flex-col items-center p-4 relative'>
      {/* Camera Viewfinder */}
      <div className='relative w-full max-w-xs aspect-square'>
        {/* Viewfinder Frame */}
        <div className='absolute inset-0 rounded-lg border-2 border-orange-400/50 overflow-hidden'>
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

          {/* Corner Brackets */}
          {[
            'top-0 left-0 border-t-4 border-l-4',
            'top-0 right-0 border-t-4 border-r-4',
            'bottom-0 left-0 border-b-4 border-l-4',
            'bottom-0 right-0 border-b-4 border-r-4',
          ].map((position, idx) => (
            <div
              key={idx}
              className={`absolute ${position} border-orange-400 w-8 h-8 pointer-events-none ${scanning ? 'border-green-400' : ''}`}
            ></div>
          ))}
        </div>

        {/* Targeting Reticle */}
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='relative w-48 h-48'>
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
          className={`relative w-12 h-6 rounded-full transition-colors duration-150 ${
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
                ? 'Point at the check-in QR code'
                : 'Clocked in — scan again to clock out'}
            </span>
          </div>
        )}

        <p className='text-navy-300 text-xs max-w-xs mx-auto mb-6'>
          {showQR
            ? 'Present your personal QR code to the check-in scanner to clock in.'
            : status === 'not-clocked-in'
              ? 'Scan the check-in QR code to clock in and receive your route to the destination.'
              : 'You are clocked in. Scan the same check-in QR code again to clock out, or view your 3D route.'}
        </p>
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
