import express from 'express';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, getClaim, getTopicClaims, getTopicSources } from './db.js';
import { seed, isSeeded } from './seed.js';
import {
  createTopic,
  createClaim,
  promoteClaim,
  demoteClaim,
  challengeClaim,
  addSource,
  proposeWithdrawal,
  adjudicateWithdrawal,
  proposeLibraryWithdrawal,
  adjudicateLibraryWithdrawal,
  addSupport,
  addKernelLink,
  getLineages,
  listEvents,
  searchRecord,
  setVertical,
  getTierPreview,
  createParkedNote,
  listParkedNotes,
  deleteParkedNote,
  exportTopic,
  importTopic
} from './service.js';
import { RuleError, TIERS, PERSONAS } from './rules.js';
import {
  makeSave,
  SaveFormatError,
  SANDBOX_ENTRY_NOTE,
  SANDBOX_FULL_MESSAGE,
  SANDBOX_GONE_MESSAGE,
  SANDBOX_SIZE_MESSAGE
} from './sandbox.js';
import {
  topicTimeline,
  topicAtTime,
  claimAtTime,
  claimHistory,
  topicStats,
  logEpoch
} from './timemachine.js';
import { renderClaimPage, reviewStatus } from './claimpages.js';

const DEMO_MESSAGE = () =>
  'This shared record is read-only — your first write creates a private copy where the rules answer to you' +
  (process.env.DEMO_REPO_URL ? `; clone the repo to run the full engine: ${process.env.DEMO_REPO_URL}` : '.');

// 2.99a Amendment B: the in-product feedback modal and its quarantine
// endpoint are REMOVED — an ephemeral app DB cannot honestly keep an
// accept-then-lose inbox promise. Feedback is a mailto until the durable
// pipe ships with 2.99b.

// `sandbox: true` builds the app that serves ONE visitor's private copy:
// writes allowed (that is the point), fetch proxy still absent (demo
// posture unchanged), no static serving, no page routes reachable from
// outside (the parent forwards /sandbox/:sid/api only). Same buildApp,
// same routes, same rules — not a fork.
export function buildApp(db, { demo = false, rateLimit = 0, sandbox = false, sandboxManager = null } = {}) {
  const app = express();
  app.use(express.json());

  // Inside a sandbox copy, the acting persona rides a header and is clamped
  // to the known set — the event log records personas, never freeform
  // names. The gates themselves live in the rules layer.
  if (sandbox) {
    app.use('/api', (req, res, next) => {
      if (req.method !== 'GET' && req.body && typeof req.body === 'object') {
        const p = String(req.headers['x-onion-actor'] || 'curator');
        req.body.actor = PERSONAS.includes(p) ? p : 'curator';
      }
      next();
    });
  }

  // 2.99a Amendment C: copy-on-first-write. Creating a copy is not a record
  // mutation, so this registers BEFORE the read-only gate. Reads never
  // create a session; the cap gates writes only, with the honest refusal.
  if (demo && sandboxManager) {
    app.post('/api/sandbox/copy', (req, res) => {
      let made;
      try {
        made = sandboxManager.create({ save: req.body && req.body.save ? req.body.save : undefined });
      } catch (e) {
        if (e instanceof SaveFormatError) {
          return res.status(422).json({ error: `Save not imported: ${e.message}`, rule: 'save_format' });
        }
        return res.status(422).json({ error: `Save not imported — the record inside it failed the restore: ${e.message}`, rule: 'save_format' });
      }
      if (made.full) {
        return res.status(503).json({ error: SANDBOX_FULL_MESSAGE, rule: 'sandbox_full' });
      }
      res.status(201).json({
        session_id: made.session.id,
        expires_at: new Date(made.session.expiresAt).toISOString(),
        ttl_minutes: Math.round(sandboxManager.limits.ttlMs / 60_000),
        entry_note: SANDBOX_ENTRY_NOTE
      });
    });

    // The save file — the only persistence a copy has.
    app.get('/sandbox/:sid/save', (req, res) => {
      const s = sandboxManager.get(req.params.sid);
      if (!s) return res.status(410).json({ error: SANDBOX_GONE_MESSAGE, rule: 'sandbox_gone' });
      sandboxManager.touch(s.id);
      res.json(makeSave(s.db));
    });

    // Delegate the copy's API to the copy's own app — built by the SAME
    // buildApp, so the same routes and the same rules layer answer.
    app.use('/sandbox/:sid/api', (req, res, next) => {
      const s = sandboxManager.get(req.params.sid);
      if (!s) return res.status(410).json({ error: SANDBOX_GONE_MESSAGE, rule: 'sandbox_gone' });
      sandboxManager.touch(s.id);
      if (req.method !== 'GET' && sandboxManager.sizeOf(s) > sandboxManager.limits.sizeCapBytes) {
        return res.status(413).json({ error: SANDBOX_SIZE_MESSAGE, rule: 'sandbox_size_cap' });
      }
      req.url = '/api' + req.url;
      s.app(req, res, next);
    });
  }

  // Demo mode: the shared record is read-only. Every mutation is refused at
  // the middleware layer — hiding buttons is presentation; this is
  // enforcement. (Sandbox copies are separate apps and never pass here.)
  if (demo) {
    app.use('/api', (req, res, next) => {
      if (req.method !== 'GET') {
        return res.status(403).json({ error: DEMO_MESSAGE(), rule: 'demo_read_only' });
      }
      next();
    });
  }

  // Basic per-IP rate limiting for public hosting (demo deployments).
  // 2.98: claim-page routes inherit the same limiter — every demo
  // protection applies to pages.
  if (rateLimit > 0) {
    const hits = new Map();
    const limiter = (req, res, next) => {
      const now = Date.now();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      let h = hits.get(ip);
      if (!h || now - h.start > 60_000) {
        h = { start: now, count: 0 };
        hits.set(ip, h);
      }
      if (++h.count > rateLimit) {
        return res.status(429).json({ error: 'Rate limit exceeded — try again in a minute.' });
      }
      if (hits.size > 10_000) hits.clear(); // crude memory guard
      next();
    };
    app.use('/api', limiter);
    app.use('/claim', limiter);
    app.use('/sandbox', limiter);
  }

  app.get('/api/meta', (req, res) => {
    res.json({ demo_mode: demo });
  });

  // § fetch proxy — public-page retrieval for the companion's fetch_url /
  // verify_source tools. No key, SSRF-guarded (see fetch-proxy.js); every
  // fetch is logged server-side (the §4 "every fetched URL logged").
  //
  // LOCAL ENGINE ONLY. It was originally made GET-only so it would survive the
  // demo's read-only middleware — that reasoning was backwards. The proxy
  // serves the operator's own companion; a public showcase gains nothing from
  // it and would be handing anonymous callers an open fetcher that can spawn a
  // headless browser per request (an abuse relay and a trivial resource sink).
  // The modules are imported lazily so the demo package need not ship them at
  // all — it copies a fixed server file list, and a hard import of a file it
  // does not carry is a boot crash.
  if (!demo && !sandbox) {
    app.get('/api/fetch', (req, res, next) => {
      const url = String(req.query.url || '');
      const quote = req.query.quote != null ? String(req.query.quote) : undefined;
      if (!url) return res.status(400).json({ error: 'url query param required' });
      console.log(`[fetch-proxy] ${url}${quote ? ' (verify)' : ''}`);
      Promise.all([import('./fetch-proxy.js'), import('./browser-render.js')])
        .then(([{ fetchPage }, { renderPage }]) => fetchPage(url, { quote, renderImpl: renderPage }))
        .then((result) => {
          if (result.via === 'browser') console.log(`[fetch-proxy]   → rendered in headless browser`);
          res.json(result);
        })
        .catch(next);
    });
  }

  const wrap = (fn) => (req, res, next) => {
    try {
      fn(req, res);
    } catch (e) {
      next(e);
    }
  };

  app.get('/api/topics', wrap((req, res) => {
    const topics = db.prepare('SELECT * FROM topics ORDER BY id').all();
    res.json(topics);
  }));

  app.post('/api/topics', wrap((req, res) => {
    res.status(201).json(createTopic(db, req.body));
  }));

  // The onion view. Parked notes are deliberately NOT here — they are not
  // claims and appear in no view of the onion (they have their own endpoint).
  app.get('/api/topics/:id', wrap((req, res) => {
    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!topic) return res.status(404).json({ error: 'No such topic.' });
    res.json({
      ...topic,
      tiers: TIERS,
      claims: getTopicClaims(db, topic.id),
      sources: getTopicSources(db, topic.id)
    });
  }));

  app.get('/api/topics/:id/export', wrap((req, res) => {
    res.json(exportTopic(db, Number(req.params.id)));
  }));

  app.post('/api/topics/import', wrap((req, res) => {
    res.status(201).json(importTopic(db, req.body));
  }));

  app.get('/api/topics/:id/parking', wrap((req, res) => {
    res.json(listParkedNotes(db, Number(req.params.id)));
  }));

  app.post('/api/topics/:id/parking', wrap((req, res) => {
    res.status(201).json(createParkedNote(db, Number(req.params.id), req.body));
  }));

  app.delete('/api/parking/:id', wrap((req, res) => {
    res.json(deleteParkedNote(db, Number(req.params.id)));
  }));

  app.get('/api/claims/:id/tier-preview', wrap((req, res) => {
    res.json(getTierPreview(db, Number(req.params.id)));
  }));

  // 2.98b Amendment A: withdrawal is two-phase. Filing proposes (mandatory
  // reason, zero rule effect); adjudication upholds (effect + ripple fire
  // NOW) or rejects (the attempt stays permanently on the record).
  app.post('/api/sources/:id/withdraw', wrap((req, res) => {
    res.json(proposeLibraryWithdrawal(db, Number(req.params.id), req.body || {}));
  }));

  app.post('/api/sources/:id/withdraw/adjudicate', wrap((req, res) => {
    res.json(adjudicateLibraryWithdrawal(db, Number(req.params.id), req.body || {}));
  }));

  app.delete('/api/sources/:id', (req, res) => {
    res.status(405).json({
      error:
        'Record entities are never hard-deleted. Withdraw with a reason (POST /api/sources/:id/withdraw) — the record keeps what left and why.'
    });
  });

  app.get('/api/claims/:id', wrap((req, res) => {
    const claim = getClaim(db, req.params.id);
    if (!claim) return res.status(404).json({ error: 'No such claim.' });
    res.json(claim);
  }));

  app.post('/api/claims', wrap((req, res) => {
    res.status(201).json(createClaim(db, req.body));
  }));

  app.post('/api/claims/:id/promote', wrap((req, res) => {
    res.json(promoteClaim(db, Number(req.params.id), req.body.target_tier, { actor: req.body.actor }));
  }));

  app.post('/api/claims/:id/demote', wrap((req, res) => {
    res.json(demoteClaim(db, Number(req.params.id), req.body));
  }));

  app.post('/api/claims/:id/challenges', wrap((req, res) => {
    res.json(challengeClaim(db, Number(req.params.id), req.body));
  }));

  app.post('/api/claims/:id/sources', wrap((req, res) => {
    res.status(201).json(addSource(db, Number(req.params.id), req.body));
  }));

  // 2.98b Amendment A: file a withdrawal proposal against one claim's
  // attachment (no effect until adjudication), then adjudicate it.
  app.post('/api/claims/:id/sources/:sourceId/withdraw', wrap((req, res) => {
    res.json(proposeWithdrawal(db, Number(req.params.id), Number(req.params.sourceId), req.body || {}));
  }));

  app.post('/api/claims/:id/sources/:sourceId/withdraw/adjudicate', wrap((req, res) => {
    res.json(adjudicateWithdrawal(db, Number(req.params.id), Number(req.params.sourceId), req.body || {}));
  }));

  app.delete('/api/claims/:id/sources/:sourceId', (req, res) => {
    res.status(405).json({
      error:
        'Record entities are never hard-deleted. Withdraw with a reason (POST .../sources/:sourceId/withdraw) — the record keeps what left and why.'
    });
  });

  app.post('/api/claims/:id/supports', wrap((req, res) => {
    res.json(addSupport(db, Number(req.params.id), Number(req.body.supported_id), { actor: req.body.actor }));
  }));

  app.delete('/api/claims/:id/supports/:supportedId', (req, res) => {
    res.status(405).json({
      error:
        'Support links end only by recorded adjudication — raise a hop challenge on the link (POST /api/claims/:id/challenges with a hop target) or let the rules sever it on a tier move. There is no direct delete.'
    });
  });

  // Stage 2.9: kernel links. Manual creation through the rules layer like
  // every write; the debunker flow creates its own via /demote.
  app.post('/api/claims/:id/kernels', wrap((req, res) => {
    res.status(201).json(addKernelLink(db, Number(req.params.id), req.body));
  }));

  app.delete('/api/claims/:id/kernels/:linkId', (req, res) => {
    res.status(405).json({
      error:
        'Kernel links end only by recorded adjudication — raise a kernel-link challenge (POST /api/claims/:id/challenges with kernel_link_id) or let the rules sever it on a tier move. There is no direct delete.'
    });
  });

  // Routed lineages + fans — computed here so the routing rule lives with
  // the rules, not in the renderer.
  app.get('/api/claims/:id/lineage', wrap((req, res) => {
    res.json(getLineages(db, Number(req.params.id)));
  }));

  // Stage 2.98: claim pages — stable, server-rendered, read-only
  // permalinks generated entirely from the record. Cacheable; mutations
  // against page routes are refused flatly. ?at=<timestamp> renders the
  // page as it stood then — the on-page time machine, still server-side,
  // still script-free.
  app.get('/claim/:id', wrap((req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).send('No such claim.');
    try {
      const origin = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
      res.set('Cache-Control', 'public, max-age=60');
      res.type('html').send(renderClaimPage(db, id, { origin, at: req.query.at || null }));
    } catch (e) {
      if (e instanceof RuleError) {
        // An unreadable ?at is a bad request, not a missing claim.
        return /timestamp/i.test(e.message)
          ? res.status(400).send(e.message)
          : res.status(404).send('No such claim.');
      }
      throw e;
    }
  }));

  app.all('/claim/:id', (req, res) => {
    res.status(405).send('Claim pages are read-only — the record is written only through the rules layer.');
  });

  app.get('/api/claims/:id/review-status', wrap((req, res) => {
    res.json(reviewStatus(db, Number(req.params.id)));
  }));

  // Global record search (2.9d). Read-only; lexical ranking only; every hit
  // carries tier/kind/off-axis/topic/matched-field. Inherits demo rate
  // limiting like every /api route.
  app.get('/api/search', wrap((req, res) => {
    res.json(searchRecord(db, String(req.query.q || '')));
  }));

  // Stage 2.95: the time machine. ALL GET — reconstruction is read-side
  // over the certified log; no write path exists at any timestamp.
  app.get('/api/topics/:id/timeline', wrap((req, res) => {
    res.json(topicTimeline(db, Number(req.params.id)));
  }));

  app.get('/api/topics/:id/at', wrap((req, res) => {
    res.json(topicAtTime(db, Number(req.params.id), String(req.query.ts || '')));
  }));

  app.get('/api/topics/:id/stats', wrap((req, res) => {
    res.json(topicStats(db, Number(req.params.id)));
  }));

  app.get('/api/claims/:id/at', wrap((req, res) => {
    res.json(claimAtTime(db, Number(req.params.id), String(req.query.ts || '')));
  }));

  app.get('/api/claims/:id/history', wrap((req, res) => {
    res.json(claimHistory(db, Number(req.params.id)));
  }));

  app.get('/api/epoch', wrap((req, res) => {
    res.json({ epoch: logEpoch(db) });
  }));

  // The event log (audit F). Read-only; the table refuses edits by trigger.
  app.get('/api/events', wrap((req, res) => {
    res.json(
      listEvents(db, {
        claimId: req.query.claim_id ? Number(req.query.claim_id) : undefined,
        topicId: req.query.topic_id ? Number(req.query.topic_id) : undefined
      })
    );
  }));

  app.patch('/api/claims/:id/vertical', wrap((req, res) => {
    res.json(setVertical(db, Number(req.params.id), req.body));
  }));

  // Claim text is immutable, and explicitly so: a tier is earned by the exact
  // sentence that survived review. If text could drift after placement, a
  // claim could earn Core saying one thing and quietly come to say another.
  const immutable = wrap(() => {
    throw new RuleError(
      'Claim text is immutable — the tier was earned by this exact sentence. State the revised version as a new claim and let it earn its own placement.',
      { rule: 'text_immutable' }
    );
  });
  app.patch('/api/claims/:id', immutable);
  app.put('/api/claims/:id', immutable);

  // Built frontend, if present (dev uses the Vite server instead). A
  // sandbox copy's app serves API only — the one surface is the parent's.
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
  if (!sandbox && existsSync(dist)) app.use(express.static(dist));

  app.use((err, req, res, next) => {
    if (err instanceof RuleError) {
      return res.status(err.status).json({
        error: err.message,
        rule: err.rule,
        ...(err.earned_tier !== undefined ? { earned_tier: err.earned_tier } : {})
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error: ' + err.message });
  });

  return app;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const demo = process.env.DEMO_MODE === 'true';

  // Demo boot: the database resets to the pristine seed on every restart —
  // guests leave no residue even if a mutation somehow landed.
  if (demo && process.env.DEMO_PRISTINE) {
    const { rmSync, copyFileSync, mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');
    const runtime = process.env.ONION_DB;
    if (runtime) {
      mkdirSync(dirname(runtime), { recursive: true });
      rmSync(runtime, { force: true });
      copyFileSync(process.env.DEMO_PRISTINE, runtime);
      console.log('Demo mode: database reset to pristine seed.');
    }
  }

  const db = openDb();
  if (!isSeeded(db)) {
    seed(db);
    console.log('Seeded the MKUltra onion.');
  }
  const port = process.env.ONION_PORT || 3111;
  const rateLimit = demo ? Number(process.env.DEMO_RATE_LIMIT || 120) : 0;

  // 2.99a: in demo mode, per-visitor sandbox copies restore from the SAME
  // curated-record fixture the pristine DB was built from — one seed, one
  // restore path. No fixture, no sandbox (reported, not silent).
  let sandboxManager = null;
  if (demo) {
    const { readFileSync } = await import('node:fs');
    const fixturePath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      'exports',
      'curated-record.history.json'
    );
    if (existsSync(fixturePath)) {
      const { makeSandboxManager } = await import('./sandbox.js');
      sandboxManager = makeSandboxManager({
        fixture: JSON.parse(readFileSync(fixturePath, 'utf8')),
        buildApp
      });
      sandboxManager.startSweeper();
      console.log(
        `Sandbox: copy-on-first-write enabled (cap ${sandboxManager.limits.cap}, TTL ${Math.round(sandboxManager.limits.ttlMs / 60_000)} min).`
      );
    } else {
      console.log('Sandbox disabled: exports/curated-record.history.json not found in this package.');
    }
  }

  buildApp(db, { demo, rateLimit, sandboxManager }).listen(port, () => {
    console.log(
      `Truth Onion API on http://localhost:${port}${demo ? ' (read-only demo mode)' : ''}`
    );
  });
}
