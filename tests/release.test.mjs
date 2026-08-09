// SPDX-License-Identifier: AGPL-3.0-only
// Release checklist pins (decision record items 0a, 0a-i, 2, 2a, 2b, 3 and
// the Fly.io deploy artifacts). These tests state the guarantees the public
// artifact ships under: the seed is curated and clean of mojibake, the
// absent fetch proxy always degrades to the showcase message, verification
// status renders honestly, every demo route is rate-limited, and the deploy
// config can never silently reacquire a volume or skip the test gate.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { restoreHistory } from '../server/history.js';
import { buildApp } from '../server/index.js';
import { SOURCE_LINKS, curatorVerified, CURATOR_VERIFIED_LABEL } from '../server/sourcelinks.js';
import {
  makeSearchExecutor,
  SHOWCASE_VERIFY_UNAVAILABLE
} from '../client/src/companion/search.js';
import {
  CURATOR_VERIFIED_LABEL as CLIENT_CURATOR_LABEL,
  DEMO_UNVERIFIED_LABEL,
  DEMO_PENDING_STATUS
} from '../client/src/verifyStatus.js';
import { makeParkingStore, serializeParking } from '../client/src/parking.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}

console.log('\nRelease checklist — curation, encoding, showcase boundary, labels, limits, deploy\n');

// The shipped seed, built exactly the way scripts/build-demo.mjs builds the
// pristine database: a RESTORE of the exported curated-record history
// fixture — original timestamps, reasons, and actors verbatim (fix session
// 2026-08-01; the restore-specific pins live in tests/history.test.mjs).
const db = openDb(':memory:');
restoreHistory(db, JSON.parse(readFileSync(join(root, 'exports', 'curated-record.history.json'), 'utf8')));

const server = buildApp(db, { demo: true, rateLimit: 0 }).listen(0);
const base = `http://localhost:${server.address().port}`;

await test('R1 (0a, amended twice — 2.99b, 2.99b-2). the shipped seed is the curated FIVE — no test residue, no "Christ is God"', () => {
  // R1 FIRST AMENDMENT (operator decision, 2026-08-02): UAP joins as the
  // fourth curated topic. R1 SECOND AMENDMENT (operator decision,
  // 2026-08-09, recorded in the 2.99b-2 kickoff, superseding the
  // live-only mini-build ruling of 2026-08-08): AI Evaluation joins as
  // the fifth. Explicit amendments, never silent changes.
  const names = db.prepare('SELECT name FROM topics ORDER BY id').all().map((t) => t.name);
  assert.deepEqual(names, ['MKUltra', 'COINTELPRO', 'The Replication Crisis', 'UAP: Disclosure, Evidence, and Overreach', 'AI Evaluation: Benchmarks, System Cards, and Independent Testing'],
    `shipped topics must be exactly the curated five, got: ${names.join(' | ')}`);
  // Residue scan across every claim: nothing from operator test sessions.
  const texts = db.prepare('SELECT text FROM claims').all().map((c) => c.text);
  for (const t of texts) {
    assert.ok(!/christ is god|demo intrusion|quixotic-marker/i.test(t), `test residue in shipped claim: "${t.slice(0, 60)}"`);
  }
});

await test('R2 (0a-i). zero replacement characters in ANY text column of the shipped seed', () => {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map((t) => t.name);
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().filter((c) => /TEXT/i.test(c.type || ''));
    for (const c of cols) {
      const hit = db
        .prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${c.name} LIKE '%' || char(65533) || '%'`)
        .get();
      assert.equal(hit.n, 0, `U+FFFD found in ${t}.${c.name} — the curl-era mojibake must not ship`);
    }
  }
});

await test('R3 (0a-i). page charset is pinned and no claim page renders a replacement character', async () => {
  const ids = db.prepare('SELECT id FROM claims ORDER BY id').all().map((r) => r.id);
  assert.ok(ids.length >= 30, `expected the full shipped record, got ${ids.length} claims`);
  for (const id of ids) {
    const res = await fetch(`${base}/claim/${id}`);
    assert.equal(res.status, 200, `/claim/${id} answered ${res.status}`);
    assert.match(res.headers.get('content-type') || '', /charset=utf-8/i, `/claim/${id} must declare utf-8 in Content-Type`);
    const html = await res.text();
    assert.ok(html.includes('<meta charset="utf-8">'), `/claim/${id} must pin <meta charset>`);
    assert.ok(!html.includes('�'), `/claim/${id} renders U+FFFD`);
  }
});

await test('R4 (0a-i). the debunked claims ship their kernel fans, correctly encoded', () => {
  const links = db
    .prepare('SELECT claim_id, kernel_id, gap_establishes FROM claim_kernels ORDER BY id')
    .all();
  assert.deepEqual(
    links.map((l) => [l.claim_id, l.kernel_id]),
    [[11, 1], [11, 2], [20, 13], [20, 17], [42, 36], [60, 59]],
    'the seeded kernel links (MKUltra #11 fan, COINTELPRO #20 fan, UAP sample #42 ← AARO #36, AI-eval expectation #60 ← survey #59)'
  );
  // The exact glyphs the curl era mangled: en-dashes in year ranges, em-dashes
  // between clauses, apostrophes in possessives.
  const all = db
    .prepare('SELECT gap_establishes || gap_asserts_beyond || gap_path_inward AS g FROM claim_kernels')
    .all()
    .map((r) => r.g)
    .join(' ');
  assert.ok(all.includes('1956–1971'), 'en-dash year range survives');
  assert.ok(all.includes('1975–76'), 'en-dash year range survives');
  assert.ok(all.includes('—'), 'em-dashes survive');
  assert.ok(!all.includes('�'), 'no U+FFFD in any gap statement');
});

await test('R5 (2). proxy absent: fetch_url and verify_source surface the showcase message, never a request', async () => {
  let calls = 0;
  const exec = makeSearchExecutor({
    config: { mode: 'search-api', apiProvider: 'brave' },
    keys: { brave: 'k' },
    appOrigin: 'http://localhost:3111',
    proxyAbsent: true,
    fetchImpl: async () => {
      calls++;
      throw new Error('no request may be issued when the proxy is absent');
    }
  });
  const f = await exec.fetch_url({ url: 'https://example.com/page' });
  assert.equal(calls, 0, 'fetch_url must not issue the doomed request');
  assert.equal(f.unavailable, true);
  assert.match(f.note, /not available in this demo/i);
  assert.match(f.note, /clone the repo/i);
  const v = await exec.verify_source({ url: 'https://example.com/page', quote: 'q' });
  assert.equal(calls, 0, 'verify_source must not issue the doomed request');
  assert.equal(v.verified, false, 'never verified without a mechanical check');
  assert.equal(v.quote_found, null, 'tri-state honesty: nothing was learned');
  assert.equal(v.inconclusive, true);
  assert.match(v.reason, /not available in this demo/i);
});

await test('R6 (2). defense in depth: a live 404 from the proxy is the same showcase answer, never "fetch proxy error 404"', async () => {
  const exec = makeSearchExecutor({
    config: { mode: 'search-api', apiProvider: 'brave' },
    keys: { brave: 'k' },
    appOrigin: 'http://localhost:3111',
    fetchImpl: async () => ({ ok: false, status: 404 })
  });
  const f = await exec.fetch_url({ url: 'https://example.com/x' });
  assert.equal(f.unavailable, true);
  assert.match(f.note, /not available in this demo/i);
  const v = await exec.verify_source({ url: 'https://example.com/x', quote: 'q' });
  assert.equal(v.quote_found, null);
  assert.match(v.reason, /not available in this demo/i);
  assert.ok(!JSON.stringify([f, v]).includes('fetch proxy error'), 'the raw error string must not surface');
});

await test('R7 (2a). the proxy-path enumeration is closed: exactly one client module touches /api/fetch', () => {
  // Every code path that can reach the absent proxy funnels through
  // search.js's viaProxy (fetch_url + verify_source). If another file
  // acquires the proxy, this scan fails and the audit must be redone.
  const hits = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) scan(p);
      else if (/\.(js|jsx)$/.test(entry.name) && readFileSync(p, 'utf8').includes('/api/fetch')) hits.push(p);
    }
  };
  scan(join(root, 'client', 'src'));
  assert.equal(hits.length, 1, `expected exactly one client file referencing /api/fetch, got: ${hits.join(', ')}`);
  assert.ok(hits[0].endsWith(join('companion', 'search.js')), 'the one path is the audited viaProxy funnel');
  // And the demo showcase wording is the shared constant, stated once.
  assert.match(SHOWCASE_VERIFY_UNAVAILABLE, /not available in this demo — clone the repo to run mechanical verification locally/i);
});

await test('R8 (2b). recorded verifications label as curator-verified — payload, panel source, and page', async () => {
  // Server payloads carry the derived status.
  const topic = await (await fetch(`${base}/api/topics/1`)).json();
  const verified = topic.sources.filter((s) => s.verification === 'curator');
  const labeled = topic.sources.filter((s) => s.verification === null);
  assert.ok(verified.length >= 5, `audit-verified sources carry verification:'curator' (got ${verified.length})`);
  assert.ok(labeled.every((s) => !curatorVerified(s.citation)), 'null only where the audit has no canonical URL');
  // Claim page renders the label next to the source status chips.
  const page = await (await fetch(`${base}/claim/1`)).text();
  assert.ok(page.includes(CURATOR_VERIFIED_LABEL), 'claim page carries the curator-verified label');
  // One copy of the wording on each side of the wire, same words.
  assert.equal(CURATOR_VERIFIED_LABEL, CLIENT_CURATOR_LABEL);
  assert.equal(CURATOR_VERIFIED_LABEL, 'mechanically verified locally by curator');
  // The audit mapping is the only authority: every URL-carrying entry
  // verifies, label-only entries never do.
  for (const e of SOURCE_LINKS) {
    assert.equal(curatorVerified(e.match), !!e.url, `verification derives from the audit for: ${e.match.slice(0, 50)}`);
  }
});

await test('R8b (2b). a source drafted on the demo records verification: pending in the save file', async () => {
  // The demo message reads as a designed boundary: deliberate, where the
  // verifier lives, verified at import.
  assert.match(DEMO_UNVERIFIED_LABEL, /deliberately switched off/);
  assert.match(DEMO_UNVERIFIED_LABEL, /full engine \(clone the repo\)/);
  assert.match(DEMO_UNVERIFIED_LABEL, /verify this source automatically when your save is imported at multiplayer/);
  // Device-local (demo) parking stamps a source-attach draft as pending —
  // the save records the state; no other machinery exists.
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const store = makeParkingStore({ demo: true, storage });
  const entry = await store.parkEntry(1, {
    kind: 'source-attach',
    context: { claim_id: 1, form: 'source-attach' },
    draft: { tier: 'primary_doc', citation: 'X v. Y', url: 'https://example.com', relation: 'supports' }
  });
  assert.equal(entry.draft.verification, DEMO_PENDING_STATUS);
  const exported = JSON.parse(serializeParking(await store.readAll(1)));
  assert.equal(exported.items[0].draft.verification, 'pending', 'the export (the save file) carries pending');
  // A note is not a source: no stamp outside source-attach drafts.
  const note = await store.parkEntry(1, { kind: 'claim-draft', draft: { text: 'd' } });
  assert.equal(note.draft.verification, undefined);
});

await test('R9 (3). rate limiting covers every demo route family: /api and /claim both 429', async () => {
  const ltdDb = openDb(':memory:');
  seed(ltdDb);
  const ltd = buildApp(ltdDb, { demo: true, rateLimit: 3 }).listen(0);
  const b = `http://localhost:${ltd.address().port}`;
  try {
    let last;
    for (let i = 0; i < 4; i++) last = await fetch(`${b}/api/topics`);
    assert.equal(last.status, 429, 'the API family rate-limits');
    // A fresh instance so the counter starts clean for the page family.
    const ltd2Db = openDb(':memory:');
    seed(ltd2Db);
    const ltd2 = buildApp(ltd2Db, { demo: true, rateLimit: 3 }).listen(0);
    const b2 = `http://localhost:${ltd2.address().port}`;
    try {
      let lastPage;
      for (let i = 0; i < 4; i++) lastPage = await fetch(`${b2}/claim/1`);
      assert.equal(lastPage.status, 429, 'the claim-page family rate-limits');
    } finally {
      ltd2.close();
      ltd2Db.close();
    }
    // The demo boot wires a nonzero default: the hosted artifact cannot
    // start unlimited by omission.
    const indexSrc = readFileSync(join(root, 'server', 'index.js'), 'utf8');
    assert.match(indexSrc, /demo \? Number\(process\.env\.DEMO_RATE_LIMIT \|\| 120\) : 0/, 'demo boot defaults the limiter on');
  } finally {
    ltd.close();
    ltdDb.close();
  }
});

await test('R11. the demo package ships every module its shipped files import — the boot-crash class is closed', () => {
  // This class bit twice: build-demo copies a FIXED file list, and a new
  // local import in a shipped module (fetch-proxy once, seed-uap once)
  // makes the package crash on boot while every source-level test stays
  // green. Pin: walk the local-import closure of the shipped list.
  const buildSrc = readFileSync(join(root, 'scripts', 'build-demo.mjs'), 'utf8');
  const listMatch = /for \(const f of \[([^\]]+)\]\)/.exec(buildSrc);
  const shipped = listMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
  for (const f of shipped) {
    const src = readFileSync(join(root, 'server', f), 'utf8');
    for (const m of src.matchAll(/from '\.\/([A-Za-z0-9-]+\.js)'/g)) {
      const dep = m[1];
      // fetch-proxy/browser-render are the DELIBERATE lazy exceptions
      // (imported dynamically, non-demo only — pinned by D4/D5).
      if (['fetch-proxy.js', 'browser-render.js'].includes(dep)) continue;
      assert.ok(shipped.includes(dep), `${f} imports ./${dep}, which build-demo does not ship — the package would crash on boot`);
    }
  }
});

await test('R10 (deploy). the Fly artifacts exist: test gate before ship, seed at image build, no volume anywhere', () => {
  const dockerfile = readFileSync(join(root, 'deploy', 'Dockerfile'), 'utf8');
  // The deploy gate: the FULL suite (D4/D5 included) runs at image build —
  // a build that silently reacquires the fetch proxy fails loudly here.
  assert.match(dockerfile, /RUN npm test/, 'the suite is the deploy gate');
  assert.match(dockerfile, /RUN .*build-demo/, 'the pristine seed is built AT IMAGE BUILD from the versioned fixture');
  assert.ok(!/^\s*VOLUME/m.test(dockerfile), 'no VOLUME: the DB is ephemeral by design');
  assert.match(dockerfile, /DEMO_MODE=true/, 'the image is the demo, structurally');
  const flyToml = readFileSync(join(root, 'fly.toml'), 'utf8');
  assert.match(flyToml, /internal_port\s*=\s*3111/);
  assert.match(flyToml, /shared-cpu-1x/, 'baseline size per the release decision');
  assert.match(flyToml, /memory\s*=\s*['"]512mb['"]/i, '512MB baseline');
  // Scan CONFIG lines only (the file's own comments are allowed to warn
  // about the very stanza this pins absent).
  const configLines = flyToml.split('\n').filter((l) => !l.trim().startsWith('#'));
  assert.ok(
    !configLines.some((l) => /^\s*\[+mounts\]+/.test(l)),
    'no volume stanza anywhere — resets on every deploy by design'
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
server.close();
db.close();
process.exit(failed ? 1 : 0);
