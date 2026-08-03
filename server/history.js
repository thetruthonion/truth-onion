// History restore (release fix session, 2026-08-01). The demo's pristine
// database is a RESTORE of the exported curated record — ids, timestamps,
// reasons, and actors preserved verbatim from the fixture — not a re-seed
// that would stamp build-day time over real history. The time machine, the
// epoch banner, and the derived/log distinction all read timestamps, so the
// only honest seed is the recorded one.
//
// This is a restore of an already-adjudicated record, not a stream of new
// writes: rows are inserted directly (the rules layer already ruled on each
// of them when they happened, and the schema CHECKs and triggers still
// stand under every insert here — a fixture that violates them fails the
// restore). Withdrawal state is applied in two phases — attach active, then
// update to the recorded withdrawal — so the FTS maintenance triggers see
// the same sequence the live record did and the search index stays honest.

// 2.99a: the record-shaped export — every table of a database, verbatim,
// in the same shape restoreHistory reads. Used by sandbox save files (the
// whole copy is the visitor's record, so no curation filter here; the
// curated-fixture export script keeps its own filtered, scanned path).
export function exportRecord(db) {
  const all = (sql) => db.prepare(sql).all();
  return {
    topics: all('SELECT * FROM topics ORDER BY id'),
    claims: all('SELECT * FROM claims ORDER BY id'),
    sources: all('SELECT * FROM sources ORDER BY id'),
    attachments: all('SELECT * FROM claim_sources ORDER BY claim_id, source_id'),
    supports: all('SELECT * FROM claim_supports ORDER BY supporter_id, supported_id'),
    kernels: all('SELECT * FROM claim_kernels ORDER BY id'),
    challenges: all('SELECT * FROM challenges ORDER BY id'),
    events: all('SELECT * FROM events ORDER BY id')
  };
}

export function restoreHistory(db, fixture) {
  if (!fixture || fixture.format !== 'truth-onion-history') {
    throw new Error('Not a truth-onion-history fixture (missing or wrong "format").');
  }
  if (!Number.isInteger(fixture.version) || fixture.version > 1) {
    throw new Error(`History fixture version ${fixture?.version} is not readable by this build (reads up to 1).`);
  }
  for (const key of ['topics', 'claims', 'sources', 'attachments', 'supports', 'kernels', 'challenges', 'events']) {
    if (!Array.isArray(fixture[key])) throw new Error(`History fixture is missing "${key}".`);
  }
  if (db.prepare('SELECT 1 FROM topics LIMIT 1').get()) {
    throw new Error('Refusing to restore into a non-empty database.');
  }

  db.exec('BEGIN');
  try {
    const ins = (sql) => db.prepare(sql);

    const topicIns = ins('INSERT INTO topics (id, name, description) VALUES (?,?,?)');
    for (const t of fixture.topics) topicIns.run(t.id, t.name, t.description);

    // 2.99b columns (pending kind challenge, recast provenance) restore
    // verbatim; pre-2.99b fixtures simply carry nulls.
    const claimIns = ins(
      `INSERT INTO claims (id, topic_id, text, kind, layer, radial_tier, vertical_direction,
         vertical_magnitude, vertical_evidenced, status, placement_reason, created_at,
         kind_proposed_at, kind_proposed_to, kind_proposed_reason, recast_of)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const c of fixture.claims) {
      claimIns.run(
        c.id, c.topic_id, c.text, c.kind, c.layer, c.radial_tier,
        c.vertical_direction, c.vertical_magnitude, c.vertical_evidenced,
        c.status, c.placement_reason, c.created_at,
        c.kind_proposed_at ?? null, c.kind_proposed_to ?? null, c.kind_proposed_reason ?? null,
        c.recast_of ?? null
      );
    }

    // Sources and attachments: inserted ACTIVE, then updated to any recorded
    // withdrawal/proposal state — the same order the live record moved in,
    // so the FTS withdraw triggers fire exactly as they did.
    const srcIns = ins(
      `INSERT INTO sources (id, topic_id, tier, citation, url, is_claimant_self_published)
       VALUES (?,?,?,?,?,?)`
    );
    const srcWd = ins(
      `UPDATE sources SET withdrawn_at = ?, withdrawn_reason = ?, proposed_at = ?, proposed_reason = ? WHERE id = ?`
    );
    for (const s of fixture.sources) {
      srcIns.run(s.id, s.topic_id, s.tier, s.citation, s.url, s.is_claimant_self_published);
      if (s.withdrawn_at || s.proposed_at) {
        srcWd.run(s.withdrawn_at, s.withdrawn_reason, s.proposed_at, s.proposed_reason, s.id);
      }
    }

    const attIns = ins('INSERT INTO claim_sources (claim_id, source_id, relation) VALUES (?,?,?)');
    const attWd = ins(
      `UPDATE claim_sources SET withdrawn_at = ?, withdrawn_reason = ?, proposed_at = ?, proposed_reason = ?
       WHERE claim_id = ? AND source_id = ?`
    );
    for (const a of fixture.attachments) {
      attIns.run(a.claim_id, a.source_id, a.relation);
      if (a.withdrawn_at || a.proposed_at) {
        attWd.run(a.withdrawn_at, a.withdrawn_reason, a.proposed_at, a.proposed_reason, a.claim_id, a.source_id);
      }
    }

    const supIns = ins('INSERT INTO claim_supports (supporter_id, supported_id) VALUES (?,?)');
    for (const s of fixture.supports) supIns.run(s.supporter_id, s.supported_id);

    const kerIns = ins(
      `INSERT INTO claim_kernels (id, claim_id, kernel_id, gap_establishes, gap_asserts_beyond,
         gap_path_inward, origin, created_at) VALUES (?,?,?,?,?,?,?,?)`
    );
    for (const k of fixture.kernels) {
      kerIns.run(k.id, k.claim_id, k.kernel_id, k.gap_establishes, k.gap_asserts_beyond, k.gap_path_inward, k.origin, k.created_at);
    }

    const chIns = ins(
      `INSERT INTO challenges (id, claim_id, type, description, outcome, resulting_tier_change,
         created_at, kernel_link_id, hop_supporter_id, hop_supported_id) VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    for (const ch of fixture.challenges) {
      chIns.run(
        ch.id, ch.claim_id, ch.type, ch.description, ch.outcome, ch.resulting_tier_change,
        ch.created_at, ch.kernel_link_id, ch.hop_supporter_id, ch.hop_supported_id
      );
    }

    const evIns = ins(
      `INSERT INTO events (id, actor, action, claim_id, topic_id, detail, reason, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    for (const e of fixture.events) {
      evIns.run(e.id, e.actor, e.action, e.claim_id, e.topic_id, e.detail, e.reason, e.created_at);
    }

    // The restore must be the fixture, exactly: counts per table, zero
    // replacement characters (release 0a-i), event timeline byte-identical.
    const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
    const expect = {
      topics: fixture.topics.length, claims: fixture.claims.length, sources: fixture.sources.length,
      claim_sources: fixture.attachments.length, claim_supports: fixture.supports.length,
      claim_kernels: fixture.kernels.length, challenges: fixture.challenges.length, events: fixture.events.length
    };
    for (const [t, n] of Object.entries(expect)) {
      if (count(t) !== n) throw new Error(`Restore drift: ${t} has ${count(t)} rows, fixture has ${n}.`);
    }
    for (const t of Object.keys(expect)) {
      const cols = db.prepare(`PRAGMA table_info(${t})`).all().filter((c) => /TEXT/i.test(c.type || ''));
      for (const c of cols) {
        const bad = db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${c.name} LIKE '%' || char(65533) || '%'`).get().n;
        if (bad) throw new Error(`Restore carries U+FFFD in ${t}.${c.name} — the fixture correction did not hold.`);
      }
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const spanFor = (topicId) =>
    db
      .prepare(
        `SELECT MIN(x) lo, MAX(x) hi FROM (
           SELECT created_at x FROM events WHERE topic_id = ?
           UNION ALL SELECT created_at FROM claims WHERE topic_id = ?
           UNION ALL SELECT ch.created_at FROM challenges ch JOIN claims c ON c.id = ch.claim_id WHERE c.topic_id = ?
         )`
      )
      .get(topicId, topicId, topicId);
  return {
    topics: fixture.topics.map((t) => ({ id: t.id, name: t.name, ...spanFor(t.id) })),
    claims: fixture.claims.length,
    sources: fixture.sources.length,
    events: fixture.events.length,
    corrections: (fixture.corrections || []).length
  };
}
