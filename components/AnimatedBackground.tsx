/**
 * Decorative animated background, rendered once at the app root.
 *
 * Pure CSS (see `.animated-bg` in globals.css): a faint checkerboard with
 * scattered stars that pulses and drifts up-and-right at 45 degrees. Fixed at
 * z-index -1 so it sits behind everything, and `aria-hidden` because it carries
 * no meaning. Panels stay opaque; only the page wrappers are transparent.
 */
export default function AnimatedBackground() {
  return (
    <div className='animated-bg' aria-hidden='true'>
      <div className='animated-bg__pattern' />
    </div>
  );
}
