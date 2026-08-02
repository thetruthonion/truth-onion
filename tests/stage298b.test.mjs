// Stage 2.98b pressure tests: record permanence & source links.
// The record already refuses to forget; these tests pin that the UI/API
// surface now agrees — no hard-delete affordance on any record entity,
// withdrawal requires a reason everywhere, withdrawn evidence renders
// diminished-but-visible (claim, page, replay), links end only through
// recorded adjudication, and every seeded source is linked or honestly
// labeled.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../server/db.js';
import { seed } from '../server/seed.js';
import { buildApp } from '../server/index.js';
import { renderClaimPage } from '../server/claimpages.js';
import { HONEST_LABELS, SOURCE_LINKS, applySourceLinks } from '../server/sourcelinks.js';

const db = openDb(':memory:');
seed(db);
const server = buildApp(db).listen(0);
const base = `http://localhost:${server.address().port}`;

const api = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, body: json, text };
};

const mk = (over = {}) =>
  api('POST', '/api/claims', {
    topic_id: 1,
    text: `S298B: ${Math.random().toString(36).slice(2)} fixture claim.`,
    kind: 'empirical',
    layer: 'factual',
    radial_tier: 'outer',
    placement_reason: 'S298B fixture.',
    sources: [],
    ...over
  });

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
console.log('\nStage 2.98b — record permanence & source links\n');

// Amendment A: withdrawal is two-phase. This helper files AND upholds — for
// tests that need the effect; the phases themselves are pinned in A9–A11.
const withdraw = async (claimId, sourceId, reason) => {
  const p = await api('POST', `/api/claims/${claimId}/sources/${sourceId}/withdraw`, { reason });
  if (p.status !== 200) return p;
  return api('POST', `/api/claims/${claimId}/sources/${sourceId}/withdraw/adjudicate`, { outcome: 'upheld' });
};
const withdrawLib = async (sourceId, reason) => {
  const p = await api('POST', `/api/sources/${sourceId}/withdraw`, { reason });
  if (p.status !== 200) return p;
  return api('POST', `/api/sources/${sourceId}/withdraw/adjudicate`, { outcome: 'upheld' });
};

await test('A1. withdrawal requires a reason EVERYWHERE — refused without one, blocker named; hard deletes are 405', async () => {
  const c = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A1 src', relation: 'supports' }] })).body;
  const sid = c.sources[0].id;
  for (const body of [undefined, {}, { reason: '' }, { reason: '   ' }]) {
    const r = await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, body);
    assert.equal(r.status, 422, 'reason-less withdrawal refused');
    assert.match(r.body.error, /reason/i, 'the blocker is named');
  }
  assert.equal((await api('POST', `/api/sources/${sid}/withdraw`, {})).status, 422);
  // The old delete verbs no longer exist — 405 with the honest message.
  assert.equal((await api('DELETE', `/api/claims/${c.id}/sources/${sid}`)).status, 405);
  assert.equal((await api('DELETE', `/api/sources/${sid}`)).status, 405);
  assert.equal((await api('DELETE', `/api/claims/${c.id}/supports/1`)).status, 405);
  assert.equal((await api('DELETE', `/api/claims/${c.id}/kernels/1`)).status, 405);
  const msg = (await api('DELETE', `/api/sources/${sid}`)).body.error;
  assert.match(msg, /never hard-deleted/i);
  // Stated exception: the parking lot stays truly deletable (private
  // scratch, no standing).
  const note = (await api('POST', '/api/topics/1/parking', { text: 'S298B scratch' })).body;
  assert.equal((await api('DELETE', `/api/parking/${note.id}`)).status, 200);
});

await test('A2. the schema is the second layer that says no: raw DELETE on sources/attachments aborts', async () => {
  assert.throws(() => db.prepare('DELETE FROM sources WHERE id = 1').run(), /never hard-deleted/);
  assert.throws(() => db.prepare('DELETE FROM claim_sources WHERE claim_id = 1').run(), /never hard-deleted/);
});

await test('A3. withdrawn evidence is diminished, never vanished: reason + date on the claim, ripple identical to detach', async () => {
  const c = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A3 load-bearing', relation: 'supports' }] })).body;
  const sid = c.sources[0].id;
  const r = await withdraw(c.id, sid, 'S298B A3: retracted by publisher');
  assert.equal(r.status, 200);
  assert.equal(r.body.demoted, true, 'ripple applies exactly as detach did');
  assert.equal(r.body.claim.radial_tier, 'outer');
  const fresh = (await api('GET', `/api/claims/${c.id}`)).body;
  assert.equal(fresh.sources.length, 0, 'no longer active evidence');
  assert.equal(fresh.withdrawn_sources.length, 1, 'still visible');
  const w = fresh.withdrawn_sources[0];
  assert.equal(w.withdrawn_reason, 'S298B A3: retracted by publisher');
  assert.ok(w.withdrawn_at, 'dated');
  assert.equal(w.withdrawn_scope, 'claim');
  assert.equal(w.citation, 'S298B A3 load-bearing', 'the citation itself stays readable — someone can stand up for it');
  // Proposing against already-withdrawn evidence is refused; the record
  // already says it.
  assert.equal((await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, { reason: 'again' })).status, 422);
  // The claim PAGE renders the withdrawal with reason and review state.
  const page = renderClaimPage(db, c.id, {});
  assert.ok(page.includes('Withdrawn — no longer part of the case'));
  assert.ok(page.includes('retracted by publisher'));
  assert.ok(page.includes('single-curator record'), 'review line on the withdrawn entry (kickoff B)');
});

await test('A4. library withdrawal: entry stays listed, every leaning claim re-evaluates, withdrawn evidence cannot re-attach', async () => {
  const c1 = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A4 shared', relation: 'supports' }] })).body;
  const sid = c1.sources[0].id;
  const c2 = (await mk({ radial_tier: 'middle', sources: [{ source_id: sid, relation: 'supports' }] })).body;
  const r = await withdrawLib(sid, 'S298B A4: forged');
  assert.equal(r.status, 200);
  assert.equal(r.body.affected.length, 2, 'both claims re-evaluate');
  assert.ok(r.body.affected.every((e) => e.demoted));
  const lib = (await api('GET', '/api/topics/1')).body.sources;
  const entry = lib.find((s) => s.id === sid);
  assert.ok(entry, 'the entry did NOT vanish from the library listing');
  assert.equal(entry.withdrawn, true, 'it is marked withdrawn');
  // Withdrawn evidence cannot be newly attached; the refusal names it.
  const again = await api('POST', `/api/claims/${c2.id}/sources`, { source_id: sid, relation: 'supports' });
  assert.equal(again.status, 422);
  assert.match(again.body.error, /withdrawn/i);
  // An identical citation becomes a NEW entity — never a silent revival.
  const c3 = (await mk({ sources: [{ tier: 'reputable_secondary', citation: 'S298B A4 shared', relation: 'supports' }] })).body;
  assert.notEqual(c3.sources[0].id, sid, 'find-or-create skips withdrawn entries');
});

await test('A5. replay: before the withdrawal the source is active VERBATIM (relation intact); after, a withdrawal — never an absence', async () => {
  const c = (await mk({ sources: [{ tier: 'primary_doc', citation: 'S298B A5 contradicting doc', relation: 'contradicts' }] })).body;
  const sid = c.sources[0].id;
  const tHeld = db.prepare(`SELECT datetime('now') AS t`).get().t;
  await new Promise((res) => setTimeout(res, 1100));
  await withdraw(c.id, sid, 'S298B A5: for the replay');
  const past = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(tHeld)}`)).body;
  const s = past.claim.sources.find((x) => x.id === sid);
  assert.ok(s, 'active at the pre-withdrawal moment');
  assert.equal(s.relation, 'contradicts', 'VERBATIM from the surviving row — the relation is not guessed');
  assert.equal(s.reconstructed, true, 'flagged');
  const nowTs = db.prepare(`SELECT datetime('now') AS t`).get().t;
  const now = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(nowTs)}`)).body;
  assert.equal(now.claim.sources.length, 0);
  assert.equal(now.claim.withdrawn_sources.length, 1, 'the withdrawal shows AT its timestamp, not as silence');
});

await test('A6. links end only through recorded adjudication; the kernel gap statement travels into the event and replay', async () => {
  const kernel = (await mk({ radial_tier: 'middle', text: 'S298B A6 kernel claim.', sources: [{ tier: 'reputable_secondary', citation: 'S298B A6 k src', relation: 'supports' }] })).body;
  const outer = (await mk({ text: 'S298B A6 overreaching claim.' })).body;
  await api('POST', `/api/claims/${outer.id}/kernels`, {
    kernel_id: kernel.id,
    establishes: 'S298B-A6 establishes text',
    asserts_beyond: 'S298B-A6 beyond text',
    path_inward: 'S298B-A6 path text'
  });
  const linkId = (await api('GET', `/api/claims/${outer.id}`)).body.kernel_links[0].id;
  const tBefore = db.prepare(`SELECT datetime('now') AS t`).get().t;
  await new Promise((res) => setTimeout(res, 1100));
  const ch = await api('POST', `/api/claims/${outer.id}/challenges`, {
    type: 'equivocation',
    description: 'S298B A6: the gap statement mischaracterizes the kernel.',
    outcome: 'upheld',
    kernel_link_id: linkId
  });
  assert.equal(ch.status, 200);
  assert.equal((await api('GET', `/api/claims/${outer.id}`)).body.kernel_links.length, 0, 'upheld severs');
  const ev = (await api('GET', `/api/events?claim_id=${outer.id}`)).body.find((e) => e.action === 'kernel_link_removed');
  assert.ok(ev, 'removal recorded');
  assert.match(ev.detail, /establishes: S298B-A6 establishes text/, 'the authored gap statement travels into the event');
  // Replay at the pre-removal moment renders the gap VERBATIM, not a
  // placeholder.
  const past = (await api('GET', `/api/claims/${outer.id}/at?ts=${encodeURIComponent(tBefore)}`)).body;
  const kl = past.claim.kernel_links.find((l) => l.kernel_id === kernel.id);
  assert.ok(kl, 'link restored in the past view');
  assert.equal(kl.gap_establishes, 'S298B-A6 establishes text', 'gap statement recovered from the event record');
});

await test('A7. audit fix: demotion severance of support links is now a logged event (replay can reconstruct it)', async () => {
  const strong = (await mk({ radial_tier: 'middle', text: 'S298B A7 supporter.', sources: [{ tier: 'reputable_secondary', citation: 'S298B A7 src', relation: 'supports' }] })).body;
  const held = (await mk({ radial_tier: 'middle', text: 'S298B A7 supported.', sources: [{ tier: 'reputable_secondary', citation: 'S298B A7 src 2', relation: 'supports' }] })).body;
  await api('POST', `/api/claims/${strong.id}/supports`, { supported_id: held.id });
  const r = await api('POST', `/api/claims/${strong.id}/demote`, {
    target_tier: 'outermost',
    reason: 'S298B A7: severance must log.'
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.severed_supports.length, 1);
  const ev = (await api('GET', `/api/events?claim_id=${strong.id}`)).body.find(
    (e) => e.action === 'support_link_removed' && /Severed by demotion/.test(e.reason)
  );
  assert.ok(ev, 'the severance is an event, not just a return payload');
});

await test('A8. inventory pins: no hard-delete affordance in API or UI on record entities (parking excepted)', async () => {
  const idx = readFileSync(join(root, 'server', 'index.js'), 'utf8');
  const deletes = [...idx.matchAll(/app\.delete\('([^']+)'/g)].map((m) => m[1]);
  for (const route of deletes) {
    if (route === '/api/parking/:id') continue; // stated exception
    const handler = idx.slice(idx.indexOf(`app.delete('${route}'`), idx.indexOf(`app.delete('${route}'`) + 600);
    assert.ok(/405/.test(handler), `${route} must refuse, not delete`);
  }
  const svc = readFileSync(join(root, 'server', 'service.js'), 'utf8');
  assert.ok(!svc.includes('export function removeKernelLink'), 'the direct kernel-removal function is gone');
  const apiJs = readFileSync(join(root, 'client', 'src', 'api.js'), 'utf8');
  const clientDeletes = [...apiJs.matchAll(/call\('DELETE', `([^`]+)`/g)].map((m) => m[1]);
  assert.deepEqual(clientDeletes, ['/api/parking/${noteId}'], 'the client can hard-delete nothing but parked notes');
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /Withdrawal ▾/, 'the withdrawal affordance replaced the ⨯');
  assert.match(panel, /required — permanent on the record/, 'the reason field says what it is');
});

await test('A9. (Amendment A, DoD 7) an un-adjudicated withdrawal provably has ZERO rule effect; ripples fire at adjudication time', async () => {
  const c = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A9 load-bearing', relation: 'supports' }] })).body;
  const sid = c.sources[0].id;
  const floorsBefore = (await api('GET', `/api/claims/${c.id}/tier-preview`)).body;
  const p = await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, { reason: 'S298B A9: filed, not yet adjudicated' });
  assert.equal(p.status, 200);
  // No effect precedes adjudication — structurally.
  const after = (await api('GET', `/api/claims/${c.id}`)).body;
  assert.equal(after.radial_tier, 'middle', 'the claim did not move');
  assert.equal(after.sources.length, 1, 'the source still counts as active evidence');
  assert.deepEqual(
    (await api('GET', `/api/claims/${c.id}/tier-preview`)).body,
    floorsBefore,
    'the floor computation is provably blind to the proposal'
  );
  assert.ok(after.sources[0].withdrawal_proposed, 'but the proposal renders on the source');
  assert.equal(after.sources[0].withdrawal_proposed.reason, 'S298B A9: filed, not yet adjudicated');
  const evBefore = (await api('GET', `/api/events?claim_id=${c.id}`)).body;
  assert.ok(!evBefore.some((e) => e.action === 'demotion'), 'no ripple at filing time');
  assert.ok(evBefore.some((e) => e.action === 'withdrawal_proposed'), 'the filing is its own event');
  // Duplicate filing refused; adjudicating nothing refused; bad outcome refused.
  assert.equal((await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, { reason: 'again' })).status, 422);
  assert.equal((await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw/adjudicate`, { outcome: 'maybe' })).status, 422);
  // Adjudicate upheld → the ripple fires NOW.
  const r = await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw/adjudicate`, { outcome: 'upheld' });
  assert.equal(r.status, 200);
  assert.equal(r.body.demoted, true, 'ripple at adjudication time');
  const ev = (await api('GET', `/api/events?claim_id=${c.id}`)).body;
  const proposed = ev.find((e) => e.action === 'withdrawal_proposed');
  const effect = ev.find((e) => e.action === 'source_detached');
  assert.ok(proposed && effect, 'proposal and effect are distinct events');
  assert.ok(proposed.id < effect.id, 'in order');
  // Adjudicating again: nothing pending.
  assert.equal((await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw/adjudicate`, { outcome: 'upheld' })).status, 422);
});

await test('A10. (Amendment A, DoD 8) rejected withdrawals are permanent history; proposed state renders; curator-honesty text shows', async () => {
  const c = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A10 contested evidence', relation: 'supports' }] })).body;
  const sid = c.sources[0].id;
  await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, { reason: 'S298B A10: I dislike this evidence' });
  // The pending proposal renders on the claim page with the honesty line.
  const pending = renderClaimPage(db, c.id, {});
  assert.ok(pending.includes('withdrawal proposed — S298B A10: I dislike this evidence'), 'proposed state on the page');
  assert.ok(pending.includes('keeps its full standing until adjudication'), 'no-effect stated');
  assert.ok(pending.includes('Adjudicated by curator'), 'curator-honesty text');
  assert.ok(pending.includes('single-curator record'), 'review socket, no pretense');
  const r = await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw/adjudicate`, { outcome: 'rejected' });
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, 'rejected');
  const fresh = (await api('GET', `/api/claims/${c.id}`)).body;
  assert.equal(fresh.sources.length, 1, 'the source stands');
  assert.equal(fresh.radial_tier, 'middle', 'nothing moved');
  assert.ok(!fresh.sources[0].withdrawal_proposed, 'the pending state cleared');
  // …but the attempt is permanently in history, like a failed promotion.
  const hist = (await api('GET', `/api/claims/${c.id}/history`)).body;
  assert.ok(hist.entries.some((e) => e.kind === 'withdrawal_proposed'), 'the filing stays in history');
  assert.ok(hist.entries.some((e) => e.kind === 'withdrawal_rejected'), 'and the rejection');
  const ev = (await api('GET', `/api/events?claim_id=${c.id}`)).body;
  const rej = ev.find((e) => e.action === 'withdrawal_rejected');
  assert.ok(rej, 'rejection is an event');
  assert.match(rej.reason, /rejected by curator/i, 'with actor honesty in the record');
  assert.ok(rej.actor && rej.created_at && rej.reason, 'actor, timestamp, reason — all present');
  // The library scope has the same two-phase gate.
  const pl = await api('POST', `/api/sources/${sid}/withdraw`, { reason: 'S298B A10 lib proposal' });
  assert.equal(pl.status, 200);
  const lib = (await api('GET', '/api/topics/1')).body.sources.find((s) => s.id === sid);
  assert.ok(lib.withdrawal_proposed, 'library proposal renders in the listing');
  assert.equal((await api('POST', `/api/sources/${sid}/withdraw/adjudicate`, { outcome: 'rejected' })).status, 200);
  assert.equal((await api('GET', `/api/claims/${c.id}`)).body.sources.length, 1, 'library rejection: everything stands');
});

await test('A11. (Amendment A, DoD 9) replay: proposal and adjudication are distinct events; effect never retroactive to filing time', async () => {
  const c = (await mk({ radial_tier: 'middle', sources: [{ tier: 'reputable_secondary', citation: 'S298B A11 replayed', relation: 'supports' }] })).body;
  const sid = c.sources[0].id;
  await new Promise((res) => setTimeout(res, 1100));
  await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw`, { reason: 'S298B A11: watch the timing' });
  const tPending = db.prepare(`SELECT datetime('now') AS t`).get().t;
  await new Promise((res) => setTimeout(res, 1100));
  await api('POST', `/api/claims/${c.id}/sources/${sid}/withdraw/adjudicate`, { outcome: 'upheld' });
  // Between filing and adjudication the source was ACTIVE — the withdrawal
  // is never retroactively effective from its proposal time.
  const between = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(tPending)}`)).body;
  const active = between.claim.sources.find((s) => s.id === sid);
  assert.ok(active, 'active during the pending window');
  assert.equal(between.claim.radial_tier, 'middle', 'tier unmoved during the window');
  assert.ok(active.withdrawal_proposed, 'and the pending proposal shows at that moment');
  assert.equal(between.claim.withdrawn_sources.length, 0, 'not withdrawn yet at that moment');
  // After adjudication: withdrawn, demoted — at the adjudication timestamp.
  const nowTs = db.prepare(`SELECT datetime('now') AS t`).get().t;
  const now = (await api('GET', `/api/claims/${c.id}/at?ts=${encodeURIComponent(nowTs)}`)).body;
  assert.equal(now.claim.sources.length, 0);
  assert.equal(now.claim.withdrawn_sources.length, 1);
  // The timeline carries both as distinct events.
  const tl = (await api('GET', '/api/topics/1/timeline')).body;
  const acts = tl.events.filter((e) => e.claim_id === c.id).map((e) => e.action);
  assert.ok(acts.includes('withdrawal_proposed'), 'proposal in the timeline');
  assert.ok(acts.includes('source_detached'), 'adjudicated effect in the timeline');
});

await test('A12. one Withdrawal dropdown (operator request): a single control offering both scopes; proposal + adjudication confirms', async () => {
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(panel, /Withdrawal ▾/, 'a single dropdown labeled Withdrawal');
  assert.match(panel, /from this claim…/, 'scope option 1');
  assert.match(panel, /from the library…/, 'scope option 2');
  assert.ok(!panel.includes('>withdraw…<') && !panel.includes('withdraw lib…'), 'the two separate buttons are gone');
  assert.match(panel, /file proposal/, 'the form files a proposal');
  assert.match(panel, /zero rule effect|full standing until/, 'no-effect stated in the UI');
  assert.match(panel, /uphold/, 'adjudication controls exist');
  assert.match(panel, /Adjudicated by curator/, 'curator-honesty line in the panel');
  const apiJs = readFileSync(join(root, 'client', 'src', 'api.js'), 'utf8');
  assert.ok(!apiJs.includes('withdrawSource:') && !apiJs.includes('withdrawLibrarySource:'), 'no one-shot withdrawal call remains');
});

await test('B1. review-status treatment on attach/withdraw entries where they render', async () => {
  const panel = readFileSync(join(root, 'client', 'src', 'ClaimPanel.jsx'), 'utf8');
  assert.match(
    panel,
    /\['source_attached', 'source_detached', 'withdrawal_proposed', 'withdrawal_rejected'\]\.includes\(e\.kind\)/,
    'history attach/withdraw/proposal entries carry the line'
  );
  assert.match(panel, /single-curator record/);
  const pages = readFileSync(join(root, 'server', 'claimpages.js'), 'utf8');
  assert.match(pages, /withdrawnHtml/, 'the page withdrawn section exists');
  assert.ok(/review\.line/.test(pages), 'and carries the review line');
});

await test('C1. seed lint: every seeded source is linked or honestly labeled — zero naked linkless statements', async () => {
  const lintDb = openDb(':memory:');
  seed(lintDb);
  const rows = lintDb.prepare('SELECT id, citation, url FROM sources').all();
  assert.ok(rows.length >= 30, `the seed carries its sources (${rows.length})`);
  for (const s of rows) {
    const linked = s.url && s.url.trim().length > 0;
    const labeled = HONEST_LABELS.some((l) => s.citation.includes(l.trim()));
    assert.ok(linked || labeled, `naked linkless source #${s.id}: "${s.citation.slice(0, 70)}"`);
  }
  // Labels and links are mutually honest: a link is https and never a
  // placeholder domain.
  for (const s of rows.filter((r) => r.url)) {
    assert.match(s.url, /^https:\/\//, `#${s.id} link must be https`);
    assert.ok(!/example\.|TODO|placeholder/i.test(s.url), `#${s.id} link must be real`);
  }
});

await test('C2. the audit is idempotent and its mapping matches the seed verbatim', async () => {
  const a = openDb(':memory:');
  seed(a);
  const once = a.prepare('SELECT id, citation, url FROM sources ORDER BY id').all();
  const changedAgain = applySourceLinks(a);
  assert.equal(changedAgain.length, 0, 'a second application changes nothing');
  const twice = a.prepare('SELECT id, citation, url FROM sources ORDER BY id').all();
  assert.deepEqual(once, twice);
  // Every mapping entry for the seeded topics matched a real source — a
  // dangling match would mean the mapping drifted from the seed.
  const allCitations = new Set(once.map((r) => r.citation));
  const seededMatches = SOURCE_LINKS.filter(
    (e) => allCitations.has(e.match) || allCitations.has(e.match + (e.label || ''))
  );
  assert.ok(seededMatches.length >= 28, `mapping entries matched seeded sources (${seededMatches.length})`);
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
process.exit(failed ? 1 : 0);
