// Fixture history export (release fix session, 2026-08-01 — pre-2.99a).
//
// Extracts the COMPLETE curated record for the named topics from the live
// DB — claims, sources, attachments (withdrawal state included), support
// links, kernel links, challenges, adjudications, and the full event log
// with ORIGINAL timestamps, reasons, and actors — into the versioned
// history fixture the demo's pristine database is restored from. Everything
// outside the named topics (other topics, their claims and events, all
// parked notes, the feedback quarantine) is excluded by construction.
//
// Encoding correction (release 0a-i, disclosed never silent): the curl-era
// seeding stored U+FFFD where en-dashes, em-dashes, and apostrophes were
// meant (see PROJECT-STATE §6). The repair is three deterministic,
// context-keyed rules; every repaired field is listed in the fixture's
// `corrections` array, and any U+FFFD the rules cannot place is a hard
// error — reported, never guessed.
//
// Identity scan (same bar as the repo scrub): the fixture is refused if any
// exported text carries a personal name, an email address, or a filesystem
// path. Actor values are reported for the operator to review.
//
// Usage: node scripts/export-history.mjs ["Topic name" ...]
//   (defaults to the three curated topics; reads ONION_DB or the live DB)

import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = process.env.ONION_DB || join(root, 'server', 'data', 'truth-onion.db');
const outPath = join(root, 'exports', 'curated-record.history.json');
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['MKUltra', 'COINTELPRO', 'The Replication Crisis'];

const db = new DatabaseSync(dbPath, { readOnly: true });

// ---- topic resolution (curation boundary) ---------------------------------
const topics = [];
for (const name of names) {
  const t = db.prepare('SELECT * FROM topics WHERE name = ?').get(name);
  if (!t) {
    console.error(`No topic named "${name}" in ${dbPath} — nothing exported.`);
    process.exit(1);
  }
  topics.push(t);
}
const topicIds = topics.map((t) => t.id);
const inTopics = `(${topicIds.join(',')})`;

// ---- encoding repair (deterministic, disclosed) ---------------------------
const corrections = [];
function repair(table, id, field, value) {
  if (typeof value !== 'string' || !value.includes('�')) return value;
  let t = value
    .replace(/(\d)�(\d)/g, '$1–$2') // digit�digit → en-dash (year ranges)
    .replace(/([A-Za-z])�s\b/g, "$1's") // letter�s → apostrophe (possessives)
    .replace(/ � /g, ' — '); // space-flanked → em-dash (clause breaks)
  if (t.includes('�')) {
    console.error(
      `UNREPAIRABLE U+FFFD in ${table} #${id} .${field} — the context rules do not place it. Reported, not guessed; nothing exported.\n  ${t}`
    );
    process.exit(1);
  }
  corrections.push({
    table,
    id,
    field,
    note: 'curl-era U+FFFD repaired (en-dash/em-dash/apostrophe by context) — release 0a-i, disclosed data correction'
  });
  return t;
}
const repairRow = (table, row, idField = 'id') => {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = repair(table, row[idField], k, v);
  return out;
};

// ---- extraction -----------------------------------------------------------
const claims = db.prepare(`SELECT * FROM claims WHERE topic_id IN ${inTopics} ORDER BY id`).all();
const claimIds = new Set(claims.map((c) => c.id));
const sources = db.prepare(`SELECT * FROM sources WHERE topic_id IN ${inTopics} ORDER BY id`).all();
const attachments = db
  .prepare(
    `SELECT cs.* FROM claim_sources cs JOIN claims c ON c.id = cs.claim_id
     WHERE c.topic_id IN ${inTopics} ORDER BY cs.claim_id, cs.source_id`
  )
  .all();
const supports = db
  .prepare(
    `SELECT s.* FROM claim_supports s JOIN claims a ON a.id = s.supporter_id JOIN claims b ON b.id = s.supported_id
     WHERE a.topic_id IN ${inTopics} AND b.topic_id IN ${inTopics} ORDER BY s.supporter_id, s.supported_id`
  )
  .all();
// A support link with exactly one end inside the curated set would be
// silently dropped by the join above — refuse instead of quietly cutting.
const dangling = db
  .prepare(
    `SELECT s.supporter_id, s.supported_id FROM claim_supports s
     JOIN claims a ON a.id = s.supporter_id JOIN claims b ON b.id = s.supported_id
     WHERE (a.topic_id IN ${inTopics}) <> (b.topic_id IN ${inTopics})`
  )
  .all();
if (dangling.length) {
  console.error(`Support links cross the curation boundary: ${JSON.stringify(dangling)} — resolve before exporting.`);
  process.exit(1);
}
const kernels = db
  .prepare(
    `SELECT k.* FROM claim_kernels k JOIN claims c ON c.id = k.claim_id
     WHERE c.topic_id IN ${inTopics} ORDER BY k.id`
  )
  .all()
  .map((k) => repairRow('claim_kernels', k));
const challenges = db
  .prepare(
    `SELECT ch.* FROM challenges ch JOIN claims c ON c.id = ch.claim_id
     WHERE c.topic_id IN ${inTopics} ORDER BY ch.id`
  )
  .all();
const events = db
  .prepare(`SELECT * FROM events WHERE topic_id IN ${inTopics} ORDER BY id`)
  .all()
  .map((e) => repairRow('events', e));
// Events tied to an in-scope claim but filed without its topic would be
// missed by the topic filter — refuse rather than lose history.
const orphanEvents = db
  .prepare(`SELECT id, action, claim_id, topic_id FROM events WHERE topic_id NOT IN ${inTopics} OR topic_id IS NULL`)
  .all()
  .filter((e) => e.claim_id != null && claimIds.has(e.claim_id));
if (orphanEvents.length) {
  console.error(`Events reference curated claims but carry no curated topic_id: ${JSON.stringify(orphanEvents)}`);
  process.exit(1);
}

// ---- identity scan (same bar as the repo scrub) ---------------------------
const IDENT = [
  { name: 'real name', re: /\bdane\b/i },
  { name: 'email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { name: 'filesystem path', re: /[A-Za-z]:\\|\/Users\/|\\Users\\|OneDrive/i }
];
const hits = [];
const scan = (table, id, field, value) => {
  if (typeof value !== 'string') return;
  for (const p of IDENT) {
    if (p.re.test(value)) hits.push({ table, id, field, kind: p.name, excerpt: value.slice(0, 90) });
  }
};
const scanRows = (table, rows, idField = 'id') => {
  for (const r of rows) for (const [k, v] of Object.entries(r)) scan(table, r[idField] ?? '(composite)', k, v);
};
scanRows('topics', topics);
scanRows('claims', claims);
scanRows('sources', sources);
scanRows('claim_sources', attachments, 'claim_id');
scanRows('claim_kernels', kernels);
scanRows('challenges', challenges);
scanRows('events', events);
if (hits.length) {
  console.error('IDENTITY SCAN HITS — nothing exported. Review each; do not guess:');
  for (const h of hits) console.error(`  ${h.table} #${h.id} .${h.field} [${h.kind}]: ${h.excerpt}`);
  process.exit(1);
}

// ---- fixture --------------------------------------------------------------
const fixture = {
  format: 'truth-onion-history',
  version: 1,
  exported_at: new Date().toISOString(),
  source_note:
    'Complete curated record exported from the live DB with original timestamps, reasons, and actors. Restored verbatim into the demo pristine database — nothing is re-stamped at build or boot time.',
  corrections,
  topics,
  claims,
  sources,
  attachments,
  supports,
  kernels,
  challenges,
  events
};
writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n');

// ---- report ---------------------------------------------------------------
const actors = [...new Set(events.map((e) => e.actor))];
console.log(`Exported ${topics.length} topics → ${outPath}`);
console.log(
  `  ${claims.length} claims, ${sources.length} sources, ${attachments.length} attachments, ${supports.length} supports, ${kernels.length} kernel links, ${challenges.length} challenges, ${events.length} events`
);
console.log(`  corrections disclosed: ${corrections.length}`);
console.log(`  event actors (review for curator-neutrality): ${actors.join(' · ')}`);
for (const t of topics) {
  const span = db
    .prepare(
      `SELECT MIN(x) lo, MAX(x) hi FROM (
         SELECT created_at x FROM events WHERE topic_id = ?
         UNION ALL SELECT created_at FROM claims WHERE topic_id = ?
         UNION ALL SELECT ch.created_at FROM challenges ch JOIN claims c ON c.id = ch.claim_id WHERE c.topic_id = ?
       )`
    )
    .get(t.id, t.id, t.id);
  console.log(`  ${t.name}: recorded history ${span.lo} → ${span.hi}`);
}
