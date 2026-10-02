'use client';

import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { DESTINATION_ROUTES, type DestinationRoute } from '@/lib/wayfinding';

// Destination labels go into a generated print document, so escape them
// rather than trusting the registry text.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function KioskStationView() {
  const { student } = useClockInStore();
  const { user } = useAuthStore();
  const { getActiveCount, getCompletedTodayCount, fetchTodayRecords } =
    useRecordsStore();

  // Load today's records so the active/on-break counts are live
  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  const activeCount = getActiveCount();
  const onBreakCount = getCompletedTodayCount();

  // Pulls the live SVG out of the panel so the print window can clone it as
  // vector markup - a rasterised screenshot would blur when printed.
  const handlePrintQR = (route: DestinationRoute) => {
    const panel = document.querySelector(`[data-qr-panel="${route.id}"]`);
    const svg = panel?.querySelector('svg');
    if (!svg) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(
      '<!doctype html><html><head><title>' +
        escapeHtml(route.label) +
        '</title>' +
        '<meta charset="utf-8" />' +
        '<style>' +
        'body { font-family: Arial, Helvetica, sans-serif; color: #111; ' +
        'display: flex; flex-direction: column; align-items: center; ' +
        'justify-content: center; height: 100vh; margin: 0; }' +
        'h1 { font-size: 26px; margin: 0 0 6px; text-align: center; }' +
        'p { font-size: 15px; color: #444; margin: 0 0 22px; }' +
        '.code { background: #fff; padding: 28px; border: 2px solid #111; }' +
        '.code svg { width: 320px; height: 320px; display: block; }' +
        '</style></head><body>' +
        '<h1>' +
        escapeHtml(route.label) +
        '</h1>' +
        '<p>' +
        escapeHtml(route.room + ' Ã‚Â· ' + route.building) +
        '</p>' +
        '<div class="code">' +
        svg.outerHTML +
        '</div>' +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className='w-full min-h-full bg-navy-950 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-3xl font-bold text-white mb-2'>Attendance Station</h1>
              <p className='text-navy-300'>Ground Floor Ã‚Â· Attendance Station</p>
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

          {/* Live occupancy moved to its own page. */}
          <Link
            href='/occupancy'
            className='flex items-center justify-between gap-3 glass-panel border-navy-800 p-5 rounded-lg hover:border-orange-500/50 transition-colors mb-3'
          >
            <span className='flex items-center gap-3'>
              <i className='fa-solid fa-door-open text-orange-400 text-xl'></i>
              <span className='text-white font-bold'>Inside Right Now</span>
            </span>
            <span className='flex items-center gap-3'>
              <span className='text-navy-300 text-sm'>
                {activeCount} {activeCount === 1 ? 'person' : 'people'}
              </span>
              <i className='fa-solid fa-arrow-right text-navy-400'></i>
            </span>
          </Link>
        </div>

        {/* Check-in heading */}
        <div className='text-center mb-6'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4'>
            <i className='fa-solid fa-qrcode text-orange-400'></i>
            <span className='text-orange-300 font-semibold text-sm uppercase tracking-wider'>
              Check-In
            </span>
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>Scan to Clock In</h2>
          <p className='text-navy-300'>
            Scan the QR code for the room you are headed to
          </p>
        </div>

        {/* One panel per destination, so each code is a self-contained unit
            that can be printed and posted on its own wall. Scanning one tells
            the phone which route to draw. */}
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4'>
          {DESTINATION_ROUTES.map((route) => (
            <div
              key={route.id}
              className='glass-panel border-navy-800 rounded-lg p-6 flex flex-col items-center'
            >
              {/* Fixed max width so the `width: 100%` on the QR resolves to a
                  real box, which is what lets the centering work. */}
              <div className='flex justify-center w-full mb-4'>
                {/* The SVG is looked up from the DOM when printing rather than
                    via a ref, because react-qr-code's ref type is a union that
                    is awkward to satisfy. */}
                <div
                  data-qr-panel={route.id}
                  className='bg-paper p-6 rounded-lg w-full max-w-[240px] shadow-lg'
                >
                  <QRCode
                    value={route.qrValue}
                    size={208}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox={`0 0 208 208`}
                  />
                </div>
              </div>
              <p className='text-white font-bold text-sm text-center'>
                {route.label}
              </p>
              <p className='text-navy-400 text-xs text-center mt-1'>
                {route.room} Ã‚Â· {route.building}
              </p>

              <button
                onClick={() => handlePrintQR(route)}
                className='
                  mt-4 w-full px-4 py-2.5 rounded-lg font-semibold text-sm
                  bg-orange-500 hover:bg-orange-600 text-paper
                  transition-colors duration-150
                  flex items-center justify-center gap-2
                '
              >
                <i className='fa-solid fa-print'></i>
                Print QR Code
              </button>
            </div>
          ))}
        </div>

        {/* How it works - its own panel */}
        <div className='glass-panel border-navy-800 p-6 rounded-lg'>
          <h3 className='text-white font-bold text-lg mb-4'>How it works</h3>
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

        {/* Footer Info */}
        <div className='mt-8 text-center text-navy-500 text-sm'>
          <p>HYT Global Institute Ã‚Â· Visitor Management System v2.0</p>
          <p className='mt-1'>For assistance, contact Security Desk: Ext. 1100</p>
        </div>
      </div>
    </div>
  );
}
