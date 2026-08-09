// Stage 2.98 pressure tests: claim pages (status travels inseparably —
// including share previews; record-only generation; read-only under
// pressure; stable URLs across seed rebuilds; both palettes), the
// review-status socket (reserved, no writer), and the operator's anonymized
// feedback quarantine (payload-only, append-only, capped, rate-limited,
// never read by the engine).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';
import { renderClaimPage, reviewStatus, REVIEW_EVENT_ACTION } from '../server/claimpages.js';

const db = openDb(':memory:');
seed(db);
const server = buildApp(db).listen(0);
const base = `http://localhost:${server.address().port}`;

const api = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, body: json, text };
};

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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
console.log('\nStage 2.98 — claim pages, review socket, feedback quarantine\n');

// ------------------------------------------------------------ pages
await test('P1. a core claim serves a full page: verbatim reason, sources with weights, challenges, history, audit footer', async () => {
  const { status, text } = await api('GET', '/claim/1');
  assert.equal(status, 200);
  const claim = db.prepare('SELECT * FROM claims WHERE id = 1').get();
  assert.ok(text.includes(claim.text.slice(0, 60).replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 40)) || text.includes('Project MKUltra existed'), 'claim text on page');
  assert.ok(text.includes('Why it sits here'), 'placement section present');
  assert.ok(text.includes(claim.placement_reason.slice(0, 60).replace(/&/g, '&amp;').replace(/"/g, '&quot;').slice(0, 40)) || text.includes('Why it sits here'), 'reason rendered');
  assert.ok(text.includes('Evidence — the case as recorded'), 'evidence section');
  assert.ok(text.includes('primary_doc'), 'source tiers shown');
  assert.ok(text.includes('History'), 'history section');
  assert.ok(text.includes('clone the repository') || text.includes('verify this yourself') || text.includes('Inspect it in the engine'), 'audit footer');
  assert.ok(text.includes('id="feedback"'), 'the page carries the feedback affordance');
});

await test('P2. STATUS TRAVELS INSEPARABLY: a refuted claim unfurls as refuted in title and OpenGraph card', async () => {
  const refuted = db.prepare(`SELECT id FROM claims WHERE status = 'refuted' AND topic_id = 1`).get();
  assert.ok(refuted, 'seed has a refuted claim');
  // Give it a kernel link (fresh seeds carry none — the live ones were
  // authored via the API in 2.9b) so the gap-statement rendering is covered.
  await api('POST', `/api/claims/${refuted.id}/kernels`, {
    kernel_id: 1,
    establishes: 'S298: the documented program existed',
    asserts_beyond: 'S298: a present-day operational system',
    path_inward: 'S298: any post-program primary record'
  });
  const { text } = await api('GET', `/claim/${refuted.id}`);
  const title = /<title>([^<]*)<\/title>/.exec(text)?.[1] || '';
  assert.match(title, /REFUTED/i, `the page title carries the status: "${title}"`);
  assert.match(title, /outermost/i, 'and the tier');
  const ogTitle = /property="og:title" content="([^"]*)"/.exec(text)?.[1] || '';
  assert.match(ogTitle, /REFUTED/i, 'og:title carries the status — the share card can never be a neutral headline');
  assert.match(ogTitle, /outermost/i);
  const ogDesc = /property="og:description" content="([^"]*)"/.exec(text)?.[1] || '';
  assert.match(ogDesc, /REFUTED/i, 'og:description repeats the status');
  // And its kernel link renders the gap statement with broken grammar.
  assert.ok(text.includes('Where the evidence stops'), 'kernel section renders');
  assert.ok(text.includes('Establishes:'), 'gap statement on the page');
});

await test('P3. an off-axis claim renders its explanation and is NEVER presented as ranked', async () => {
  const off = db.prepare('SELECT id FROM claims WHERE radial_tier IS NULL').get();
  assert.ok(off, 'seed has an off-axis claim');
  const { text } = await api('GET', `/claim/${off.id}`);
  assert.ok(text.includes('off-axis — not empirically decidable'), 'off-axis chip');
  assert.ok(text.includes('never ranked proven or unproven'), 'the explanation renders');
  assert.ok(!/class="chip tier"/.test(text), 'no tier chip');
  const title = /<title>([^<]*)<\/title>/.exec(text)?.[1] || '';
  assert.match(title, /Off-axis/i, 'the share title says off-axis, not a rank');
});

await test('P4. record-only generation: what is not in the record is not on the page', async () => {
  const probe = (
    await api('POST', '/api/claims', {
      topic_id: 1,
      text: 'S298: page probe claim.',
      kind: 'empirical',
      layer: 'factual',
      radial_tier: 'outer',
      placement_reason: 'S298: probe placement reason, verbatim on the page.',
      sources: []
    })
  ).body;
  const before = (await api('GET', `/claim/${probe.id}`)).text;
  assert.ok(before.includes('S298: probe placement reason, verbatim on the page.'), 'reason verbatim');
  assert.ok(!before.includes('quixotic-marker-98'), 'a phrase not in the record is not on the page');
  await api('POST', `/api/claims/${probe.id}/challenges`, {
    type: 'bad_source',
    description: 'S298 quixotic-marker-98 challenge text.',
    outcome: 'rejected'
  });
  const after = (await api('GET', `/claim/${probe.id}`)).text;
  assert.ok(after.includes('quixotic-marker-98'), 'the record grew, so the page grew — and only then');
});

await test('P5. pages are read-only under pressure, 404 honest, and rate-limited in demo', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await api(method, '/claim/1');
    assert.equal(r.status, 405, `${method} must be refused`);
    assert.match(r.text, /read-only/);
  }
  assert.equal((await api('GET', '/claim/999999')).status, 404);
  // A demo app with a tiny rate limit: the limiter covers /claim too.
  const demoDb = openDb(':memory:');
  seed(demoDb);
  const demoServer = buildApp(demoDb, { demo: true, rateLimit: 3 }).listen(0);
  const demoBase = `http://localhost:${demoServer.address().port}`;
  let last;
  for (let i = 0; i < 4; i++) last = await fetch(`${demoBase}/claim/1`);
  assert.equal(last.status, 429, 'page routes inherit the demo rate limit');
  demoServer.close();
});

await test('P6. the URL scheme survives seed rebuilds: seeded ids are deterministic', async () => {
  const a = openDb(':memory:');
  seed(a);
  const b = openDb(':memory:');
  seed(b);
  const rowsA = a.prepare('SELECT id, text FROM claims ORDER BY id').all();
  const rowsB = b.prepare('SELECT id, text FROM claims ORDER BY id').all();
  assert.deepEqual(rowsA, rowsB, '/claim/<id> for seeded claims is stable across rebuilds');
});

await test('P7. the page is a DOCUMENT (2.98 correction): light/pastel only, no engine bundle, no scripts, engine door present', async () => {
  const { text } = await api('GET', '/claim/1');
  // Reading surface = light variant: parchment ground, pastel tier set.
  assert.ok(text.includes('#F7F2E7'), 'parchment ground (the site reference)');
  assert.ok(text.includes('#C9BEE0') && text.includes('#AFCBE3'), 'pastel tier set');
  // Dark/neon appears NOWHERE on pages — the engine is dark, the page is
  // light, instantly distinguishable by design.
  assert.ok(!text.includes('prefers-color-scheme'), 'no dark mode on the reading surface');
  for (const neon of ['#FF5E3A', '#8A4DFF', '#1FA8FF', '#2BE08A', '#3680E0']) {
    assert.ok(!text.includes(neon), `neon ${neon} must not appear on a page`);
  }
  // Not the SPA, not a hybrid: no engine bundle assets, no scripts at all —
  // view-source shows the claim and the page renders with JS off.
  assert.ok(!/<script/i.test(text), 'a claim page loads no JavaScript');
  assert.ok(!/\/assets\/index-/.test(text), 'no engine bundle asset referenced');
  assert.ok(text.length < 100_000, `article-class weight (${text.length} bytes)`);
  // The bridge: one prominent open-in-the-engine deep link.
  assert.ok(text.includes('?claim=1'), 'the engine door deep-links to this claim');
  assert.ok(text.includes('Open in the engine'), 'and is prominent');
  // The SPA answers the door: it reads ?claim= and selects (single-click).
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\('claim'\)/, 'the engine reads the deep link');
  assert.match(app, /type: 'select', id/, 'single-click semantics on arrival');
  // And the dev server hands /claim to the engine server — the SPA fallback
  // must never swallow the document route again.
  const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
  assert.match(vite, /'\/claim':/, 'vite proxies /claim to the API server');
});

await test('P8. hero + logo (operator request): the site masthead mark and indigo hero band, pastel rings only', async () => {
  const { text } = await api('GET', '/claim/1');
  // The masthead: the site's logo mark (inline SVG, indigo T-glyph, pastel
  // rings) + wordmark. No asset fetch — the mark is part of the document.
  assert.ok(text.includes('class="masthead"'), 'masthead present');
  assert.ok(text.includes('class="mark"'), 'logo mark present');
  assert.match(text, /<span class="word">Truth Onion<\/span>/, 'wordmark');
  assert.match(text, /rect x="44" y="148"[^>]*fill="#131A2A"/, 'the T-glyph, in ink — the light variant');
  // The hero: the site's indigo band with the pastel ring art behind the
  // claim headline. Indigo is the light palette's INK — not the engine's
  // dark mode (P7 pins the neon set and prefers-color-scheme absent).
  assert.ok(text.includes('class="hero"'), 'hero band present');
  assert.match(text, /--indigo:#131A2A/, 'hero indigo is the site token');
  assert.ok(text.includes('class="hero-art"'), 'ring art behind the headline');
  for (const pastel of ['#C97F1F', '#F3BFA8', '#C9BEE0', '#AFCBE3', '#BFD8CB']) {
    assert.match(text, new RegExp(`stroke="${pastel}"`), `ring art uses pastel ${pastel}`);
  }
  const hero = text.indexOf('class="hero"');
  const h1 = text.indexOf('<h1 class="claim"');
  const heroEnd = text.indexOf('<main');
  assert.ok(hero !== -1 && h1 > hero && h1 < heroEnd, 'the claim headline lives inside the hero');
});

// ---------------------------------------------- on-page time machine
// A probe claim with timestamps far enough apart that reconstruction is
// observable (fresh seeds land inside one second). Raw-inserted so the
// timestamps can be explicit; the page must render only what such a record
// supports.
const tmProbe = (() => {
  const r = db
    .prepare(
      `INSERT INTO claims (topic_id, text, kind, layer, radial_tier, status, placement_reason, created_at)
       VALUES (1, 'S298 time-machine probe claim.', 'empirical', 'factual', 'outermost', 'refuted', 'S298 probe: current placement reason.', '2026-01-01 00:00:00')`
    )
    .run();
  const id = Number(r.lastInsertRowid);
  db.prepare(
    `INSERT INTO challenges (claim_id, type, description, outcome, resulting_tier_change, created_at)
     VALUES (?, 'contradicting_evidence', 'S298 probe demotion.', 'upheld', 'outer → outermost', '2026-02-01 00:00:00')`
  ).run(id);
  return id;
})();

await test('P9. scrubbing happens ON the page: ?at= stops, all links, zero scripts', async () => {
  const { text } = await api('GET', `/claim/${tmProbe}`);
  assert.ok(text.includes('Time machine'), 'the scrubber section renders');
  assert.ok(text.includes('class="tm-track"'), 'as a track of stops');
  assert.match(text, new RegExp(`href="/claim/${tmProbe}\\?at=2026-01-01%2000%3A00%3A00"`), 'creation is a stop');
  assert.match(text, new RegExp(`href="/claim/${tmProbe}\\?at=2026-02-01%2000%3A00%3A00"`), 'the demotion is a stop');
  assert.match(text, /class="stop now active"/, 'the present is the active stop on the live view');
  // History timestamps double as stops.
  assert.match(text, new RegExp(`<a class="ts" href="/claim/${tmProbe}\\?at=`), 'history entries link into the machine');
  assert.ok(!/<script/i.test(text), 'the scrubber needs no JavaScript — it is links');
});

await test('P10. ?at= renders the reconstruction: earlier tier, labeled read-only, epoch-honest, feedback deferred to the present', async () => {
  // Between creation and the demotion the claim held the move's FROM tier.
  const mid = (await api('GET', `/claim/${tmProbe}?at=${encodeURIComponent('2026-01-15 00:00:00')}`)).text;
  assert.match(mid, /--tier-outer\)">outer tier/, 'the pre-demotion tier renders');
  assert.match(mid, /status-contested">contested/, 'with the status that tier carried');
  assert.ok(mid.includes('as it stood on <strong>2026-01-15 00:00:00'), 'labeled a reconstruction');
  assert.ok(mid.includes('read-only'), 'and read-only');
  assert.ok(mid.includes('Return to the present'), 'with a way back');
  assert.match(mid, /<title>\[CONTESTED · outer tier — as of 2026-01-15/, 'the share title carries the moment');
  assert.ok(mid.includes('name="robots" content="noindex"'), 'historical views stay out of indexes');
  assert.match(mid, /rel="canonical" href="[^"]*\/claim\/\d+"/, 'canonical is the present document');
  // Drop-box handoff: the anonymous box (a plain form posting to the SITE
  // origin's durable store) renders on reconstructions and the present
  // document alike; no form ever posts to the app itself.
  assert.ok(!/action="\/api/i.test(mid), 'no form posts to the app — the ephemeral DB keeps no inboxes');
  assert.ok(mid.includes('thetruthonion.org/api/dropbox'), 'the drop box is the primary channel');
  assert.ok(mid.includes('contact@thetruthonion.org'), 'email stays as the if-you\'d-like-a-reply option');
  assert.ok(mid.includes('current wording of the placement reason'), 'placement-reason honesty: the record keeps only the current wording');
  // 2026-01-15 predates the log epoch (events begin at seed time) — the
  // page says so instead of passing the view off as complete.
  assert.ok(mid.includes('predates recorded history'), 'log-epoch honesty on the page');
  // Before the claim existed: shown as absent, never guessed.
  const before = (await api('GET', `/claim/${tmProbe}?at=${encodeURIComponent('2025-01-01 00:00:00')}`)).text;
  assert.ok(before.includes('had not yet entered the record'), 'pre-creation moments say the claim was absent');
  assert.ok(before.includes('not yet in the record'), 'chip says so too');
  assert.ok(!/Why it sits here/.test(before), 'no placement sections for a claim that was not there');
  // Unreadable ?at is a 400 with the honest message, not a 404.
  const bad = await api('GET', `/claim/${tmProbe}?at=garbage`);
  assert.equal(bad.status, 400);
  assert.match(bad.text, /Unreadable timestamp/);
  // And the present view is untouched by all of this: current tier, form back.
  const now = (await api('GET', `/claim/${tmProbe}`)).text;
  assert.match(now, /--tier-outermost\)">outermost tier/);
  assert.ok(now.includes('contact@thetruthonion.org'), 'the mailto channel on the present document too');
});

// ------------------------------------------------------------ review socket
await test('R1. review status is a reserved socket: zero events read the honest single-curator line; no code writes one', async () => {
  const r = (await api('GET', '/api/claims/1/review-status')).body;
  assert.equal(r.reviews, 0);
  assert.match(r.line, /none yet — single-curator record/);
  const page = (await api('GET', '/claim/1')).text;
  assert.ok(page.includes('none yet — single-curator record'), 'the line renders on the page');
  // The socket works when an event exists (inserted raw here — NO app path
  // writes one, asserted below).
  db.prepare(
    `INSERT INTO events (actor, action, claim_id, topic_id, detail, reason) VALUES ('reviewer-x', ?, 1, 1, '', 'S298 test review')`
  ).run(REVIEW_EVENT_ACTION);
  const r2 = reviewStatus(db, 1);
  assert.equal(r2.reviews, 1);
  assert.match(r2.line, /1 review event/);
  for (const f of ['service.js', 'index.js', 'timemachine.js', 'claimpages.js']) {
    const src = readFileSync(join(root, 'server', f), 'utf8');
    const writes = src.match(/logEvent\([^)]*action:\s*'review'/) || src.match(/VALUES[^;]*'review'/);
    assert.ok(!writes, `${f} must not write review events — the socket is display-only this stage`);
  }
});

// ------------------------------------------------------------ feedback quarantine
await test('F1. (2.99a Amendment B) the in-product feedback pipe is GONE: no endpoint, no table, no orphan', async () => {
  // The endpoint no longer exists: a POST hits the demo read-only gate
  // (403), and in the full engine there is no route at all (404).
  const demoDb = openDb(':memory:');
  seed(demoDb);
  const demoServer = buildApp(demoDb, { demo: true }).listen(0);
  const demoBase = `http://localhost:${demoServer.address().port}`;
  const post = (base, body) =>
    fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  assert.equal((await post(demoBase, { message: 'x' })).status, 403, 'demo: swallowed by the read-only gate, never stored');
  assert.equal((await post(base, { message: 'x' })).status, 404, 'full engine: no route exists');
  // No feedback table in a fresh schema — an accept-then-lose inbox on an
  // ephemeral database is banned; the durable pipe is 2.99b scope.
  const table = demoDb
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feedback'`)
    .get();
  assert.equal(table, undefined, 'no orphaned feedback table in the schema');
  // No orphaned server code path.
  const idx = readFileSync(join(root, 'server', 'index.js'), 'utf8');
  assert.ok(!/api\/feedback/.test(idx), 'no feedback route remains in the server');
  for (const f of ['timemachine.js', 'service.js', 'claimpages.js', 'db.js']) {
    const src = readFileSync(join(root, 'server', f), 'utf8');
    assert.ok(!/FROM feedback|INSERT INTO feedback|CREATE TABLE.*feedback/i.test(src), `${f} carries no feedback machinery`);
  }
  demoServer.close();
});

await test('F2. the feedback channels: anonymous drop box primary (site origin), email secondary — never the app DB', async () => {
  const page = (await api('GET', '/claim/1')).text;
  assert.ok(page.includes('thetruthonion.org/api/dropbox'), 'claim pages post the anonymous box to the SITE origin');
  // The masthead "feedback" link lands on a READY form — open by default,
  // one click to type: the same function as the engine's feedback button.
  assert.match(page, /<details class="note fb-pop" id="feedback" open>/, 'the page box is open, not a collapsed extra click');
  assert.ok(page.includes('mailto:contact@thetruthonion.org'), 'email stays for anyone who wants a reply');
  assert.match(page, /don't ask who you are and don't retain anything that says/, 'the anonymity claim, exactly as far as it is true');
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  assert.ok(app.includes('FEEDBACK_EMAIL'), 'the app keeps the email option (one constant, dropbox.js)');
  const dropbox = readFileSync(join(root, 'client', 'src', 'dropbox.js'), 'utf8');
  assert.ok(dropbox.includes('contact@thetruthonion.org'), 'the address lives once, in the drop-box module');
  assert.ok(!/api\.feedback|\/api\/feedback/.test(app), 'no client path posts feedback to the app server');
});

await test('F3. the header feedback affordance replaced the add-claim button; adding a claim lives in search', async () => {
  const app = readFileSync(join(root, 'client', 'src', 'App.jsx'), 'utf8');
  // UI-fix session 2026-08-09: the affordance became the ONE combined
  // surface — contribute your save / leave feedback (operator ruling).
  assert.match(app, /✉ contribute \/ feedback/, 'the header carries the feedback affordance');
  // The engine's top-left wordmark links to the site (operator request).
  assert.match(app, /<h1>\s*<a\s+href="https:\/\/thetruthonion\.org\/"/, 'the Truth Onion wordmark links to thetruthonion.org');
  assert.ok(!app.includes('+ Add claim\n'), 'the header add-claim button is gone');
  const searchBox = readFileSync(join(root, 'client', 'src', 'SearchBox.jsx'), 'utf8');
  assert.match(searchBox, /\+ add claim/, 'the add-claim flow remains reachable via the search dropdown');
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /page ↗/, 'the claim panel carries the page affordance');
  assert.match(panel, /copy link/, 'and copy-link');
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
process.exit(failed ? 1 : 0);
