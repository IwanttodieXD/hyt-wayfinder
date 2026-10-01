'use client';

import { useEffect, useState } from 'react';

/**
 * Detects whether this browser/device can actually create a WebGL context.
 *
 * react-three-fiber throws "Error creating WebGL context" from inside its own
 * layout effect, which is outside any React error boundary we can place around
 * <Canvas>. Checking first is the only reliable way to avoid the crash on
 * machines with no GPU (headless browsers, VMs, remote desktops, or hardware
 * acceleration turned off).
 */
export function useWebGLSupport(): boolean | null {
  // null = still checking, so we can avoid a flash of "unavailable"
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      let ok = false;
      try {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl');

        ok = !!gl;

        // Release the probe context so it doesn't count against the browser's
        // limited number of live contexts.
        const lose = (gl as WebGLRenderingContext | null)?.getExtension?.(
          'WEBGL_lose_context'
        );
        lose?.loseContext();
      } catch {
        ok = false;
      }

      if (!cancelled) setSupported(ok);
    };

    // Checking too early (before layout settles) can give a false negative on
    // some drivers, so confirm once the page is actually interactive.
    check();
    window.addEventListener('load', check);

    return () => {
      cancelled = true;
      window.removeEventListener('load', check);
    };
  }, []);

  return supported;
}

export default useWebGLSupport;
