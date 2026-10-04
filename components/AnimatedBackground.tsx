/**
 * Decorative animated background, rendered once at the app root.
 *
 * Pure CSS (see `.animated-bg` in globals.css): big angled checker squares with
 * scattered stars. The whole pattern beats by swelling in size and drifts
 * up-and-right at 45 degrees. Fixed at z-index -1 so it sits behind everything,
 * and `aria-hidden` because it carries no meaning. Panels stay opaque; only the
 * page wrappers are transparent.
 */
export default function AnimatedBackground() {
  return (
    <div className='animated-bg' aria-hidden='true'>
      <div className='animated-bg__drift'>
        <div className='animated-bg__pattern' />
      </div>
    </div>
  );
}
