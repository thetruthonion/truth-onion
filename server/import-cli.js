// SPDX-License-Identifier: AGPL-3.0-only
// Usage: npm run import -- <file.json>
// Runs every item through the rules layer — a tampered export is refused.
import { readFileSync } from 'node:fs';
import { openDb } from './db.js';
import { importTopic } from './service.js';

const [, , file] = process.argv;
if (!file) {
  console.error('Usage: npm run import -- <file.json>');
  process.exit(1);
}
const db = openDb();
try {
  const result = importTopic(db, JSON.parse(readFileSync(file, 'utf8')));
  console.log(
    `Imported "${result.topic.name}": ${result.claims} claims, ${result.sources} sources, ${result.parked} parked notes.`
  );
} catch (e) {
  console.error(`Refused: ${e.message}`);
  process.exit(1);
}
