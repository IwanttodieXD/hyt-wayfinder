/**
 * Launches the Next.js CLI with a path-casing-normalized working directory.
 *
 * Why this exists:
 * Windows filesystems are case-insensitive, so the same folder can be reached
 * as `C:\Users\Andong\documents\hyt-wayfinder` or
 * `C:\Users\Andong\Documents\hyt-wayfinder` depending on how the shell, the
 * terminal, or an IDE launched the process. Node reports `process.cwd()` using
 * the casing it was given, while npm exports `INIT_CWD` /
 * `npm_config_local_prefix` using the casing npm saw.
 *
 * When Next.js mixes both spellings internally, webpack treats the *same* file
 * as two distinct modules. The App Router client runtime then ends up with two
 * copies of `next/dist/shared/lib/router/action-queue.js`, i.e. two separate
 * `ActionQueueContext` React contexts. The provider and the consumer land in
 * different copies, `useContext()` returns null, and the client throws:
 *
 *   Uncaught Error: Invariant: Missing ActionQueueContext
 *
 * followed by a full client-side re-render ("An error occurred during
 * hydration. The server HTML was replaced with client content in <#document>").
 *
 * This script resolves the real on-disk casing of the project root and spawns
 * Next with that path as both the working directory and the relevant env vars,
 * so every module resolves through exactly one spelling.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Walks each segment of `target` and swaps in the casing that is actually
 * stored in the directory listing. Falls back to the given segment when the
 * parent cannot be read or nothing matches.
 *
 * @param {string} target absolute path to canonicalize
 * @returns {string} the same path using on-disk casing
 */
function canonicalizePath(target) {
  const resolved = path.resolve(target);
  const { root } = path.parse(resolved);
  const segments = resolved.slice(root.length).split(path.sep).filter(Boolean);

  let current = root;

  for (const segment of segments) {
    let entryName;

    try {
      entryName = fs
        .readdirSync(current, { withFileTypes: true })
        .find(
          (entry) =>
            !entry.isSymbolicLink() &&
            entry.name.toLowerCase() === segment.toLowerCase()
        )?.name;
    } catch {
      entryName = undefined;
    }

    current = path.join(current, entryName ?? segment);
  }

  return current;
}

const projectRoot = canonicalizePath(__dirname + path.sep + '..');
const nextBin = require.resolve('next/dist/bin/next', { paths: [projectRoot] });

const args = [nextBin, ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Keep npm-derived paths in sync with the normalized casing as well.
    INIT_CWD: projectRoot,
    npm_config_local_prefix: projectRoot,
    npm_package_json: path.join(projectRoot, 'package.json'),
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`Failed to start Next.js: ${error.message}`);
  process.exit(1);
});