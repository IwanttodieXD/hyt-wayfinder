import Link from 'next/link';

/**
 * 404 page.
 *
 * Next's built-in not-found screen paints a white sheet with black text, which
 * is a bright hole punched through the dark console. This one borrows the
 * permanent navy of the app header - in both themes - so the white copy stays
 * legible and the brand still reads. The colours are expressed as literals
 * rather than theme tokens on purpose: the light theme's tokens resolve to dark
 * text/ivory surfaces, which would vanish on this navy backdrop.
 */
export default function NotFound() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center bg-[#0a1027] px-6 py-16 text-center text-white'>
      <p className='text-xs font-semibold uppercase tracking-[0.28em] text-[#facc15]'>
        404
      </p>
      <h1 className='mt-3 text-3xl font-bold text-white sm:text-5xl'>
        Page not found
      </h1>
      <p className='mt-4 max-w-md text-sm leading-relaxed text-white/70'>
        The page you are looking for does not exist or has moved. Head back to
        verification to continue, or scan the entrance QR code again.
      </p>
      <Link
        href='/verify'
        className='mt-8 inline-flex items-center gap-2 rounded-xl bg-[#eab308] px-5 py-2.5 text-sm font-semibold text-[#0a1027] transition-colors hover:bg-[#facc15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1027]'
      >
        <i className='fa-solid fa-arrow-left text-xs' aria-hidden='true'></i>
        Back to verification
      </Link>
    </main>
  );
}
