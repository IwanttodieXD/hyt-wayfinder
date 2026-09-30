'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';

export default function KioskStationView() {
  const { activeStudents, clockIn, clockOut, startRouteView, status, activeRecordId, student } = useClockInStore();
  const { user } = useAuthStore();
  const { addRecord, clockOutRecord, getActiveCount, getCompletedTodayCount, fetchTodayRecords } = useRecordsStore();
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<{ name: string; id: string; action: 'in' | 'out' } | null>(null);
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
      try {
        if (scannerRef.current) {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        }
      } catch {
        // ignore stop errors
      }

      setScannerActive(false);

      // Toggle: if already clocked in -> clock out; otherwise -> clock in
      if (status === 'clocked-in' && activeRecordId) {
        setScanResult({ name: user?.name || 'Student', id: scannedUserId, action: 'out' });

        await clockOutRecord(activeRecordId);
        clockOut();
      } else {
        setScanResult({ name: user?.name || 'Student', id: scannedUserId, action: 'in' });

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

        setTimeout(() => {
          startRouteView();
        }, 1500);
      }
    },
    [user, student, status, activeRecordId, clockIn, clockOut, addRecord, clockOutRecord, startRouteView]
  );

  const startCamera = useCallback(async () => {
    setScanError('');
    setScanResult(null);
    handledRef.current = false;

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
      setScanError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start camera. ' + (err?.message || 'Please ensure a camera is connected and you are on HTTPS/localhost.')
      );
      setScannerActive(false);
    }
  }, [handleScanSuccess]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {
      // ignore
    }
    setScannerActive(false);
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, []);

  const handleGuestScan = () => {
    startCamera();
  };

  return (
    <div className="w-full h-full bg-slate-950 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">HYT Student Check-In Station</h1>
              <p className="text-slate-400 text-lg">Main Lobby · Kiosk Terminal #01</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-300 font-bold text-lg uppercase tracking-wider">Station Active</span>
            </div>
          </div>

          {/* Live Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-users text-cyan-400 text-2xl"></i>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Active Students</p>
                  <p className="text-white text-3xl font-bold">{activeCount}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-mug-hot text-blue-400 text-2xl"></i>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">On Break</p>
                  <p className="text-white text-3xl font-bold">{onBreakCount}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-clock text-green-400 text-2xl"></i>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Current Time</p>
                  <p className="text-white text-3xl font-bold">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Panel */}
          <div className="glass-panel border-slate-800 p-8 rounded-3xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
                <i className="fa-solid fa-qrcode text-cyan-400"></i>
                <span className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">
                  Student Check-In
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Scan to Clock In</h2>
              <p className="text-slate-400">Use your mobile app to scan this QR code</p>
            </div>

            {/* Large QR Code */}
            <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 mb-6">
              <QRCode
                value="HYT-KIOSK-01-CHECKIN-STATION"
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-cyan-400 font-bold text-xs">1</span>
                </div>
                <p className="text-slate-300">Open the HYT Student Mobile App</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-cyan-400 font-bold text-xs">2</span>
                </div>
                <p className="text-slate-300">Position QR code within the scanner frame</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-cyan-400 font-bold text-xs">3</span>
                </div>
                <p className="text-slate-300">Receive your 3D route to your assigned room</p>
              </div>
            </div>
          </div>

          {/* Guest Check-In Panel */}
          <div className="glass-panel border-slate-800 p-8 rounded-3xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
                <i className="fa-solid fa-id-card text-purple-400"></i>
                <span className="text-purple-300 font-semibold text-sm uppercase tracking-wider">
                  Webcam Scanner
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Scan Your Personal QR</h2>
              <p className="text-slate-400">Show the QR code from your profile to clock in</p>
            </div>

            {/* Camera Viewer */}
            <div
              className={`
                relative bg-slate-900 border-2 rounded-2xl p-4 mb-6 transition-all duration-300 overflow-hidden
                ${scannerActive ? 'border-cyan-500 shadow-lg shadow-cyan-500/30' : 'border-slate-700'}
              `}
            >
              <div id="qr-reader" className="w-full" />

              {!scannerActive && !scanResult && !scanError && (
                <div className="text-center py-12">
                  <i className="fa-solid fa-camera text-slate-600 text-6xl mb-4"></i>
                  <p className="text-slate-500 text-sm">Camera is off</p>
                </div>
              )}

              {scanError && (
                <div className="text-center py-8">
                  <i className="fa-solid fa-circle-exclamation text-red-500 text-5xl mb-3"></i>
                  <p className="text-red-400 text-sm px-4">{scanError}</p>
                </div>
              )}

              {scanResult && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">Name</span>
                    <span className="text-white font-semibold">{scanResult.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">User ID</span>
                    <span className="text-white font-semibold font-mono text-xs">{scanResult.id}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4 text-green-400">
                    <i className="fa-solid fa-circle-check"></i>
                    <span className="font-semibold">
                      {scanResult.action === 'in' ? 'Clocked In! Loading route...' : 'Clocked Out! Goodbye.'}
                    </span>
                  </div>
                </div>
              )}

              {scannerActive && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-cyan-300 text-xs font-semibold">LIVE</span>
                </div>
              )}
            </div>

            <button
              onClick={scannerActive ? stopCamera : handleGuestScan}
              className="
                w-full px-6 py-4 rounded-xl font-bold text-base text-white
                bg-gradient-to-r from-purple-500 to-pink-500
                shadow-lg shadow-purple-500/30
                hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]
                active:scale-95
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <i className={`fa-solid ${scannerActive ? 'fa-stop' : 'fa-camera'} mr-2`}></i>
              {scannerActive ? 'Stop Camera' : 'Start Camera Scan'}
            </button>

            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-info-circle text-blue-400 mt-0.5"></i>
                <p className="text-blue-300 text-xs leading-relaxed">
                  Open your profile menu and select &quot;My QR Code&quot; to display your personal QR code,
                  then point it at the camera to clock in and receive your 3D route.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>HYT Global Institute · Visitor Management System v2.0</p>
          <p className="mt-1">For assistance, contact Security Desk: Ext. 1100</p>
        </div>
      </div>
    </div>
  );
}
