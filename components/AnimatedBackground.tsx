import type { CSSProperties } from 'react';

/**
 * Decorative animated background, rendered once at the app root.
 *
 * A checkerboard of angled squares, with a faint starfield over it, all flowing
 * up-and-right at 45 degrees.
 *
 * The board is a big square centred on the viewport. Every other cell holds a
 * square rotated 45 degrees into a diamond, and each diamond slowly shrinks and
 * returns to its original size. The whole board drifts up-and-right by exactly
 * one cell, which lands the checkerboard back on itself, so the loop is
 * seamless.
 *
 * Colours and opacity are theme-driven (see the `--pattern-*` variables in
 * globals.css): dark mode keeps the original dark diamonds and bright stars,
 * while light mode swaps in a faint gold/neutral version of the same shapes.
 *
 * Pure CSS (see globals.css). Fixed at z-index -1 so it sits behind everything,
 * and `aria-hidden` because it carries no meaning. Panels stay opaque; only the
 * page wrappers are transparent.
 */

const GRID = 12; // cells per side of the board
const CELL_PCT = 100 / GRID; // one cell, as a % of the board
const DRIFT_DURATION = 60; // seconds to travel one cell up-and-right
const PULSE_MIN = 5; // seconds
const PULSE_MAX = 9; // seconds

interface Diamond {
  col: number;
  row: number;
  pulseDuration: number;
  pulseDelay: number;
}

// Only alternate cells are filled, which is what makes it read as a checkerboard.
// A diamond's pulse timing is derived from `col + row` (its diagonal). That value
// does not change when the board shifts one cell up-and-right, so a diamond
// arriving from the far edge pulses exactly like the one it replaces and the loop
// stays seamless.
const diamonds: Diamond[] = (() => {
  const out: Diamond[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if ((col + row) % 2 !== 0) continue;
      const diagonal = col + row;
      out.push({
        col,
        row,
        pulseDuration: PULSE_MIN + ((diagonal % 4) / 4) * (PULSE_MAX - PULSE_MIN),
        pulseDelay: -((diagonal % 6) / 6) * PULSE_MAX,
      });
    }
  }
  return out;
})();

export default function AnimatedBackground() {
  return (
    <div className='animated-bg' aria-hidden='true'>
      <div className='animated-bg__checker'>
        {diamonds.map((diamond) => (
          <span
            key={`${diamond.col}-${diamond.row}`}
            className='animated-bg__diamond'
            style={
              {
                left: `${(diamond.col + 0.5) * CELL_PCT}%`,
                top: `${(diamond.row + 0.5) * CELL_PCT}%`,
                '--pulse-dur': `${diamond.pulseDuration}s`,
                '--pulse-delay': `${diamond.pulseDelay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className='animated-bg__drift'>
        <div className='animated-bg__stars' />
      </div>
    </div>
  );
}
