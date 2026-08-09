// SPDX-License-Identifier: AGPL-3.0-only
// Usage: npm run export -- <topic id or name> [outfile]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { exportTopic } from './service.js';

const [, , ident, outArg] = process.argv;
if (!ident) {
  console.error('Usage: npm run export -- <topic id or name> [outfile]');
  process.exit(1);
}
const db = openDb();
const topic = /^\d+$/.test(ident)
  ? db.prepare('SELECT * FROM topics WHERE id = ?').get(Number(ident))
  : db.prepare('SELECT * FROM topics WHERE lower(name) = lower(?)').get(ident);
if (!topic) {
  console.error(`No topic "${ident}".`);
  process.exit(1);
}
const payload = exportTopic(db, topic.id);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = topic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const out = outArg || join(root, 'exports', `${slug}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(payload, null, 2));
console.log(
  `Exported "${topic.name}": ${payload.claims.length} claims, ${payload.sources.length} sources, ${payload.parked.length} parked notes -> ${out}`
);
