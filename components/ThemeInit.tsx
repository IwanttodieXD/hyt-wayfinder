'use client';

import { useServerInsertedHTML } from 'next/navigation';

/**
 * Applies the persisted theme before first paint without putting a `<script>`
 * in the React tree.
 *
 * Next/React warn when a `<script>` is rendered by a client component, because
 * a script created during client rendering is never executed. The script still
 * did its job on the initial server HTML, but the warning fires on every client
 * render, so it cannot stay as a raw tag in `app/layout.tsx`.
 *
 * `useServerInsertedHTML` registers HTML during server rendering only. It is the
 * same mechanism Next uses for CSS-in-JS styles, which is why the tag lands in
 * the document head before the page paints - the no-flash behaviour is kept.
 * On the client this component returns nothing, so React never sees the script.
 */
export default function ThemeInit() {
  useServerInsertedHTML(() => (
    <script
      id='hyt-theme-init'
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            try {
              var raw = localStorage.getItem('hyt-theme');
              var theme = raw ? (JSON.parse(raw).state || {}).theme : 'dark';
              if (theme !== 'light') theme = 'dark';
              var root = document.documentElement;
              root.classList.add(theme);
              root.style.colorScheme = theme;
            } catch (e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
  ));

  return null;
}
