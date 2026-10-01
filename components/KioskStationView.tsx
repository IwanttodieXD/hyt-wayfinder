'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';

export default function KioskStationView() {
  const { clockIn, clockOut, status, activeRecordId, student } = useClockInStore();
  const { user } = useAuthStore();
  const {
    addRecord,
    clockOutRecord,
    getActiveCount,
    getCompletedTodayCount,
    fetchTodayRecords,
  } = useRecordsStore();
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<{
    name: string;
    id: string;
    action: 'in' | 'out';
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  // Load today's records so the active/on-break counts are live
  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // Refresh counts whenever a scan completes
  useEffect(() => {
    if (scanResult) {
      fetchTodayRecords();
    }
  }, [scanResult, fetchTodayRecords]);

  const activeCount = getActiveCount();
  const onBreakCount = getCompletedTodayCount();

  // Stop only if the scanner is actually running. html5-qrcode throws
  // "Cannot stop, scanner is not running or paused" otherwise.
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

      // Validate the expected QR format: HYT-USER:<userId>
      if (!decodedText.startsWith('HYT-USER:')) {
        setScanError('Invalid QR code. Please scan your personal HYT QR code.');
        handledRef.current = false;
        return;
      }

      const scannedUserId = decodedText.replace('HYT-USER:', '').trim();

      // Stop the camera
      await stopScanner();

      setScannerActive(false);

      // Toggle: if already clocked in -> clock out; otherwise -> clock in
      if (activeRecordId && status !== 'not-clocked-in') {
        setScanResult({
          name: user?.name || 'Student',
          id: scannedUserId,
          action: 'out',
        });

        await clockOutRecord(activeRecordId);
        clockOut();
      } else {
        setScanResult({
          name: user?.name || 'Student',
          id: scannedUserId,
          action: 'in',
        });

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

        // No 3D route on a kiosk scan. The route is a personal flow driven by
        // scanning the kiosk QR in the mobile view, so it is intentionally not
        // started here.
      }
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
    setScanResult(null);
    handledRef.current = false;

    // Html5Qrcode throws if the element id isn't in the DOM yet. On the first
    // mount (and when switching into kiosk mode) it may not be.
    if (typeof document === 'undefined' || !document.getElementById('qr-reader')) {
      setScanError('Camera is still loading. Please try starting the scan again.');
      setScannerActive(false);
      return;
    }

    // Release any previous scanner before making another one.
    await stopScanner();

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // per-frame failure; ignore
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      scannerRef.current = null;
      setScanError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start camera. ' +
              (err?.message ||
                'Please ensure a camera is connected and you are on HTTPS/localhost.')
      );
      setScannerActive(false);
    }
  }, [handleScanSuccess, stopScanner]);

  const stopCamera = useCallback(async () => {
    await stopScanner();
    setScannerActive(false);
  }, [stopScanner]);

  useEffect(() => {
    // Release the camera on unmount, but only stop it if it's live.
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

  const handleGuestScan = () => {
    startCamera();
  };

  return (
    <div className='w-full min-h-full bg-navy-950 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-3xl font-bold text-white mb-2'>Attendance Station</h1>
              <p className='text-navy-300'>Ground Floor · Attendance Station</p>
            </div>
            <div className='flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30'>
              <div className='w-3 h-3 rounded-full bg-green-400 animate-pulse'></div>
              <span className='text-green-300 font-bold text-lg uppercase tracking-wider'>
                Station Active
              </span>
            </div>
          </div>

          {/* Live Stats Bar */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-users text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Active Users</p>
                  <p className='text-white text-3xl font-bold'>{activeCount}</p>
                </div>
              </div>
            </div>

            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-mug-hot text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Clock Out</p>
                  <p className='text-white text-3xl font-bold'>{onBreakCount}</p>
                </div>
              </div>
            </div>

            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-green-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-clock text-green-400 text-2xl'></i>
                </div>
                <div>
                  <p className='text-navy-300 text-sm mb-1'>Current Time</p>
                  <p className='text-white text-3xl font-bold'>
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {/* QR Code Panel */}
          <div className='glass-panel border-navy-800 p-8 rounded-lg'>
            <div className='text-center mb-6'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4'>
                <i className='fa-solid fa-qrcode text-orange-400'></i>
                <span className='text-orange-300 font-semibold text-sm uppercase tracking-wider'>
                  Check-In
                </span>
              </div>
              <h2 className='text-2xl font-bold text-white mb-2'>Scan to Clock In</h2>
              <p className='text-navy-300'>Use your mobile app to scan this QR code</p>
            </div>

            {/* Large QR Code */}
            <div className='bg-paper p-8 rounded-lg mb-6'>
              <QRCode
                value='HYT-KIOSK-01-CHECKIN-STATION'
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>1</span>
                </div>
                <p className='text-navy-200'>Open the HYT-Wayfinder website</p>
              </div>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>2</span>
                </div>
                <p className='text-navy-200'>Position QR code within the scanner frame</p>
              </div>
              <div className='flex items-start gap-3 text-sm'>
                <div className='w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-400 font-bold text-xs'>3</span>
                </div>
                <p className='text-navy-200'>
                  Receive your 3D route to your assigned room
                </p>
              </div>
            </div>
          </div>

          {/* Guest Check-In Panel */}
          <div className='glass-panel border-navy-800 p-8 rounded-lg'>
            <div className='text-center mb-6'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-600/10 border border-navy-600/30 mb-4'>
                <i className='fa-solid fa-id-card text-navy-300'></i>
                <span className='text-navy-200 font-semibold text-sm uppercase tracking-wider'>
                  Webcam Scanner
                </span>
              </div>
              <h2 className='text-2xl font-bold text-white mb-2'>
                Scan Your Personal QR
              </h2>
              <p className='text-navy-300'>
                Show the QR code from your profile to clock in
              </p>
            </div>

            {/* Camera Viewer */}
            <div
              className={`
              relative bg-navy-900 border-2 rounded-lg p-4 mb-6 transition-colors duration-150 overflow-hidden
              ${scannerActive ? 'border-orange-500  ' : 'border-navy-700'}
              `}
            >
              <div id='qr-reader' className='w-full' />

              {!scannerActive && !scanResult && !scanError && (
                <div className='text-center py-3'>
                  <i className='fa-solid fa-camera text-navy-600 text-6xl mb-4'></i>
                  <p className='text-navy-500 text-sm'>Camera is off</p>
                </div>
              )}

              {scanError && (
                <div className='text-center py-5'>
                  <i className='fa-solid fa-circle-exclamation text-red-500 text-5xl mb-3'></i>
                  <p className='text-red-400 text-sm px-4'>{scanError}</p>
                </div>
              )}

              {scanResult && (
                <div className='space-y-4 animate-fade-in'>
                  <div className='flex items-center justify-between pb-2 border-b border-navy-700'>
                    <span className='text-navy-300 text-sm'>Name</span>
                    <span className='text-white font-semibold'>{scanResult.name}</span>
                  </div>
                  <div className='flex items-center justify-between pb-2 border-b border-navy-700'>
                    <span className='text-navy-300 text-sm'>User ID</span>
                    <span className='text-white font-semibold font-mono text-xs'>
                      {scanResult.id}
                    </span>
                  </div>
                  <div className='flex items-center justify-center gap-2 mt-4 text-green-400'>
                    <i className='fa-solid fa-circle-check'></i>
                    <span className='font-semibold'>
                      {scanResult.action === 'in'
                        ? 'Clocked In! Loading route...'
                        : 'Clocked Out! Goodbye.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={scannerActive ? stopCamera : handleGuestScan}
              className='
                w-full px-4 py-3 rounded-lg font-bold text-base text-paper
                bg-orange-500 hover:bg-orange-600
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                '
            >
              <i
                className={`fa-solid ${scannerActive ? 'fa-stop' : 'fa-camera'} mr-2`}
              ></i>
              {scannerActive ? 'Stop Camera' : 'Start Camera Scan'}
            </button>

            <div className='mt-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30'>
              <div className='flex items-start gap-3'>
                <i className='fa-solid fa-info-circle text-orange-400 mt-0.5'></i>
                <p className='text-orange-300 text-xs leading-relaxed'>
                  Open your profile menu and select &quot;My QR Code&quot; to display your
                  personal QR code, then point it at the camera to clock in and receive
                  your 3D route.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className='mt-8 text-center text-navy-500 text-sm'>
          <p>HYT Global Institute · Visitor Management System v2.0</p>
          <p className='mt-1'>For assistance, contact Security Desk: Ext. 1100</p>
        </div>
      </div>
    </div>
  );
}
