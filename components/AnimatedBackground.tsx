import type { CSSProperties } from 'react';

/**
 * Decorative animated background, rendered once at the app root.
 *
 * Two layers, both flowing up-and-right at 45 degrees:
 *
 * - a tiled field of faint stars (`.animated-bg__stars`), drifting seamlessly;
 * - a scatter of individual black squares (`.animated-bg__box`), each rotated
 *   45 degrees into a diamond and each slowly shrinking then returning to its
 *   original size on its own schedule.
 *
 * Pure CSS (see globals.css). Fixed at z-index -1 so it sits behind everything,
 * and `aria-hidden` because it carries no meaning. Panels stay opaque; only the
 * page wrappers are transparent.
 *
 * Box positions come from a small seeded PRNG rather than `Math.random`, so the
 * server and client render the exact same layout and hydration stays clean.
 */

const BOX_COUNT = 28;
const DRIFT_DURATION = 60; // seconds for one full up-and-right run
const PULSE_MIN = 5; // seconds
const PULSE_MAX = 8.5; // seconds

/** Deterministic 32-bit LCG. Same sequence on the server and the client. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface Box {
  left: number;
  top: number;
  size: number;
  driftDelay: number;
  pulseDuration: number;
  pulseDelay: number;
}

const boxes: Box[] = (() => {
  const rng = makeRng(0x5eed);
  return Array.from({ length: BOX_COUNT }, () => ({
    // Spread a little past every edge so squares keep entering and leaving.
    left: -5 + rng() * 110,
    top: -5 + rng() * 110,
    size: 16 + rng() * 22,
    driftDelay: -rng() * DRIFT_DURATION,
    pulseDuration: PULSE_MIN + rng() * (PULSE_MAX - PULSE_MIN),
    pulseDelay: -rng() * PULSE_MAX,
  }));
})();

export default function AnimatedBackground() {
  return (
    <div className='animated-bg' aria-hidden='true'>
      <div className='animated-bg__drift'>
        <div className='animated-bg__stars' />
      </div>
      {boxes.map((box, index) => (
        <div
          key={index}
          className='animated-bg__box'
          style={
            {
              left: `${box.left}%`,
              top: `${box.top}%`,
              '--box-drift-dur': `${DRIFT_DURATION}s`,
              '--box-drift-delay': `${box.driftDelay}s`,
            } as CSSProperties
          }
        >
          <span
            className='animated-bg__box-inner'
            style={
              {
                '--box-size': `${box.size}px`,
                '--box-pulse-dur': `${box.pulseDuration}s`,
                '--box-pulse-delay': `${box.pulseDelay}s`,
              } as CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
}
