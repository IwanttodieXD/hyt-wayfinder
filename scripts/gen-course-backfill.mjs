// Throwaway generator for the course backfill. Reads the roster straight out of
// migration 0012 so the 131 rows are never retyped, and reproduces exactly the
// name that migration built (CONCAT_WS of first, middle, last) so the UPDATE
// can match on it. Not part of the app; delete after use.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('supabase/migrations/20260101000012_orientation_students.sql', 'utf8');

const anchor = ') AS u(programme, last_name, first_name, middle_name, middle_initial, name_extension, email)';
const end = src.indexOf(anchor);
if (end === -1) throw new Error('could not find the roster VALUES in 0012');

// Walk backwards to the "(VALUES" that opens it.
const open = src.lastIndexOf('(VALUES', end);
const body = src
  .slice(open + '(VALUES'.length, end)
  .replace(/--[^\n\r]*/g, '');

// Parse the tuples.
const tuples = [];
let depth = 0, cur = '', inStr = false;
for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (inStr) {
    if (ch === "'") {
      if (body[i + 1] === "'") { cur += "''"; i++; }
      else { inStr = false; cur += ch; }
    } else cur += ch;
    continue;
  }
  if (ch === "'") { inStr = true; cur += ch; continue; }
  if (ch === '(') { if (depth === 0) cur = ''; depth++; continue; }
  if (ch === ')') { depth--; if (depth === 0) tuples.push(cur); continue; }
  if (depth > 0) cur += ch;
}

const q = (v) => {
  if (v === 'NULL') return 'NULL';
  const inner = v.replace(/^'|'$/g, '').replace(/''/g, "'");
  return `'${inner.replace(/'/g, "''")}'`;
};

const rows = tuples.map((t, i) => {
  const f = [];
  let s = '', str = false;
  for (let j = 0; j < t.length; j++) {
    const ch = t[j];
    if (str) {
      if (ch === "'") { if (t[j + 1] === "'") { s += "''"; j++; } else str = false; }
      else s += ch;
    } else if (ch === "'") str = true;
    else if (ch === ',') { f.push(s.trim()); s = ''; }
    else s += ch;
  }
  f.push(s.trim());
  if (f.length !== 7) throw new Error(`row ${i + 1}: ${f.length} fields, expected 7`);
  const [programme, last, first, middle, initial, extension] = f;
  // Exactly how 0012 built users.name.
  const name = [first, middle, last]
    .filter((p) => p !== 'NULL')
    .map((p) => p.replace(/^'|'$/g, '').replace(/''/g, "'"))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { programme: programme.replace(/^'|'$/g, ''), last: last.replace(/^'|'$/g, ''), name, email: f[6] };
});

console.log(`rows parsed from 0012: ${rows.length}`);
const byProg = {};
for (const r of rows) byProg[r.programme] = (byProg[r.programme] ?? 0) + 1;
console.log(byProg);
console.log('sample names:', rows.slice(0, 4).map((r) => r.name));

const values = rows
  .map((r) => `    (${q(`'${r.programme}'`)}, ${q(`'${r.name.replace(/'/g, "''")}'`)})`)
  .join(',\n');

// Splice the VALUES into the migration, replacing the marker. Idempotent: once
// the marker is gone the roster block is verified in place rather than re-spliced,
// so re-running the script is safe.
const MIG = 'supabase/migrations/20260101000014_repair_cohort_load.sql';
const marker = '-- ROSTER_VALUES';
let mig = readFileSync(MIG, 'utf8');

if (mig.includes(marker)) {
  writeFileSync(MIG, mig.replace(marker, values));
  mig = readFileSync(MIG, 'utf8');
  console.log(`\nspliced ${rows.length} rows into ${MIG}`);
} else {
  console.log(`\nmarker already consumed; verifying the existing block in place`);
}

// Re-read the migration and confirm the splice produced well-formed SQL: every
// roster tuple has exactly 2 fields, and no marker survived.
const after = readFileSync(MIG, 'utf8');

const startAt = after.indexOf('WITH roster(programme, full_name) AS (');
// Include the CTE's closing paren. Slicing up to it (exclusive) leaves the CTE
// legitimately unbalanced at depth 1, which reads as a corruption that is not
// there.
const endAt = /\)[\r\n]+UPDATE public\.users/.exec(after)?.index ?? -1;
console.log(`block slice: start=${startAt} end=${endAt} len=${endAt - startAt}`);
if (endAt === -1 || endAt < startAt) {
  throw new Error('could not delimit the roster block in the migration');
}

const block = after.slice(startAt, endAt + 1);
const spliced = block.replace(/--[^\n\r]*/g, '');
// Parse ONLY the data tuples. The slice includes the "WITH roster(...) AS ("
// header and its closing paren; feeding those to the tuple scanner counts the
// header as a data row (and the stray close as depth -1). Anchor on VALUES and
// drop the CTE's closing paren by taking the text up to the last tuple.
const valuesAt = spliced.indexOf('VALUES');
if (valuesAt === -1) throw new Error('no VALUES keyword in the roster block');
const lastClose = spliced.lastIndexOf(')');
if (lastClose === -1) throw new Error('no closing paren in the roster block');
const splicedTuples = spliced.slice(valuesAt, lastClose);

let d2 = 0, cur2 = '', str2 = false;
const got = [];
for (let i = 0; i < splicedTuples.length; i++) {
  const ch = splicedTuples[i];
  if (str2) {
    // NOTE: parens inside a quoted string are data, not structure - 'Hilot
    // (Wellness) Services NC II' contains them. Counting those as depth is what
    // makes a naive parser think the block is unbalanced.
    if (ch === "'") {
      if (splicedTuples[i + 1] === "'") { cur2 += "''"; i++; }
      else { str2 = false; cur2 += ch; }
    } else cur2 += ch;
    continue;
  }
  if (ch === "'") { str2 = true; cur2 += ch; continue; }
  if (ch === '(') { if (d2 === 0) cur2 = ''; d2++; continue; }
  if (ch === ')') { d2--; if (d2 === 0) got.push(cur2); continue; }
  if (d2 > 0) cur2 += ch;
}
if (str2) throw new Error('unterminated string in the spliced block');
if (d2 !== 0) {
  // Report the first line at which the running depth is wrong, which is far
  // more useful than a bare total.
  let ln = 0, dl = 0, sl = false, culprit = null;
  for (let i = 0; i < splicedTuples.length; i++) {
    const ch = splicedTuples[i];
    if (ch === '\n') {
      ln++;
      if (culprit === null && dl > 0 && !sl) culprit = ln;
      continue;
    }
    if (sl) {
      if (ch === "'") {
        if (splicedTuples[i + 1] === "'") i++;
        else sl = false;
      }
      continue;
    }
    if (ch === "'") { sl = true; continue; }
    if (ch === '(') dl++;
    if (ch === ')') dl--;
  }
  const lines = spliced.split(/\r?\n/);
  throw new Error(
    `unbalanced parentheses (depth ${d2}); first suspect line ${culprit}: ` +
    `${JSON.stringify(lines[(culprit ?? 1) - 1])}`
  );
}
if (got.length !== rows.length) {
  throw new Error(
    `spliced ${got.length} tuples, expected ${rows.length}\n` +
    `first three: ${JSON.stringify(got.slice(0, 3))}`
  );
}
// Split on TOP-LEVEL commas only. A plain split(',') reports the wrong field
// count for 'Hilot (Wellness) Services NC II', 'Jane Godezano Yu' - there is a
// comma inside that quoted string, but it is data, not a field separator.
const splitTopLevel = (tuple) => {
  const out = [];
  let f = '', str = false;
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i];
    if (str) {
      if (ch === "'") {
        if (tuple[i + 1] === "'") { f += "''"; i++; }
        else { str = false; f += ch; }
      } else f += ch;
    } else if (ch === "'") { str = true; f += ch; }
    else if (ch === ',') { out.push(f.trim()); f = ''; }
    else f += ch;
  }
  out.push(f.trim());
  return out;
};

for (const [i, t] of got.entries()) {
  const fields = splitTopLevel(t);
  if (fields.length !== 2) {
    throw new Error(`tuple ${i + 1} has ${fields.length} fields: ${JSON.stringify(t)}`);
  }
  const [prog, name] = fields.map((v) => v.replace(/^'|'$/g, ''));
  // Cross-check against the source roster: a mismatch here means the splice
  // silently corrupted a name, which is the failure that matters most.
  const src = rows[i];
  if (prog !== src.programme || name !== src.name) {
    throw new Error(
      `tuple ${i + 1} does not match the roster.\n` +
      `  spliced: (${prog}, ${name})\n` +
      `  source : (${src.programme}, ${src.name})`
    );
  }
}
console.log(`verified: ${got.length} tuples, all matching the 0012 roster`);

// Every programme referenced must be one that section 2 inserts.
// The final row of that INSERT carries no trailing comma, hence the optional one.
const inserted = [...after.matchAll(/^ {2}\('([^']+)'\),?$/gm)].map((m) => m[1]);
const missing = [...new Set(rows.map((r) => r.programme))].filter(
  (p) => !inserted.includes(p)
);
if (missing.length) {
  throw new Error(`programmes used but never inserted: ${missing.join(', ')}`);
}
console.log(`verified: all ${new Set(rows.map((r) => r.programme)).size} programmes are inserted in section 2`);

