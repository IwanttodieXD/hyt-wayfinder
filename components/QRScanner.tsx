'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// The QR value displayed by the kiosk station
const KIOSK_QR_VALUE = 'HYT-KIOSK-01-CHECKIN-STATION';

export default function QRScanner() {
  const { status, clockIn, startRouteView, student } = useClockInStore();
  const { addRecord } = useRecordsStore();
  const { user } = useAuthStore();

  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      // Accept the kiosk QR; ignore personal user QRs here
      if (!decodedText.startsWith('HYT-KIOSK-')) {
        setScanError('Invalid QR code. Scan the kiosk check-in QR code.');
        handledRef.current = false;
        return;
      }

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
      setScanning(true);

      // Run the clock-in flow + DB record
      clockIn();
      if (user) {
        await addRecord({
          userId: user.id,
          destination: student.destination,
          building: student.building,
          room: student.room,
          timeIn: new Date(),
        });
      }

      setTimeout(() => {
        startRouteView();
        setScanning(false);
      }, 1200);
    },
    [user, student, clockIn, addRecord, startRouteView]
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
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
      {/* Camera Viewfinder */}
      <div className="relative w-full max-w-xs aspect-square">
        {/* Viewfinder Frame */}
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50 overflow-hidden">
          {/* Real Camera Feed */}
          <div id="qr-reader-mobile" className="w-full h-full" />

          {/* Placeholder when camera is off */}
          {!scannerActive && !scanning && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
              <div className="text-center">
                <i className="fa-solid fa-camera text-slate-600 text-5xl mb-3"></i>
                <p className="text-slate-500 text-xs">Camera is off</p>
              </div>
            </div>
          )}

          {/* Scanning Laser (overlay) */}
          {scannerActive && !scanning && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50 pointer-events-none"
              style={{ animation: 'scan 2s ease-in-out infinite', top: '50%' }}
            ></div>
          )}

          {/* Success Animation */}
          {scanning && (
            <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                <i className="fa-solid fa-check text-white text-3xl"></i>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {scanError && !scannerActive && !scanning && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4">
              <i className="fa-solid fa-circle-exclamation text-red-500 text-4xl mb-3"></i>
              <p className="text-red-400 text-xs text-center">{scanError}</p>
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
              className={`absolute ${position} border-cyan-400 w-8 h-8 pointer-events-none ${scanning ? 'border-green-400' : ''}`}
            ></div>
          ))}
        </div>

        {/* Targeting Reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 border border-cyan-400/30 rounded-lg"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30"></div>
          </div>
        </div>

        {/* LIVE indicator */}
        {scannerActive && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-cyan-300 text-xs font-semibold">LIVE</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
          <i className="fa-solid fa-camera text-cyan-400 text-sm"></i>
          <span className="text-cyan-300 text-sm font-medium">
            {status === 'not-clocked-in'
              ? scannerActive
                ? 'Point at the kiosk QR code'
                : 'Start camera to scan'
              : 'Ready to Navigate'}
          </span>
        </div>

        <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6">
          {status === 'not-clocked-in'
            ? 'Scan the kiosk QR code to clock in and receive your route to the destination.'
            : 'You are clocked in. View your 3D route to the destination.'}
        </p>
      </div>

      {/* Action Buttons */}
      {status === 'not-clocked-in' ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={scannerActive ? stopCamera : startCamera}
            disabled={scanning}
            className="
              relative w-full px-8 py-4 rounded-xl font-bold text-base text-white
              bg-gradient-to-r from-cyan-500 to-blue-500
              shadow-lg shadow-cyan-500/30
              hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105
              active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              overflow-hidden group
            "
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <i className={`fa-solid ${scannerActive ? 'fa-stop' : 'fa-camera'}`}></i>
              {scannerActive ? 'Stop Camera' : 'Start Camera Scan'}
            </span>
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%)',
              }}
            ></span>
          </button>
        </div>
      ) : (
        <button
          onClick={startRouteView}
          className="
            relative px-8 py-4 rounded-xl font-bold text-base text-white
            bg-gradient-to-r from-cyan-500 to-blue-500
            shadow-lg shadow-cyan-500/30
            hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105
            active:scale-95
            transition-all duration-200
            overflow-hidden group
          "
        >
          <span className="relative z-10 flex items-center gap-2">
            <i className="fa-solid fa-route"></i>
            View 3D Route
          </span>
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%)',
            }}
          ></span>
        </button>
      )}
    </div>
  );
}