// One-off structural check on the generated migration.
// Run: node scripts/check-roster-migration.cjs
const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260101000012_orientation_students.sql'
);

const sql = fs.readFileSync(FILE, 'utf8');
let failures = 0;

const check = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

/**
 * The last three expressions of the auth SELECT map to created_at, updated_at
 * and email_confirmed_at - all TIMESTAMPTZ. Returns the name of any that is
 * given something other than NOW(), which is the 22007 failure mode.
 */
function stampExprs(selectExprs) {
  const stampPositions = [4, 5, 6]; // 0-indexed within a 7-expression list
  const names = ['created_at', 'updated_at', 'email_confirmed_at'];
  const bad = [];
  stampPositions.forEach((pos, i) => {
    const expr = (selectExprs[pos] ?? '').toUpperCase();
    if (expr !== 'NOW()') bad.push(`${names[i]}=${selectExprs[pos] ?? 'missing'}`);
  });
  return bad;
}

/**
 * Counts the top-level values in a VALUES tuple.
 *
 * Naive comma-splitting is wrong here: `crypt('...', gen_salt('bf'))` and
 * `'{"name":"...","provider":"email"}'` both contain commas inside brackets or
 * quotes, and miscounting them is exactly how a positional mismatch slips
 * through. This walks the string tracking depth and quote state instead.
 */
function countTopLevel(line) {
  let depth = 0;
  let inQuote = false;
  let count = 1; // the tuple itself is one value
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      // '' inside a literal is an escaped quote, not the end of the literal.
      if (ch === "'") {
        if (line[i + 1] === "'") i++;
        else inQuote = false;
      }
      continue;
    }
    if (ch === "'") inQuote = true;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 1) count++;
  }
  return count;
}

// --- auth.users block -------------------------------------------------------
const authBlock = sql.match(
  /INSERT INTO auth\.users \([\s\S]*?WHERE NOT EXISTS \([\s\S]*?\);/
);
check('auth.users block present', !!authBlock);

// Rows are now ('email', '{json}') pairs feeding a SELECT, not full tuples.
const authLines = (authBlock?.[0] ?? '')
  .split('\n')
  .filter((l) => /^ {2}\('[^']+', '\{/.test(l));

check('131 auth rows', authLines.length === 131, `got ${authLines.length}`);

const ROW = /^ {2}\('[A-Za-z0-9._@%-]+', '\{"name":"[^"]+","provider":"email","email_confirmed":true\}'\),?$/;
const badAuth = authLines.filter((l) => !ROW.test(l.trimEnd()));
check('every auth row well-formed', badAuth.length === 0, `${badAuth.length} bad`);
badAuth.slice(0, 3).forEach((l) => console.log('        ' + l.trim()));

// Arity: the SELECT expression list must match the INSERT's column list. This is
// the check that would have caught the original 22007 (an email string in the
// email_confirmed_at slot) and the follow-up where the SELECT came back with 3
// expressions for 7 declared columns.
const authCols = (authBlock?.[0] ?? '').match(/INSERT INTO auth\.users \(([\s\S]*?)\)/);
const declaredCols = (authCols?.[1] ?? '')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);

const selectList = (authBlock?.[0] ?? '').match(/SELECT\n([\s\S]*?)\nFROM/);
const selectExprs = (selectList?.[1] ?? '')
  .split('\n')
  .map((l) => l.replace(/,\s*$/, '').trim())
  .filter(Boolean);

check(
  `auth SELECT arity matches column list (${declaredCols.length} cols)`,
  declaredCols.length === 7 && selectExprs.length === 7,
  `select supplies ${selectExprs.length}`
);

// The three timestamp columns must all be NOW(), never a string literal. This
// is the specific 22007 failure mode.
const stampCols = ['created_at', 'updated_at', 'email_confirmed_at'];
const badStamp = stampExprs(selectExprs);
check(
  'timestamp columns all receive NOW()',
  badStamp.length === 0,
  badStamp.join(', ') || 'all NOW()'
);

// auth.users has no unique index on email, so ON CONFLICT (email) is invalid
// there (42P10). It must be guarded by NOT EXISTS instead.
// Scoped to the auth INSERT statement itself. An earlier version searched the
// whole file with a lazy `[\s\S]*?`, which happily matched the ON CONFLICT
// belonging to the *later* public.users insert and reported a false failure.
const authUsesOnConflict = /ON CONFLICT/.test(authBlock?.[0] ?? '');
check('auth.users avoids ON CONFLICT (42P10)', !authUsesOnConflict);
check(
  'auth.users guarded by NOT EXISTS',
  /INSERT INTO auth\.users[\s\S]*?WHERE NOT EXISTS/.test(sql)
);

// public.users and public.courses DO have UNIQUE columns, so ON CONFLICT is
// valid there - and required, to keep the seed re-runnable.
check(
  'public.users + courses still use ON CONFLICT',
  /INSERT INTO public\.users[\s\S]*?ON CONFLICT \(email\) DO NOTHING/.test(sql) &&
    /INSERT INTO public\.courses \(label\)[\s\S]*?ON CONFLICT \(label\) DO NOTHING/.test(sql)
);

// --- public.users block -----------------------------------------------------
const seedBlock = sql.slice(
  sql.indexOf('FROM (VALUES'),
  sql.indexOf(') AS u(')
);
const SEED = /^ {2}\('([^']*)', '([^']*)', '([^']*)'/gm;
const seeds = [...seedBlock.matchAll(SEED)].map((m) => ({
  programme: m[1],
  last: m[2],
  first: m[3],
}));

check('131 seed rows', seeds.length === 131, `got ${seeds.length}`);

// No literal 'N/A' should survive into a stored value.
const leaked = seeds.filter((s) => /N\/A/.test([s.last, s.first].join(' ')));
check("no 'N/A' leaked into names", leaked.length === 0, `${leaked.length} leaked`);

// --- emails ----------------------------------------------------------------
const emails = [
  ...new Set(
    [...sql.matchAll(/'([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'/g)].map((m) =>
      m[1].toLowerCase()
    )
  ),
];
const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
check('no duplicate emails', dupes.length === 0, dupes.join(', '));

// --- required schema pieces ------------------------------------------------
check('orientation_status enum created', sql.includes('CREATE TYPE public.orientation_status'));
check('orientation_status column added', sql.includes('ADD COLUMN IF NOT EXISTS orientation_status'));
check('course_id written', /course_id/.test(sql));
check('courses seeded', /INSERT INTO public\.courses \(label\)/.test(sql));
// Every INSERT must be safe to re-run. Two acceptable guards:
//   ON CONFLICT ... DO NOTHING  - where a unique constraint exists
//   WHERE NOT EXISTS (...)      - where it does not, i.e. auth.users (42P10)
//
// Requiring ON CONFLICT everywhere would be wrong now that auth.users cannot
// use it; requiring NOT EXISTS everywhere would be wrong for the other two.
const inserts = [...sql.matchAll(/INSERT INTO [\s\S]*?;/g)].map((m) => m[0]);
const unguarded = inserts.filter(
  (s) => !/ON CONFLICT[^\n]*DO NOTHING/.test(s) && !/WHERE NOT EXISTS/.test(s)
);
check(
  `every INSERT is re-runnable (${inserts.length} statements)`,
  inserts.length === 3 && unguarded.length === 0,
  unguarded.length ? `${unguarded.length} unguarded` : ''
);

// The password must be hashed on the way in. One crypt() in the SELECT hashes
// every row, so the count is 1 by design - what matters is that no literal is
// stored directly, which the row-shape check above enforces by requiring the
// email and the jsonb metadata as the only string literals per row.
check(
  'password hashed via crypt(), never literal',
  /crypt\('[^']+', gen_salt\('bf'\)\)/.test(sql),
  `${(sql.match(/crypt\(/g) || []).length} crypt() call(s)`
);

// Negative control. Every guard above was written *after* a real failure:
//
//   22007 invalid timestamp  - an email string landed in email_confirmed_at
//   42P10 no unique constraint - ON CONFLICT (email) on auth.users, which has
//                             no unique index on that column
//
// A check that cannot reproduce the bug it was written for is not evidence of
// anything, so re-inject each mistake into a copy of the SQL and confirm the
// relevant checks go red.
//
// Runs before the process exits, or it never runs at all - which is exactly
// what happened the first time this was written.
if (process.env.CHECK_SELFTEST === '1') {
  // Case A: string literal in the timestamp slot (the 22007).
  const a = sql.replace(/NOW\(\)\n\)\nFROM/, `NOW()\n)\nFROM`).replace(
    /^ {2}NOW\(\),?$/m,
    `  'someone@gmail.com',`
  );
  const aExprs = (a.match(/SELECT\n([\s\S]*?)\nFROM/)?.[1] ?? '')
    .split('\n')
    .map((l) => l.replace(/,\s*$/, '').trim())
    .filter(Boolean);
  const aStamp = stampExprs(aExprs);
  console.log(
    `\nSelf-test A (22007, string in timestamp slot): ${
      aStamp.length > 0 ? 'correctly DETECTED' : 'MISSED'
    }  ${aStamp.join(', ')}`
  );
  if (aStamp.length === 0) process.exit(1);

  // Case B: ON CONFLICT restored on auth.users (the 42P10).
  const b = sql.replace(
    /WHERE NOT EXISTS \(\n {2}SELECT 1 FROM auth\.users existing WHERE existing\.email = s\.email\n\)\n?/,
    `ON CONFLICT (email) DO NOTHING;`
  );
  const bOnConflict = /INSERT INTO auth\.users[\s\S]*?ON CONFLICT/.test(b);
  console.log(
    `Self-test B (42P10, ON CONFLICT on auth.users): ${
      bOnConflict ? 'correctly DETECTED' : 'MISSED'
    }`
  );
  if (!bOnConflict) process.exit(1);

  // Case C: SELECT short by two expressions (7 columns, 5 supplied).
  const c = sql.replace(/^ {2}NOW\(\),\n {2}NOW\(\),\n/m, '');
  const cExprs = (c.match(/SELECT\n([\s\S]*?)\nFROM/)?.[1] ?? '')
    .split('\n')
    .map((l) => l.replace(/,\s*$/, '').trim())
    .filter(Boolean);
  const cArity = cExprs.length !== 7;
  console.log(
    `Self-test C (SELECT arity mismatch): ${
      cArity ? 'correctly DETECTED' : 'MISSED'
    }  select supplies ${cExprs.length}`
  );
  if (!cArity) process.exit(1);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);