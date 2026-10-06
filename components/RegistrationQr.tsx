'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { registrationUrl } from '@/lib/publicUrl';

/**
 * QR code that opens the self-registration page.
 *
 * Separate from the attendance code on purpose. `ATTENDANCE_QR_VALUE` encodes
 * `HYT-KIOSK-CHECKIN-STATION`, and `parseQrValue` matches that prefix to clock
 * a visitor in or out - so replacing it with a URL would silently break
 * check-in for everyone already holding a pass. This is an additional poster.
 *
 * The URL is resolved from the browser origin, so the same code is correct on
 * localhost, on a preview deploy and in production. Resolved in an effect
 * rather than during render: reading window.location while rendering would
 * give different HTML on the server and on the client, which React reports as
 * a hydration mismatch.
 */
export default function RegistrationQr() {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(registrationUrl());
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(
      '<!doctype html><html><head><title>Visitor Registration</title>' +
        '<meta charset="utf-8" />' +
        '<style>' +
        'body { font-family: Arial, Helvetica, sans-serif; color: #111; ' +
        'display: flex; flex-direction: column; align-items: center; ' +
        'justify-content: center; height: 100vh; margin: 0; }' +
        'h1 { font-size: 30px; margin: 0 0 6px; text-align: center; }' +
        'p { font-size: 15px; color: #444; margin: 0 0 22px; }' +
        '.code { background: #fff; padding: 28px; border: 2px solid #111; }' +
        '.code svg { width: 320px; height: 320px; display: block; }' +
        '</style></head><body>' +
        '<h1>Visitor Registration</h1>' +
        '<p>Scan to register before entering</p>' +
        `<div class="code">${svgMarkup}</div>` +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // The rendered SVG is read out of the DOM rather than held in a ref, matching
  // KioskStationView's approach - react-qr-code's ref type is a union that is
  // awkward to satisfy, and reading the DOM keeps the two printers consistent.
  const svgMarkup =
    url && typeof document !== 'undefined'
      ? document
          .querySelector('[data-registration-qr] svg')
          ?.outerHTML ?? ''
      : '';

  return (
    <div className='glass-panel border-navy-800 rounded-lg p-6 flex flex-col items-center'>
      <div className='flex items-center gap-2 mb-1 self-stretch'>
        <h3 className='text-white font-bold text-lg'>Registration QR</h3>
      </div>
      <p className='text-navy-300 text-xs text-center mb-4 self-stretch'>
        Post this at the entrance. Scanning it opens the registration form -
        no account needed beforehand.
      </p>

      <div className='flex justify-center w-full mb-4'>
        <div
          data-registration-qr
          className='bg-paper p-6 rounded-lg w-full max-w-[240px] shadow-lg'
        >
          {url ? (
            <QRCode
              value={url}
              size={208}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox={`0 0 208 208`}
            />
          ) : (
            <div className='h-[208px] flex items-center justify-center text-navy-500 text-xs'>
              Preparing code
            </div>
          )}
        </div>
      </div>

      {/* The resolved URL is shown on purpose: it is the only way for staff to
          confirm the poster points at the right host before it goes on the wall,
          and a wrong origin here is invisible once the code is printed. */}
      <p className='text-navy-400 text-xs text-center break-all'>
        {url || ' '}
      </p>
      <p className='text-navy-500 text-[11px] text-center mt-1'>
        Set by <span className='font-mono'>NEXT_PUBLIC_APP_URL</span>. If this
        shows a preview hostname, the printed poster dies with that preview -
        point it at your production domain and redeploy.
      </p>

      <div className='flex flex-col sm:flex-row gap-2 w-full mt-4'>
        <button
          type='button'
          onClick={handlePrint}
          disabled={!url}
          className='flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-yellow-500 hover:bg-yellow-600 text-yellow-950 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50'
        >
          <i className='fa-solid fa-print'></i>
          Print Registration QR
        </button>
        <button
          type='button'
          disabled={!url}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard access needs a secure context and can be blocked by
              // permissions. The URL is on screen either way, so failing quietly
              // is better than showing an error nobody needs.
            }
          }}
          className='px-4 py-2.5 rounded-lg font-semibold text-sm bg-navy-800 hover:bg-navy-700 text-navy-200 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50'
        >
          <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}