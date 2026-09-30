'use client';

import { useState } from 'react';
import { useClockInStore } from '@/store/clockInStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useAuthStore } from '@/store/authStore';
import QRScanner from './QRScanner';
import RouteVisualization from './RouteVisualization';

export default function StudentMobileView() {
  const { status, student, clockInTime, clockOut, activeRecordId } = useClockInStore();
  const { clockOutRecord } = useRecordsStore();
  const { user } = useAuthStore();
  const [clockingOut, setClockingOut] = useState(false);

  const handleClockOut = async () => {
    setClockingOut(true);
    if (activeRecordId) {
      await clockOutRecord(activeRecordId);
    }
    clockOut();
    setClockingOut(false);
  };

  return (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center p-4">
      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-md h-full max-h-[800px] bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* App Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-900/95 px-6 py-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-bold text-lg">{student.name}</h2>
              <p className="text-slate-400 text-xs">ID #{student.id}</p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                status === 'not-clocked-in'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}
            >
              {status === 'not-clocked-in' ? (
                <>
                  <i className="fa-solid fa-circle-xmark mr-1"></i>
                  Not Clocked In
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-check mr-1"></i>
                  Clocked In
                </>
              )}
            </div>
          </div>

          {/* Destination Info */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-location-dot text-cyan-400"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 text-xs mb-1">Assigned Destination</p>
                <h3 className="text-white font-semibold text-sm leading-tight mb-1">
                  {student.destination}
                </h3>
                <p className="text-slate-500 text-xs">
                  {student.building}, {student.room}
                </p>
              </div>
            </div>
          </div>

          {/* Clock-in Time */}
          {clockInTime && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
              <i className="fa-solid fa-clock"></i>
              <span>
                Clocked in at {clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-950">
          {status === 'not-clocked-in' || status === 'clocked-in' ? (
            <QRScanner />
          ) : (
            <RouteVisualization />
          )}
        </div>

        {/* Fallback Clock-Out button (when clocked in, not viewing route) */}
        {status === 'clocked-in' && (
          <div className="flex-shrink-0 px-6 pb-1">
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              className="
                w-full py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-red-500 to-rose-600
                shadow-lg shadow-red-500/30
                hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02]
                active:scale-95
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              <i className={`fa-solid ${clockingOut ? 'fa-spinner fa-spin' : 'fa-right-from-bracket'}`}></i>
              {clockingOut ? 'Clocking Out...' : 'Clock Out'}
            </button>
          </div>
        )}

        {/* Home Indicator (iOS style) */}
        <div className="bg-slate-950 py-2 flex items-center justify-center">
          <div className="w-32 h-1 rounded-full bg-slate-700"></div>
        </div>
      </div>
    </div>
  );
}
