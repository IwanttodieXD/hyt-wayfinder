'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useState } from 'react';
import QRCode from 'react-qr-code';

export default function KioskStationView() {
  const { activeStudents, dailyVisits } = useClockInStore();
  const [guestScanActive, setGuestScanActive] = useState(false);

  const handleGuestScan = () => {
    setGuestScanActive(true);
    setTimeout(() => {
      setGuestScanActive(false);
    }, 3000);
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
                  <p className="text-white text-3xl font-bold">{activeStudents}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-chart-line text-blue-400 text-2xl"></i>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Daily Total Visits</p>
                  <p className="text-white text-3xl font-bold">{dailyVisits}</p>
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
                  Guest Visitor
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Walk-In Check-In</h2>
              <p className="text-slate-400">For visitors without a student ID</p>
            </div>

            {/* ID Scan Simulation */}
            <div
              className={`
                relative bg-slate-900 border-2 rounded-2xl p-8 mb-6 transition-all duration-300
                ${guestScanActive ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-slate-700'}
              `}
            >
              {!guestScanActive ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-address-card text-slate-600 text-6xl mb-4"></i>
                  <p className="text-slate-500 text-sm">Place ID card on scanner bed</p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">Name</span>
                    <span className="text-white font-semibold">Maria Santos</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">ID Number</span>
                    <span className="text-white font-semibold">G-2026-5521</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <span className="text-slate-400 text-sm">Purpose</span>
                    <span className="text-white font-semibold">Campus Tour</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-6 text-green-400">
                    <i className="fa-solid fa-circle-check"></i>
                    <span className="font-semibold">Thermal Badge Printing...</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGuestScan}
              disabled={guestScanActive}
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
              <i className="fa-solid fa-fingerprint mr-2"></i>
              Simulate Guest ID Scan
            </button>

            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-info-circle text-blue-400 mt-0.5"></i>
                <p className="text-blue-300 text-xs leading-relaxed">
                  Guest visitors will receive a temporary thermal badge with QR code for building access
                  and tracking.
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
