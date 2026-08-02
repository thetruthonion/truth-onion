// Deletes the local database and reseeds the MKUltra onion.
import { rmSync } from 'node:fs';
import { openDb, DEFAULT_DB_PATH } from './db.js';
import { seed } from './seed.js';

const path = process.env.ONION_DB || DEFAULT_DB_PATH;
rmSync(path, { force: true });
const db = openDb(path);
seed(db);
console.log(`Reset and reseeded ${path}`);
