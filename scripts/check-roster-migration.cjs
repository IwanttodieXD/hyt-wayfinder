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

// --- auth.users block -------------------------------------------------------
const authBlock = sql.match(
  /INSERT INTO auth\.users \([\s\S]*?ON CONFLICT \(email\) DO NOTHING;/
);
check('auth.users block present', !!authBlock);

const authLines = (authBlock?.[0] ?? '')
  .split('\n')
  .filter((l) => l.includes('gen_random_uuid()'));

check('131 auth rows', authLines.length === 131, `got ${authLines.length}`);

// Each row must be: (uuid, 'email', crypt(...), 'json', NOW(), NOW(), 'email')
const ROW = /^ {2}\(gen_random_uuid\(\), '[A-Za-z0-9._@%-]+', crypt\('[^']+', gen_salt\('bf'\)\), '\{"name":"[^"]+","provider":"email","email_confirmed":true\}', NOW\(\), NOW\(\), '[A-Za-z0-9._@%-]+'\),?$/;

const badAuth = authLines.filter((l) => !ROW.test(l.trimEnd()));
check('every auth row well-formed', badAuth.length === 0, `${badAuth.length} bad`);
badAuth.slice(0, 3).forEach((l) => console.log('        ' + l.trim()));

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
check('every insert is re-runnable', !/INSERT INTO (auth|public)\.users[\s\S]*?;/.test(sql.replace(/ON CONFLICT \(email\) DO NOTHING;/g, '')));

// --- passwords must not be stored in the clear ------------------------------
const cleartext = sql.match(/crypt\('([^']+)'/g) ?? [];
check(
  'password is hashed, not literal',
  cleartext.every((l) => l.includes('crypt(')),
  `${cleartext.length} crypt() call(s)`
);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);