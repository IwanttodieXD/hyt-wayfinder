'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';

export default function QRScanner() {
  const { status, clockIn, startRouteView, student } = useClockInStore();
  const { addRecord } = useRecordsStore();
  const { user } = useAuthStore();
  const [scanAnimation, setScanAnimation] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    // Continuous laser scan animation
    const interval = setInterval(() => {
      setScanAnimation(true);
      setTimeout(() => setScanAnimation(false), 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSimulateScan = async () => {
    setScanning(true);

    // Simulate scan success animation
    setTimeout(async () => {
      clockIn();
      
      // Create database record if user is logged in
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
      }, 1000);
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
      {/* Camera Viewfinder */}
      <div className="relative w-full max-w-xs aspect-square">
        {/* Viewfinder Frame */}
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50 overflow-hidden">
          {/* Simulated Camera Feed */}
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative">
            {/* Noise/Grain Effect */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
              }}
            ></div>

            {/* Scanning Laser */}
            {scanAnimation && !scanning && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50 animate-scan"
                style={{
                  animation: 'scan 2s ease-in-out',
                }}
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
          </div>

          {/* Corner Brackets */}
          {[
            'top-0 left-0 border-t-4 border-l-4',
            'top-0 right-0 border-t-4 border-r-4',
            'bottom-0 left-0 border-b-4 border-l-4',
            'bottom-0 right-0 border-b-4 border-r-4',
          ].map((position, idx) => (
            <div
              key={idx}
              className={`absolute ${position} border-cyan-400 w-8 h-8 ${scanning ? 'border-green-400' : ''}`}
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
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
          <i className="fa-solid fa-camera text-cyan-400 text-sm"></i>
          <span className="text-cyan-300 text-sm font-medium">
            {status === 'not-clocked-in' ? 'Position QR Code in Frame' : 'Ready to Navigate'}
          </span>
        </div>

        <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6">
          {status === 'not-clocked-in'
            ? 'Scan the kiosk QR code to clock in and receive your route to the destination.'
            : 'You are clocked in. View your 3D route to the destination.'}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={status === 'not-clocked-in' ? handleSimulateScan : startRouteView}
        disabled={scanning}
        className="
          relative px-8 py-4 rounded-xl font-bold text-base text-white
          bg-gradient-to-r from-cyan-500 to-blue-500
          shadow-lg shadow-cyan-500/30
          hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105
          active:scale-95
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          overflow-hidden group
        "
      >
        <span className="relative z-10 flex items-center gap-2">
          <i className={`fa-solid ${status === 'not-clocked-in' ? 'fa-qrcode' : 'fa-route'}`}></i>
          {status === 'not-clocked-in' ? 'Simulate Scan Kiosk QR' : 'View 3D Route'}
        </span>

        {/* Shimmer Effect */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%)',
          }}
        ></span>
      </button>
    </div>
  );
}
