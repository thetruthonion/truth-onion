// SPDX-License-Identifier: AGPL-3.0-only
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { curatorVerified } from './sourcelinks.js';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = join(here, 'data', 'truth-onion.db');

// SQL fragment ranking tiers so the DB itself can compare them in triggers.
const RANK = (col) =>
  `CASE ${col} WHEN 'core' THEN 0 WHEN 'inner' THEN 1 WHEN 'middle' THEN 2 WHEN 'outer' THEN 3 WHEN 'outermost' THEN 4 ELSE 99 END`;

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  text TEXT NOT NULL CHECK (length(trim(text)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('empirical','metaphysical','historical')),
  layer TEXT NOT NULL CHECK (layer IN ('factual','moral','framing')),
  radial_tier TEXT CHECK (radial_tier IN ('core','inner','middle','outer','outermost')),
  vertical_direction TEXT NOT NULL DEFAULT 'neutral'
    CHECK (vertical_direction IN ('help','harm','neutral')),
  vertical_magnitude INTEGER NOT NULL DEFAULT 0,
  vertical_evidenced INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('confirmed','contested','refuted')),
  placement_reason TEXT NOT NULL CHECK (length(trim(placement_reason)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- 2.99b: a PENDING kind_mismatch challenge (two-phase, zero effect until
  -- adjudication — the rules read the kind column alone, never these).
  kind_proposed_at TEXT,
  kind_proposed_to TEXT,
  kind_proposed_reason TEXT,
  -- 2.99b: the recast relation — this claim is a deliberate evidence-
  -- eligible rewording of an off-axis claim. Zero weight in both
  -- directions; provenance displayed honestly, contributing nothing.
  recast_of INTEGER REFERENCES claims(id),
  -- Rule: metaphysical claims cannot take a radial tier; everything else must.
  CHECK ((kind = 'metaphysical') = (radial_tier IS NULL)),
  -- Rule: moral & framing claims cannot occupy Core.
  CHECK (NOT (layer IN ('moral','framing') AND radial_tier = 'core')),
  -- Rule: vertical placement requires evidenced outcomes.
  CHECK (vertical_direction = 'neutral' OR vertical_evidenced = 1)
);

-- Stage 2.5: sources are first-class library entities, one per document,
-- attachable to many claims. Citation, tier, and the self-published flag
-- live here; the supports/contradicts/is_origin_of relation lives on the
-- attachment.
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  tier TEXT NOT NULL CHECK (tier IN
    ('primary_doc','court_record','reputable_secondary','single_outlet','self_published','anonymous')),
  citation TEXT NOT NULL CHECK (length(trim(citation)) > 0),
  url TEXT NOT NULL DEFAULT '',
  is_claimant_self_published INTEGER NOT NULL DEFAULT 0,
  -- 2.98b: recorded withdrawal replaces deletion. A withdrawn source keeps
  -- its row — status, reason, date — and renders diminished, never vanished.
  -- 2.98b Amendment A: withdrawal is TWO-PHASE. proposed_* is the filed,
  -- un-adjudicated state — visible, zero rule effect. withdrawn_* is set
  -- only by an upheld adjudication; every rule reads withdrawn_* alone, so
  -- the floors are structurally blind to proposals.
  withdrawn_at TEXT,
  withdrawn_reason TEXT,
  proposed_at TEXT,
  proposed_reason TEXT
);

CREATE TABLE IF NOT EXISTS claim_sources (
  claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('supports','contradicts','is_origin_of')),
  withdrawn_at TEXT,
  withdrawn_reason TEXT,
  proposed_at TEXT,
  proposed_reason TEXT,
  PRIMARY KEY (claim_id, source_id)
);

-- 2.98b backstop: evidence is never hard-deleted — the rules layer refuses
-- first with plain language; the database refuses again without it. (The
-- parking lot is the stated exception and lives in its own table.)
CREATE TRIGGER IF NOT EXISTS trg_sources_no_delete
BEFORE DELETE ON sources
BEGIN
  SELECT RAISE(ABORT, 'record entities are never hard-deleted — withdraw with a reason');
END;

CREATE TRIGGER IF NOT EXISTS trg_attach_no_delete
BEFORE DELETE ON claim_sources
BEGIN
  SELECT RAISE(ABORT, 'record entities are never hard-deleted — withdraw with a reason');
END;

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN
    ('bad_source','contradicting_evidence','equivocation','mis_tiered','layer_mismatch','kind_mismatch')),
  description TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL CHECK (outcome IN ('upheld','rejected')),
  resulting_tier_change TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Stage 2.9: a challenge may target a kernel link or a single support-link
  -- hop instead of the claim's own standing. Same machinery, same types,
  -- same outcomes — the challenge just names what it contests.
  kernel_link_id INTEGER REFERENCES claim_kernels(id) ON DELETE SET NULL,
  hop_supporter_id INTEGER,
  hop_supported_id INTEGER
);

-- Stage 2.9: the kernel link. An outer claim pointing at its nearest
-- established kernel — annotation, not support. It carries zero evidentiary
-- weight (the rules layer never reads this table when placing), and the gap
-- statement is the payload: creation without one is refused by the rules AND
-- by these CHECKs — two independent layers say no.
CREATE TABLE IF NOT EXISTS claim_kernels (
  id INTEGER PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  kernel_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  gap_establishes TEXT NOT NULL CHECK (length(trim(gap_establishes)) > 0),
  gap_asserts_beyond TEXT NOT NULL CHECK (length(trim(gap_asserts_beyond)) > 0),
  gap_path_inward TEXT NOT NULL CHECK (length(trim(gap_path_inward)) > 0),
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','debunker')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (claim_id, kernel_id),
  CHECK (claim_id <> kernel_id)
);

-- Stage 2.9 (audit F): the event log. Every state-changing operation records
-- actor, timestamp, and reason here. Append-only at the schema layer —
-- 2.95's replay is only as honest as this log, so the log cannot be edited.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT 'local',
  action TEXT NOT NULL CHECK (length(trim(action)) > 0),
  claim_id INTEGER,
  topic_id INTEGER,
  detail TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_events_no_update
BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'the event log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_events_no_delete
BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'the event log is append-only');
END;

-- Stage 2.98's feedback quarantine table was REMOVED in 2.99a (Amendment
-- B): an ephemeral demo database cannot honestly keep an accept-then-lose
-- inbox promise. Feedback rides the anonymous drop box on the site origin
-- (the durable primary path, shipped with 2.99b), with the monitored
-- address as fallback. The operator's live DB keeps
-- its existing table and rows — this schema simply no longer creates one.
--
-- Still reserved here (a Stage 2.98 operator decision): the 'review' value
-- of events.action. Append-only like every event, same actor/timestamp/
-- reason shape; NO path writes one yet — contest-the-key (planned, not yet
-- built) and multiplayer review (Stage 3) plug into that socket.

-- Stage 2.9d: the global search index (FTS5, trigger-maintained). DERIVED
-- data only — it adds no authored fields and can be rebuilt from the record
-- at any time. Indexed: claim text, placement reasons, source citations
-- (per attachment, so every hit carries a claim's tier context), kernel-link
-- gap statements, challenge text. PARKED NOTES ARE NEVER INDEXED — private
-- scratch with no epistemic standing stays out of the record's search, by
-- construction (no trigger touches parked_notes; pinned by test).
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  content,
  field UNINDEXED,
  claim_id UNINDEXED,
  topic_id UNINDEXED,
  ref_id UNINDEXED
);

CREATE TRIGGER IF NOT EXISTS trg_si_claim_insert AFTER INSERT ON claims
BEGIN
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    VALUES (NEW.text, 'claim_text', NEW.id, NEW.topic_id, NULL);
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    VALUES (NEW.placement_reason, 'placement_reason', NEW.id, NEW.topic_id, NULL);
END;

CREATE TRIGGER IF NOT EXISTS trg_si_claim_reason_update
AFTER UPDATE OF placement_reason ON claims
BEGIN
  DELETE FROM search_index WHERE field = 'placement_reason' AND claim_id = NEW.id;
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    VALUES (NEW.placement_reason, 'placement_reason', NEW.id, NEW.topic_id, NULL);
END;

CREATE TRIGGER IF NOT EXISTS trg_si_claim_delete AFTER DELETE ON claims
BEGIN
  DELETE FROM search_index WHERE claim_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_challenge_insert AFTER INSERT ON challenges
BEGIN
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    SELECT NEW.description, 'challenge', NEW.claim_id, c.topic_id, NEW.id
    FROM claims c
    WHERE c.id = NEW.claim_id AND length(trim(NEW.description)) > 0;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_kernel_insert AFTER INSERT ON claim_kernels
BEGIN
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    SELECT NEW.gap_establishes || ' — ' || NEW.gap_asserts_beyond || ' — ' || NEW.gap_path_inward,
           'gap_statement', NEW.claim_id, c.topic_id, NEW.id
    FROM claims c WHERE c.id = NEW.claim_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_kernel_delete AFTER DELETE ON claim_kernels
BEGIN
  DELETE FROM search_index WHERE field = 'gap_statement' AND ref_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_attach_insert AFTER INSERT ON claim_sources
BEGIN
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    SELECT s.citation, 'source', NEW.claim_id, c.topic_id, NEW.source_id
    FROM sources s JOIN claims c ON c.id = NEW.claim_id
    WHERE s.id = NEW.source_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_attach_delete AFTER DELETE ON claim_sources
BEGIN
  DELETE FROM search_index WHERE field = 'source' AND claim_id = OLD.claim_id AND ref_id = OLD.source_id;
END;

-- Belt for cascade order: a library-source delete clears every source row.
CREATE TRIGGER IF NOT EXISTS trg_si_source_delete AFTER DELETE ON sources
BEGIN
  DELETE FROM search_index WHERE field = 'source' AND ref_id = OLD.id;
END;

-- 2.98b: withdrawal maintains the index the way deletion used to — a
-- withdrawn source leaves search (search has no diminished state); a
-- revived attachment re-enters it.
CREATE TRIGGER IF NOT EXISTS trg_si_attach_withdraw
AFTER UPDATE OF withdrawn_at ON claim_sources WHEN NEW.withdrawn_at IS NOT NULL
BEGIN
  DELETE FROM search_index WHERE field = 'source' AND claim_id = NEW.claim_id AND ref_id = NEW.source_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_attach_revive
AFTER UPDATE OF withdrawn_at ON claim_sources WHEN NEW.withdrawn_at IS NULL
BEGIN
  INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
    SELECT s.citation, 'source', NEW.claim_id, c.topic_id, NEW.source_id
    FROM sources s JOIN claims c ON c.id = NEW.claim_id
    WHERE s.id = NEW.source_id AND s.withdrawn_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_si_source_withdraw
AFTER UPDATE OF withdrawn_at ON sources WHEN NEW.withdrawn_at IS NOT NULL
BEGIN
  DELETE FROM search_index WHERE field = 'source' AND ref_id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS claim_supports (
  supporter_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  supported_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  PRIMARY KEY (supporter_id, supported_id),
  CHECK (supporter_id <> supported_id)
);

-- Stage 2.5: the parking lot. Notes, not claims — no tier, no kind, no
-- layer, no placement reason, no presence in any onion view. The author
-- and private columns exist now so Stage Three multiplayer doesn't have
-- to retrofit ownership.
CREATE TABLE IF NOT EXISTS parked_notes (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  text TEXT NOT NULL CHECK (length(trim(text)) > 0),
  author TEXT NOT NULL DEFAULT 'local',
  private INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outer cannot feed inner, enforced by the database itself.
CREATE TRIGGER IF NOT EXISTS trg_supports_tier_on_insert
BEFORE INSERT ON claim_supports
BEGIN
  SELECT CASE WHEN
    (SELECT ${RANK('radial_tier')} FROM claims WHERE id = NEW.supporter_id)
    >
    (SELECT ${RANK('radial_tier')} FROM claims WHERE id = NEW.supported_id)
  THEN RAISE(ABORT, 'outer cannot feed inner') END;
END;

-- Backstop on tier changes: a claim may not move inward past its supporters,
-- and may not be demoted while it still props up stronger claims (the service
-- layer severs those links first, inside the same transaction).
CREATE TRIGGER IF NOT EXISTS trg_supports_tier_on_update
BEFORE UPDATE OF radial_tier ON claims
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_supports cs JOIN claims s ON s.id = cs.supporter_id
    WHERE cs.supported_id = NEW.id
      AND ${RANK('s.radial_tier')} > ${RANK('NEW.radial_tier')}
  ) THEN RAISE(ABORT, 'outer cannot feed inner') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_supports cs JOIN claims s ON s.id = cs.supported_id
    WHERE cs.supporter_id = NEW.id
      AND ${RANK('NEW.radial_tier')} > ${RANK('s.radial_tier')}
  ) THEN RAISE(ABORT, 'outer cannot feed inner') END;
END;

-- Stage 2.9 kernel-link backstops. The rules layer refuses these first with
-- plain language; the database refuses them again without it.
--
-- Direction: a kernel must sit STRICTLY inward of the claim that overreaches
-- from it. Metaphysical claims (tier NULL, rank 99) can be neither end.
CREATE TRIGGER IF NOT EXISTS trg_kernel_direction_on_insert
BEFORE INSERT ON claim_kernels
BEGIN
  SELECT CASE WHEN
    (SELECT ${RANK('radial_tier')} FROM claims WHERE id = NEW.kernel_id) >=
    (SELECT ${RANK('radial_tier')} FROM claims WHERE id = NEW.claim_id)
    OR (SELECT radial_tier FROM claims WHERE id = NEW.claim_id) IS NULL
  THEN RAISE(ABORT, 'a kernel must sit strictly inward of the claim that overreaches from it') END;
END;

-- Whole-vs-broken at the data layer: a kernel link says evidence STOPS
-- between these two claims; a support link says it connects them. The same
-- pair can never hold both, in either direction.
CREATE TRIGGER IF NOT EXISTS trg_kernel_never_support
BEFORE INSERT ON claim_kernels
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_supports
    WHERE (supporter_id = NEW.kernel_id AND supported_id = NEW.claim_id)
       OR (supporter_id = NEW.claim_id AND supported_id = NEW.kernel_id)
  ) THEN RAISE(ABORT, 'a kernel link marks where evidence stops; a support link between the same claims contradicts it') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_support_never_kernel
BEFORE INSERT ON claim_supports
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_kernels
    WHERE (kernel_id = NEW.supporter_id AND claim_id = NEW.supported_id)
       OR (kernel_id = NEW.supported_id AND claim_id = NEW.supporter_id)
  ) THEN RAISE(ABORT, 'a kernel link marks where evidence stops; a support link between the same claims contradicts it') END;
END;

-- Tier moves may not silently invalidate kernel direction; the service layer
-- severs the affected kernel links first (recorded), inside the same
-- transaction, exactly like severed supports.
CREATE TRIGGER IF NOT EXISTS trg_kernel_tier_on_update
BEFORE UPDATE OF radial_tier ON claims
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_kernels ck JOIN claims k ON k.id = ck.kernel_id
    WHERE ck.claim_id = NEW.id AND ${RANK('k.radial_tier')} >= ${RANK('NEW.radial_tier')}
  ) THEN RAISE(ABORT, 'a kernel must sit strictly inward of the claim that overreaches from it') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM claim_kernels ck JOIN claims o ON o.id = ck.claim_id
    WHERE ck.kernel_id = NEW.id AND ${RANK('NEW.radial_tier')} >= ${RANK('o.radial_tier')}
  ) THEN RAISE(ABORT, 'a kernel must sit strictly inward of the claim that overreaches from it') END;
END;
`;

// Migrate a pre-Stage-2.5 database in place: per-claim source rows become
// library entities + attachments. Textually identical citations within a
// topic merge into one entity (logged).
function migrateV0toV1(db) {
  const legacy = db
    .prepare(
      `SELECT 1 FROM pragma_table_info('sources') WHERE name = 'claim_id' LIMIT 1`
    )
    .get();
  if (!legacy) {
    db.exec('PRAGMA user_version = 1');
    return;
  }
  console.log('Migrating database to the source-library model (v1)…');
  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE sources RENAME TO sources_legacy');
    db.exec(`
      CREATE TABLE sources (
        id INTEGER PRIMARY KEY,
        topic_id INTEGER NOT NULL REFERENCES topics(id),
        tier TEXT NOT NULL CHECK (tier IN
          ('primary_doc','court_record','reputable_secondary','single_outlet','self_published','anonymous')),
        citation TEXT NOT NULL CHECK (length(trim(citation)) > 0),
        url TEXT NOT NULL DEFAULT '',
        is_claimant_self_published INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE claim_sources (
        claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        relation TEXT NOT NULL CHECK (relation IN ('supports','contradicts','is_origin_of')),
        PRIMARY KEY (claim_id, source_id)
      );
    `);
    const rows = db
      .prepare(
        `SELECT s.*, c.topic_id FROM sources_legacy s JOIN claims c ON c.id = s.claim_id ORDER BY s.id`
      )
      .all();
    const find = db.prepare(
      'SELECT id FROM sources WHERE topic_id = ? AND citation = ? LIMIT 1'
    );
    const insSrc = db.prepare(
      'INSERT INTO sources (topic_id, tier, citation, url, is_claimant_self_published) VALUES (?,?,?,?,?)'
    );
    const insAtt = db.prepare(
      'INSERT OR IGNORE INTO claim_sources (claim_id, source_id, relation) VALUES (?,?,?)'
    );
    let merged = 0;
    for (const r of rows) {
      const existing = find.get(r.topic_id, r.citation);
      let sourceId;
      if (existing) {
        sourceId = existing.id;
        merged++;
        console.log(`  merged duplicate citation in topic ${r.topic_id}: "${r.citation.slice(0, 60)}…"`);
      } else {
        sourceId = insSrc.run(
          r.topic_id,
          r.tier,
          r.citation,
          r.url,
          r.is_claimant_self_published
        ).lastInsertRowid;
      }
      insAtt.run(r.claim_id, sourceId, r.relation);
    }
    db.exec('DROP TABLE sources_legacy');
    db.exec('PRAGMA user_version = 1');
    db.exec('COMMIT');
    console.log(`Migration complete: ${rows.length} attachments, ${merged} citations merged.`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Stage 2.9 (v2): challenges gain optional link targets — a challenge may
// contest a kernel link or a support-link hop, not only a claim's standing.
// Existing rows are untouched; the columns are nullable.
// 2.98b (v4): recorded withdrawal replaces deletion — sources and
// attachments gain withdrawn_at/withdrawn_reason. Existing rows untouched
// (all active); the no-delete triggers arrive with the SCHEMA exec.
function migrateV3toV4(db) {
  const hasCol = db
    .prepare(`SELECT 1 FROM pragma_table_info('sources') WHERE name = 'withdrawn_at' LIMIT 1`)
    .get();
  if (!hasCol) {
    db.exec(`
      ALTER TABLE sources ADD COLUMN withdrawn_at TEXT;
      ALTER TABLE sources ADD COLUMN withdrawn_reason TEXT;
      ALTER TABLE claim_sources ADD COLUMN withdrawn_at TEXT;
      ALTER TABLE claim_sources ADD COLUMN withdrawn_reason TEXT;
    `);
  }
  db.exec('PRAGMA user_version = 4');
}

// 2.98b Amendment A (v5): two-phase withdrawal — proposal columns. Filed
// state only; no rule reads them (the rules read withdrawn_* alone).
function migrateV4toV5(db) {
  const hasCol = db
    .prepare(`SELECT 1 FROM pragma_table_info('sources') WHERE name = 'proposed_at' LIMIT 1`)
    .get();
  if (!hasCol) {
    db.exec(`
      ALTER TABLE sources ADD COLUMN proposed_at TEXT;
      ALTER TABLE sources ADD COLUMN proposed_reason TEXT;
      ALTER TABLE claim_sources ADD COLUMN proposed_at TEXT;
      ALTER TABLE claim_sources ADD COLUMN proposed_reason TEXT;
    `);
  }
  db.exec('PRAGMA user_version = 5');
}

function migrateV1toV2(db) {
  const hasCol = db
    .prepare(`SELECT 1 FROM pragma_table_info('challenges') WHERE name = 'kernel_link_id' LIMIT 1`)
    .get();
  if (!hasCol) {
    db.exec(`
      ALTER TABLE challenges ADD COLUMN kernel_link_id INTEGER REFERENCES claim_kernels(id) ON DELETE SET NULL;
      ALTER TABLE challenges ADD COLUMN hop_supporter_id INTEGER;
      ALTER TABLE challenges ADD COLUMN hop_supported_id INTEGER;
    `);
  }
  db.exec('PRAGMA user_version = 2');
}

// 2.99b (v6): kind adjudication + the recast relation. Claims gain the
// pending-proposal columns and recast_of (plain adds, nullable, no rule
// reads the pending state); challenges' type CHECK gains 'kind_mismatch',
// which SQLite cannot ALTER — the table is rebuilt in place, rows copied
// verbatim (ids preserved; the renamed table carries its triggers away and
// the SCHEMA exec recreates them on the new one, so nothing double-fires
// into the search index).
function migrateV5toV6(db) {
  const hasCol = db
    .prepare(`SELECT 1 FROM pragma_table_info('claims') WHERE name = 'kind_proposed_at' LIMIT 1`)
    .get();
  if (!hasCol) {
    db.exec('BEGIN');
    try {
      db.exec(`
        ALTER TABLE claims ADD COLUMN kind_proposed_at TEXT;
        ALTER TABLE claims ADD COLUMN kind_proposed_to TEXT;
        ALTER TABLE claims ADD COLUMN kind_proposed_reason TEXT;
        ALTER TABLE claims ADD COLUMN recast_of INTEGER REFERENCES claims(id);
        ALTER TABLE challenges RENAME TO challenges_legacy_v5;
        CREATE TABLE challenges (
          id INTEGER PRIMARY KEY,
          claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN
            ('bad_source','contradicting_evidence','equivocation','mis_tiered','layer_mismatch','kind_mismatch')),
          description TEXT NOT NULL DEFAULT '',
          outcome TEXT NOT NULL CHECK (outcome IN ('upheld','rejected')),
          resulting_tier_change TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          kernel_link_id INTEGER REFERENCES claim_kernels(id) ON DELETE SET NULL,
          hop_supporter_id INTEGER,
          hop_supported_id INTEGER
        );
        INSERT INTO challenges (id, claim_id, type, description, outcome, resulting_tier_change,
                                created_at, kernel_link_id, hop_supporter_id, hop_supported_id)
          SELECT id, claim_id, type, description, outcome, resulting_tier_change,
                 created_at, kernel_link_id, hop_supporter_id, hop_supported_id
          FROM challenges_legacy_v5;
        DROP TABLE challenges_legacy_v5;
      `);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  db.exec('PRAGMA user_version = 6');
}

export function openDb(path = process.env.ONION_DB || DEFAULT_DB_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  const { user_version } = db.prepare('PRAGMA user_version').get();
  const hasTables = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='claims'`)
    .get();
  if (hasTables && user_version < 1) migrateV0toV1(db);
  // v4/v5 column adds must precede the SCHEMA exec: the withdrawal triggers
  // in SCHEMA reference withdrawn_at and cannot be created without the
  // column.
  if (hasTables && user_version < 4) migrateV3toV4(db);
  if (hasTables && user_version < 5) migrateV4toV5(db);
  if (hasTables && user_version < 6) migrateV5toV6(db);
  db.exec(SCHEMA);
  if (user_version < 1) db.exec('PRAGMA user_version = 1');
  if (hasTables && user_version < 2) migrateV1toV2(db);
  // v3 (2.9d): backfill the search index for a database that predates it.
  // The index is derived data — rebuilding from the record is always legal.
  const indexed = db.prepare('SELECT COUNT(*) AS n FROM search_index').get().n;
  const hasClaims = db.prepare('SELECT COUNT(*) AS n FROM claims').get().n;
  if (indexed === 0 && hasClaims > 0) {
    db.exec(`
      INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
        SELECT text, 'claim_text', id, topic_id, NULL FROM claims;
      INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
        SELECT placement_reason, 'placement_reason', id, topic_id, NULL FROM claims;
      INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
        SELECT ch.description, 'challenge', ch.claim_id, c.topic_id, ch.id
        FROM challenges ch JOIN claims c ON c.id = ch.claim_id
        WHERE length(trim(ch.description)) > 0;
      INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
        SELECT ck.gap_establishes || ' — ' || ck.gap_asserts_beyond || ' — ' || ck.gap_path_inward,
               'gap_statement', ck.claim_id, c.topic_id, ck.id
        FROM claim_kernels ck JOIN claims c ON c.id = ck.claim_id;
      INSERT INTO search_index (content, field, claim_id, topic_id, ref_id)
        SELECT s.citation, 'source', cs.claim_id, c.topic_id, cs.source_id
        FROM claim_sources cs JOIN sources s ON s.id = cs.source_id JOIN claims c ON c.id = cs.claim_id;
    `);
  }
  if (db.prepare('PRAGMA user_version').get().user_version < 6) {
    db.exec('PRAGMA user_version = 6');
  }
  return db;
}

export function getClaim(db, id) {
  const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
  if (!claim) return null;
  return hydrate(db, claim);
}

export function getTopicClaims(db, topicId) {
  return db
    .prepare('SELECT * FROM claims WHERE topic_id = ? ORDER BY id')
    .all(topicId)
    .map((c) => hydrate(db, c));
}

export function getTopicSources(db, topicId) {
  // Withdrawn library entries stay in the listing — diminished, never
  // vanished (2.98b). Callers render the state; nothing hides the row.
  return db
    .prepare('SELECT * FROM sources WHERE topic_id = ? ORDER BY id')
    .all(topicId)
    .map((s) => ({
      ...s,
      is_claimant_self_published: !!s.is_claimant_self_published,
      // Release 2b: a derived fact of the 2.98b audit, never a stored field.
      verification: curatorVerified(s.citation) ? 'curator' : null,
      withdrawn: s.withdrawn_at != null,
      // Amendment A: filed-but-unadjudicated withdrawal — visible state,
      // zero rule effect.
      withdrawal_proposed: s.proposed_at != null ? { at: s.proposed_at, reason: s.proposed_reason } : null
    }));
}

function hydrate(db, claim) {
  // Active evidence only — the rules layer weighs claim.sources, and a
  // withdrawn source (attachment- or library-level) carries no weight.
  // Amendment A: a PROPOSED withdrawal is carried as annotation on the
  // still-active source — the filter reads withdrawn_* alone, so floors
  // are structurally blind to proposals until adjudication.
  const sources = db
    .prepare(
      `SELECT s.id, s.tier, s.citation, s.url, s.is_claimant_self_published, cs.relation,
              cs.proposed_at, cs.proposed_reason,
              s.proposed_at AS lib_proposed_at, s.proposed_reason AS lib_proposed_reason
       FROM claim_sources cs JOIN sources s ON s.id = cs.source_id
       WHERE cs.claim_id = ? AND cs.withdrawn_at IS NULL AND s.withdrawn_at IS NULL
       ORDER BY s.id`
    )
    .all(claim.id)
    .map((s) => {
      const { proposed_at, proposed_reason, lib_proposed_at, lib_proposed_reason, ...rest } = s;
      const proposal =
        proposed_at != null
          ? { at: proposed_at, reason: proposed_reason, scope: 'claim' }
          : lib_proposed_at != null
            ? { at: lib_proposed_at, reason: lib_proposed_reason, scope: 'library' }
            : null;
      return {
        ...rest,
        is_claimant_self_published: !!rest.is_claimant_self_published,
        // Release 2b: a derived fact of the 2.98b audit, never a stored field.
        verification: curatorVerified(rest.citation) ? 'curator' : null,
        ...(proposal ? { withdrawal_proposed: proposal } : {})
      };
    });
  // 2.99a punch 5 (2.98b DoD-8 enforcement): REJECTED withdrawal attempts
  // are permanent record — the display must never forget what the record
  // remembers. Derived per source from the event log: the rejection event
  // carries the adjudicator; the latest prior proposal event for the same
  // target carries the proposer.
  const rejectionEvents = db
    .prepare(
      `SELECT id, actor, detail, reason, created_at FROM events
       WHERE action = 'withdrawal_rejected' AND (claim_id = ? OR claim_id IS NULL)
       ORDER BY id`
    )
    .all(claim.id);
  const proposerBefore = db.prepare(
    `SELECT actor FROM events
     WHERE action = 'withdrawal_proposed' AND id < ?
       AND ((claim_id = ? AND detail LIKE ?) OR (claim_id IS NULL AND detail LIKE ?))
     ORDER BY id DESC LIMIT 1`
  );
  const rejectedBySource = new Map();
  for (const e of rejectionEvents) {
    const m = /^(library )?source #(\d+)/.exec(e.detail || '');
    if (!m) continue;
    const sourceId = Number(m[2]);
    const scope = m[1] ? 'library' : 'claim';
    if (scope === 'library') {
      // Library-scope rejections attach to every claim holding the source;
      // claim-scope ones carry this claim's id already (filtered above).
      const held = db
        .prepare('SELECT 1 FROM claim_sources WHERE claim_id = ? AND source_id = ?')
        .get(claim.id, sourceId);
      if (!held) continue;
    }
    const proposer = proposerBefore.get(e.id, claim.id, `source #${sourceId} %`, `library source #${sourceId} %`)?.actor ?? null;
    const list = rejectedBySource.get(sourceId) ?? [];
    list.push({ at: e.created_at, scope, adjudicator: e.actor, proposer, reason: e.reason });
    rejectedBySource.set(sourceId, list);
  }
  for (const s of sources) {
    const r = rejectedBySource.get(s.id);
    if (r) s.rejected_withdrawals = r;
  }

  // 2.98b: what left, why, and when — diminished but visible, so someone
  // can still stand up for withdrawn evidence they can see.
  const withdrawn_sources = db
    .prepare(
      `SELECT s.id, s.tier, s.citation, s.url, s.is_claimant_self_published, cs.relation,
              COALESCE(cs.withdrawn_at, s.withdrawn_at) AS withdrawn_at,
              COALESCE(cs.withdrawn_reason, s.withdrawn_reason) AS withdrawn_reason,
              CASE WHEN cs.withdrawn_at IS NOT NULL THEN 'claim' ELSE 'library' END AS withdrawn_scope
       FROM claim_sources cs JOIN sources s ON s.id = cs.source_id
       WHERE cs.claim_id = ? AND (cs.withdrawn_at IS NOT NULL OR s.withdrawn_at IS NOT NULL)
       ORDER BY s.id`
    )
    .all(claim.id)
    .map((s) => ({ ...s, is_claimant_self_published: !!s.is_claimant_self_published }));
  const challenges = db
    .prepare('SELECT * FROM challenges WHERE claim_id = ? ORDER BY id')
    .all(claim.id);
  const supports_claims = db
    .prepare('SELECT supported_id FROM claim_supports WHERE supporter_id = ?')
    .all(claim.id)
    .map((r) => r.supported_id);
  const supported_by = db
    .prepare('SELECT supporter_id FROM claim_supports WHERE supported_id = ?')
    .all(claim.id)
    .map((r) => r.supporter_id);
  // Stage 2.9: kernel links, both directions. On the outer claim the link is
  // "nearest established ground"; on the kernel it is a warning — the claims
  // overreaching from it. A link is "contested" when a recorded challenge
  // names it and the link still stands (upheld link challenges remove it).
  const contestedFor = db.prepare(
    'SELECT COUNT(*) AS n FROM challenges WHERE kernel_link_id = ?'
  );
  const kernel_links = db
    .prepare(
      `SELECT ck.id, ck.kernel_id, ck.gap_establishes, ck.gap_asserts_beyond,
              ck.gap_path_inward, ck.origin, ck.created_at,
              k.text AS kernel_text, k.radial_tier AS kernel_tier
       FROM claim_kernels ck JOIN claims k ON k.id = ck.kernel_id
       WHERE ck.claim_id = ? ORDER BY ck.id`
    )
    .all(claim.id)
    .map((l) => ({ ...l, contested: contestedFor.get(l.id).n > 0 }));
  const overreached_by = db
    .prepare(
      `SELECT ck.id, ck.claim_id, ck.gap_establishes, ck.gap_asserts_beyond,
              ck.gap_path_inward, ck.origin, ck.created_at,
              o.text AS claim_text, o.radial_tier AS claim_tier
       FROM claim_kernels ck JOIN claims o ON o.id = ck.claim_id
       WHERE ck.kernel_id = ? ORDER BY ck.id`
    )
    .all(claim.id)
    .map((l) => ({ ...l, contested: contestedFor.get(l.id).n > 0 }));
  // 2.99b: kind adjudication + recast provenance, both display-only facts
  // of the record. The pending proposal has ZERO rule effect (the rules
  // read `kind` alone); the recast relation carries zero weight in both
  // directions and is rendered on both ends.
  const kind_proposal =
    claim.kind_proposed_at != null
      ? { at: claim.kind_proposed_at, to: claim.kind_proposed_to, reason: claim.kind_proposed_reason }
      : null;
  const recastOriginal = claim.recast_of
    ? db.prepare('SELECT id, text, kind FROM claims WHERE id = ?').get(claim.recast_of)
    : null;
  const recasts =
    claim.kind === 'metaphysical'
      ? db
          .prepare('SELECT id, text, radial_tier, status FROM claims WHERE recast_of = ? ORDER BY id')
          .all(claim.id)
      : [];

  return {
    ...claim,
    vertical: {
      direction: claim.vertical_direction,
      magnitude: claim.vertical_magnitude,
      evidenced: !!claim.vertical_evidenced
    },
    ...(kind_proposal ? { kind_proposal } : {}),
    ...(recastOriginal ? { recast_of_claim: recastOriginal } : {}),
    ...(recasts.length ? { recasts } : {}),
    sources,
    withdrawn_sources,
    challenges,
    supports_claims,
    supported_by,
    kernel_links,
    overreached_by
  };
}
