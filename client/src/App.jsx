import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Onion from './Onion.jsx';
import Onion3D from './Onion3D.jsx';
import ClaimPanel from './ClaimPanel.jsx';
import AddClaim from './AddClaim.jsx';
import DepthDial from './DepthDial.jsx';
import Companion from './Companion.jsx';
import { api, RuleRejection } from './api.js';
import TabBar from './Tabs.jsx';
import SearchBox from './SearchBox.jsx';
import { loadPanelWidth, savePanelWidth, PANEL_BOUNDS } from './uiPrefs.js';
import TimeScrubber from './TimeScrubber.jsx';
import { writeBlockedReason, formatTs } from './timeState.js';
import Tour from './tour/Tour.jsx';
import {
  makeParkingStore,
  serializeParking,
  validateParkingText,
  mergeParking,
  resolveParkedRef
} from './parking.js';
import SetupWalkthrough from './tour/SetupWalkthrough.jsx';
import { chatComplete } from './companion/providers.js';
import { loadSettings, providerConfig } from './companion/store.js';
import { cardPersonaText } from './companion/cards.js';
import { visibleAtDepth, depthNeededFor } from './depth.js';
import { initialInteraction, interactionReducer } from './interaction.js';
import corePrompt from '../../sidekick-prompt.md?raw';

const session = {
  get: (k, fallback) => sessionStorage.getItem(k) ?? fallback,
  set: (k, v) => sessionStorage.setItem(k, String(v))
};

export default function App() {
  const [topics, setTopics] = useState(null);
  const [currentTopicId, setCurrentTopicId] = useState(() =>
    Number(session.get('onion.topic', 1))
  );
  // Depth 1 is the hard default: uncertainty is opt-in, never force-fed.
  // The interaction reducer (2.9b) owns select/chain/depth so "the dial
  // never resets" and "single-click selects only" are tested properties.
  const [ui, dispatch] = useReducer(
    interactionReducer,
    Number(session.get('onion.depth', 1)),
    initialInteraction
  );
  const depth = ui.depth;
  const selectedId = ui.selectedId;
  // First open is the product's opening statement: the solid Core sphere.
  const [view, setViewRaw] = useState(() => session.get('onion.view', '3d'));
  const [adding, setAdding] = useState(false);
  const [prefill, setPrefill] = useState(null); // { text, noteId } from the parking lot
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ name: '', description: '' });
  const [rejection, setRejection] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [parked, setParked] = useState([]);
  const [parkText, setParkText] = useState('');
  const [demo, setDemo] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [narrationRequest, setNarrationRequest] = useState(null);
  // 2.9b: double-click OFFERS narration; it runs only on request.
  const [narrationOffer, setNarrationOffer] = useState(null);
  // 2.9c: topic-panel tab — presentation only, never gates data.
  const [topicTab, setTopicTab] = useState('about');
  // 2.98 (operator): the anonymized feedback modal.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbCategory, setFbCategory] = useState('other');
  const [fbMessage, setFbMessage] = useState('');
  const [fbState, setFbState] = useState(null); // null | 'sending' | {ok} | {error}
  // 2.95: topic-health readouts (aggregates only, never leaderboards).
  const [health, setHealth] = useState(null);
  // 2.96: the tour. Invite offered once (flag in onion.ui.*), re-launchable
  // from the header; the cold open stays intact — an invite, never a
  // takeover. tourState: null | {phase:'setup'} | {phase:'tour', mode}.
  const [tourState, setTourState] = useState(null);
  const [tourInvite, setTourInvite] = useState(
    () => typeof localStorage !== 'undefined' && !localStorage.getItem('onion.ui.tourOffered')
  );
  const dismissTourInvite = () => {
    setTourInvite(false);
    try {
      localStorage.setItem('onion.ui.tourOffered', '1');
    } catch {}
  };
  // 2.9d: full-record search results (Amendment A). null = closed;
  // {q, results: null} = loading; {q, results: [...]} = shown.
  const [fullSearch, setFullSearch] = useState(null);
  const runFullSearch = async (q) => {
    setFullSearch({ q, results: null });
    try {
      const out = await api.search(q);
      setFullSearch({ q, results: out.results });
    } catch (e) {
      setFullSearch({ q, results: [], error: e.message });
    }
  };
  const openHit = (hit) => {
    const entry = claimIndex.get(hit.claim_id);
    if (entry) {
      // Opening a result is a deliberate navigation: extend the dial if the
      // claim sits deeper than the current view (user-initiated, like the
      // existing "extend dial" affordances), then single-click semantics.
      const need = depthNeededFor(entry.claim);
      if (need > depth) setDepth(need);
      if (hit.topic.id !== topic?.id) switchTopic(hit.topic.id);
      dispatch({ type: 'select', id: hit.claim_id });
      setAdding(false);
    }
    setFullSearch(null);
  };
  // 2.95: the time scrubber. scrubTs null = Now. While scrubbed, the map
  // renders the reconstructed snapshot and EVERY write path refuses (the
  // guard in timeState.js — pinned). Scrub state lives here, so it survives
  // the 2D/3D toggle and composes with the depth dial.
  const [scrubTs, setScrubTs] = useState(null);
  const [snapshot, setSnapshot] = useState(null); // topicAtTime payload
  const [topicTimelineMeta, setTopicTimelineMeta] = useState(null); // {epoch, earliest}
  const [compare, setCompare] = useState(null); // {claimId, ts, then, now} overlay
  const frozen = scrubTs != null;

  const scrubTo = (ts) => {
    setScrubTs(ts);
    setAdding(false);
    setRejection(null);
  };

  // 2.9d: panel widths — a UI preference in onion.ui.*, never sent anywhere.
  const [sidebarW, setSidebarW] = useState(() => loadPanelWidth('sidebar'));
  const [companionW, setCompanionW] = useState(() => loadPanelWidth('companion'));
  const startResize = (panel, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panel === 'sidebar' ? sidebarW : companionW;
    const bounds = PANEL_BOUNDS[panel];
    const widthAt = (ev) =>
      Math.min(bounds.max, Math.max(bounds.min, startW + (startX - ev.clientX)));
    const onMove = (ev) => (panel === 'sidebar' ? setSidebarW : setCompanionW)(widthAt(ev));
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      savePanelWidth(panel, widthAt(ev));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        setDemo(!!m.demo_mode);
        if (m.demo_mode && !sessionStorage.getItem('onion.intro.seen')) {
          setShowIntro(true);
        }
      })
      .catch(() => {});
  }, []);
  const dismissIntro = () => {
    sessionStorage.setItem('onion.intro.seen', '1');
    setShowIntro(false);
  };

  const setDepth = (d) => {
    dispatch({ type: 'dial', depth: d });
    session.set('onion.depth', d);
  };
  const setView = (v) => {
    setViewRaw(v);
    session.set('onion.view', v);
  };
  const switchTopic = (id) => {
    setCurrentTopicId(id);
    session.set('onion.topic', id);
    dispatch({ type: 'deselect' });
    setAdding(false);
    setRejection(null);
    setNotice(null);
  };

  const reload = useCallback(async () => {
    try {
      const list = await api.topics();
      const detailed = await Promise.all(list.map((t) => api.topic(t.id)));
      setTopics(detailed);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const topic =
    topics && (topics.find((t) => t.id === currentTopicId) || topics[0]);

  // The parking lot lives outside the onion view — its own fetch, never part
  // of the topic payload or any count. 2.97: all access rides ONE adapter —
  // server-backed in the full engine, device-local in demo mode (the demo
  // store is built without the api object; visitor notes structurally never
  // touch the server and survive demo resets on their own device).
  const parkingStore = useMemo(
    () =>
      makeParkingStore({
        demo,
        api,
        storage: typeof localStorage !== 'undefined' ? localStorage : null
      }),
    [demo]
  );
  const reloadParking = useCallback(
    async (topicId) => {
      if (!topicId) return;
      try {
        setParked(await parkingStore.list(topicId));
      } catch {
        setParked([]);
      }
    },
    [parkingStore]
  );
  // 2.97 import state: merge is the default; replace waits for confirmation.
  const [pendingImport, setPendingImport] = useState(null); // {items}
  const importParkingFile = (file) => {
    if (!file) return;
    file.text().then(
      (text) => {
        try {
          const { items } = validateParkingText(text);
          setPendingImport({ items });
        } catch (e) {
          setError(`Import refused: ${e.message}`);
        }
      },
      (e) => setError(`Could not read the file: ${e.message}`)
    );
  };
  const runImport = async (mode) => {
    if (!pendingImport || !topic) return;
    const existing = await parkingStore.readAll(topic.id);
    let toAdd = pendingImport.items;
    let dupNote = '';
    if (mode === 'merge') {
      const { fresh, duplicates } = mergeParking(existing, pendingImport.items);
      toAdd = fresh;
      if (duplicates) dupNote = ` ${duplicates} duplicate${duplicates === 1 ? '' : 's'} skipped (same note content).`;
    } else if (parkingStore.replaceAll) {
      await parkingStore.replaceAll(topic.id);
    } else {
      for (const n of existing) await parkingStore.remove(n.id);
    }
    // The envelope encoding (2.97A) carries every kind losslessly in both
    // backends — references resolve at render time; unresolved ones degrade
    // to readable drafts, never blocking the import.
    await parkingStore.bulkAdd(topic.id, toAdd);
    setPendingImport(null);
    setNotice(`Imported ${toAdd.length} note${toAdd.length === 1 ? '' : 's'} into the parking lot.${dupNote}`);
    reloadParking(topic.id);
  };
  // 2.97 Amendment A: park-in-place + resume. The park freezes the DRAFT,
  // never the world: entries store the pointer + the user's words; resume
  // resolves the record LIVE (resolveParkedRef over today's topics) and
  // rehydrates the form. Dangling pointers degrade to readable drafts.
  const [panelResume, setPanelResume] = useState(null); // {form, fields, nonce}
  const [expandedPark, setExpandedPark] = useState(null); // entry id
  const parkEntry = async (entry) => {
    await parkingStore.parkEntry(topic.id, entry);
    setNotice('Parked — nothing was submitted. Resume it from the Parking Lot tab whenever.');
    reloadParking(topic.id);
  };
  const resumeParked = (entry) => {
    const res = resolveParkedRef(entry, { topics });
    if (!res.resolved) {
      setExpandedPark(entry.id);
      setNotice(res.reason);
      return;
    }
    if (entry.kind === 'claim-draft') {
      setPrefill({ draft: entry.draft, noteId: entry.id });
      setAdding(true);
      dispatch({ type: 'deselect' });
      return;
    }
    if (entry.kind === 'topic-pointer') {
      if (res.topicId != null && res.topicId !== topic.id) switchTopic(res.topicId);
      setTopicTab('about');
      return;
    }
    if (res.liveClaim) {
      // Deliberate navigation: extend the dial if the live claim sits deeper.
      const need = depthNeededFor(res.liveClaim);
      if (need > depth) setDepth(need);
      if (res.topicId !== topic.id) switchTopic(res.topicId);
      dispatch({ type: 'select', id: res.liveClaim.id });
      if (entry.kind === 'challenge' || entry.kind === 'source-attach') {
        setPanelResume({ form: entry.kind === 'challenge' ? 'challenge' : 'source-attach', fields: entry.draft, nonce: Date.now() });
      }
    }
  };
  const AGE = (iso) => {
    const ms = Date.now() - Date.parse(iso);
    const d = Math.floor(ms / 86400000);
    if (d > 0) return `${d}d ago`;
    const h = Math.floor(ms / 3600000);
    if (h > 0) return `${h}h ago`;
    return 'just now';
  };
  const PARK_KIND_LABEL = {
    note: 'note',
    'claim-draft': 'claim draft',
    challenge: 'challenge draft',
    'source-attach': 'source draft',
    'claim-pointer': 'claim pointer',
    'topic-pointer': 'topic pointer'
  };
  const [topicPinNote, setTopicPinNote] = useState('');

  const exportParking = async () => {
    const items = await parkingStore.readAll(topic.id);
    const blob = new Blob([serializeParking(items)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `parking-lot-${topic.name.replace(/[^\w-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  useEffect(() => {
    reloadParking(topic?.id);
  }, [topic?.id, reloadParking]);

  // 2.95: timeline metadata (epoch + earliest moment) for the scrubber.
  useEffect(() => {
    if (!topic?.id) return;
    let live = true;
    api
      .timeline(topic.id)
      .then(
        (t) =>
          live &&
          setTopicTimelineMeta({
            epoch: t.epoch,
            earliest: t.events.length ? t.events[0].at : t.epoch || t.now,
            now: t.now
          })
      )
      .catch(() => live && setTopicTimelineMeta(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id, topics]);

  // 2.95: fetch the reconstruction whenever the scrub position settles.
  useEffect(() => {
    if (scrubTs == null || !topic?.id) {
      setSnapshot(null);
      return;
    }
    let live = true;
    api
      .topicAt(topic.id, scrubTs)
      .then((s) => live && setSnapshot(s))
      .catch(() => live && setSnapshot(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubTs, topic?.id]);

  // Lookup across ALL topics, for resolving support links in the panel.
  const claimIndex = useMemo(() => {
    const idx = new Map();
    if (topics) {
      for (const t of topics) {
        for (const c of t.claims) idx.set(c.id, { claim: c, topicName: t.name });
      }
    }
    return idx;
  }, [topics]);

  // 2.95: when scrubbed, the map's claims come from the reconstructed
  // snapshot; the dial then filters THAT view — the two controls compose
  // ("Depth 3, as of last March"). Both live in App state, so the 2D/3D
  // toggle changes neither.
  const activeClaims =
    frozen && snapshot && snapshot.topic_id === topic?.id ? snapshot.claims : topic?.claims || [];

  // The dial filters the VIEW only. Hidden claims are fully hidden.
  const visibleClaims = useMemo(
    () => activeClaims.filter((c) => visibleAtDepth(c, depth)),
    [activeClaims, depth]
  );
  const hiddenCount = activeClaims.length - visibleClaims.length;
  const allVisibleClaims = useMemo(
    () =>
      topics
        ? topics.flatMap((t) =>
            t.claims
              .filter((c) => visibleAtDepth(c, depth))
              .map((c) => ({ ...c, topic_name: t.name }))
          )
        : [],
    [topics, depth]
  );

  // Dialing back can hide the selected claim — deselect rather than leak it.
  useEffect(() => {
    if (selectedId == null) return;
    const entry = claimIndex.get(selectedId);
    if (!entry || !visibleAtDepth(entry.claim, depth) || entry.claim.topic_id !== topic?.id) {
      dispatch({ type: 'deselect' });
    }
  }, [depth, selectedId, claimIndex, topic]);

  // 2.98 correction: the page→engine door. A claim page's "open in the
  // engine" link lands here as ?claim=<id>; once the topics arrive, open
  // that topic with the claim selected (single-click semantics — panel
  // opens, no chain), extending the dial if the claim sits deeper. The
  // param is then cleared so reloads stay normal.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || !topics) return;
    const id = Number(new URLSearchParams(window.location.search).get('claim'));
    if (!Number.isInteger(id) || id <= 0) {
      deepLinkDone.current = true;
      return;
    }
    deepLinkDone.current = true;
    const entry = claimIndex.get(id);
    if (!entry) {
      setNotice(`The linked claim (#${id}) is not in this record.`);
    } else {
      const need = depthNeededFor(entry.claim);
      if (need > depth) setDepth(need);
      if (entry.claim.topic_id !== topic?.id) switchTopic(entry.claim.topic_id);
      dispatch({ type: 'select', id });
    }
    window.history.replaceState({}, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  // The narration offer follows the double-clicked claim; moving away
  // withdraws it.
  useEffect(() => {
    if (narrationOffer && ui.selectedId !== narrationOffer.id) setNarrationOffer(null);
  }, [ui.selectedId, narrationOffer]);

  // Confirm-before-mutate (operator request): adding or removing a record
  // entity — link, claim, topic, source — asks first, in one consistent
  // inline bar. The confirm never bypasses anything: the frozen guard runs
  // before it, and the rules layer still decides after it.
  const [confirmReq, setConfirmReq] = useState(null); // {message, proceed}
  const askConfirm = (message, proceed) => setConfirmReq({ message, proceed });

  const run = async (fn, successMsg, opts = {}) => {
    // 2.95 (pinned): a historical view NEVER writes. Every mutation in the
    // app funnels through here; while scrubbed it refuses with the reason.
    const blocked = writeBlockedReason(scrubTs);
    if (blocked) {
      setNotice(blocked);
      return;
    }
    if (opts.confirm && !opts._confirmed) {
      askConfirm(opts.confirm, () => run(fn, successMsg, { ...opts, _confirmed: true }));
      return;
    }
    setRejection(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await fn();
      await reload();
      let msg = successMsg;
      if (result && Array.isArray(result.severed_supports) && result.severed_supports.length) {
        msg += ` Severed support links to: ${result.severed_supports
          .map((s) => `#${s.id} “${s.text}”${s.topic ? ` (in the ${s.topic} topic)` : ''}`)
          .join(', ')} (outer cannot feed inner).`;
      }
      // Library-delete ripple: report every claim that re-evaluated.
      if (result && Array.isArray(result.affected)) {
        const demoted = result.affected.filter((a) => a.demoted);
        msg += ` ${result.affected.length} claim${result.affected.length === 1 ? '' : 's'} re-evaluated${
          demoted.length
            ? `; demoted: ${demoted.map((a) => `#${a.claim_id} (${a.from} → ${a.to})`).join(', ')}`
            : '; none demoted'
        }.`;
      }
      // Demoting below your own dial: say where it went, like the create flow.
      const moved = result?.claim ?? (result?.radial_tier !== undefined ? result : null);
      if (moved && !visibleAtDepth(moved, depth)) {
        msg += ` It now sits beyond your depth view — dial to ${depthNeededFor(moved)} to see it.`;
      }
      setNotice(msg);
    } catch (e) {
      if (e instanceof RuleRejection) setRejection(e);
      else setError(e.message);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (error && !topics) {
    return <div style={{ padding: 40 }}>Could not reach the API: {error}</div>;
  }
  if (!topics || !topic) return <div style={{ padding: 40 }}>Loading…</div>;

  const metaphysical = visibleClaims.filter((c) => c.radial_tier == null);
  // Existence is never hidden — the off-axis tab counts ALL metaphysical
  // claims even when the dial keeps their content out of view.
  const offAxisTotal = topic ? topic.claims.filter((c) => !c.radial_tier).length : 0;
  const selectedEntry = selectedId != null ? claimIndex.get(selectedId) : null;
  // While scrubbed, the panel shows the claim AS IT STOOD at the scrub
  // moment — the snapshot version, not the present one.
  const selected = frozen
    ? activeClaims.find((c) => c.id === selectedId) || null
    : selectedEntry?.claim;

  // Double-click (2.9b): the chain view when the claim has any lineage —
  // kernel links OR plain support links (its evidentiary descent). The
  // companion does NOT auto-narrate: double-click OFFERS narration as a
  // button, and it runs only when asked (operator correction 2026-07-27).
  const onNarrate = (id) => {
    // 2.95: chain view and narration read the PRESENT record; over a past
    // snapshot they would mismatch the map. Scrubbed double-click selects
    // only, with the reason named.
    if (frozen) {
      dispatch({ type: 'select', id });
      setNotice(
        `Chain view and narration read the present record — return to Now to use them. (Viewing ${formatTs(scrubTs)}.)`
      );
      return;
    }
    const entry = claimIndex.get(id);
    if (!entry || !visibleAtDepth(entry.claim, depth)) return;
    const c = entry.claim;
    const hasLinks =
      (c.kernel_links || []).length > 0 ||
      (c.supported_by || []).length > 0 ||
      (c.supports_claims || []).length > 0;
    dispatch(hasLinks ? { type: 'chain', id } : { type: 'narrate_only', id });
    setNarrationOffer(c);
  };

  // 2.96: the tour framework's deterministic navigation. The SCRIPT drives
  // this — never the model. Everything here is existing App state.
  const applyTourStop = (apply) => {
    if (!apply) return;
    if (apply.view) setView(apply.view);
    if (apply.depth) setDepth(apply.depth);
    if (apply.scrubReset) scrubTo(null);
    if (apply.scrubDemo && topicTimelineMeta?.epoch) {
      // Demo the honest boundary: one minute before the log epoch.
      const ms = Date.parse(topicTimelineMeta.epoch.replace(' ', 'T') + 'Z') - 60000;
      scrubTo(new Date(ms).toISOString().slice(0, 19).replace('T', ' '));
    }
    if (apply.deselect) dispatch({ type: 'deselect' });
    if (apply.topicTabReset) setTopicTab('about');
    if (apply.topicTab) setTopicTab(apply.topicTab);
    if (apply.selectSeedClaim && topic) {
      const seed = topic.claims.find((c) => c.radial_tier === apply.selectSeedClaim);
      if (seed) dispatch({ type: 'select', id: seed.id });
    }
    if (apply.chainSeedClaim && topic) {
      const lineaged = topic.claims.find((c) => (c.kernel_links || []).length > 0);
      if (lineaged) dispatch({ type: 'chain', id: lineaged.id });
      else {
        const supported = topic.claims.find((c) => (c.supported_by || []).length > 0);
        if (supported) dispatch({ type: 'chain', id: supported.id });
      }
    }
    if (apply.focusSearch) {
      setTimeout(() => document.querySelector('.searchbox input')?.focus(), 50);
    }
  };

  // 2.96 keyed-mode plumbing: voice + in-stop Q&A on the visitor's own key.
  // Q&A is grounded in the stop doc; questions that need the claim record
  // are pointed at the companion panel rather than half-answered.
  const tourSettings = tourState ? loadSettings() : null;
  const tourCallModel = tourSettings
    ? async ({ system, messages }) =>
        chatComplete(providerConfig(tourSettings), { system, messages }, {
          appOrigin: window.location.origin,
          fetchImpl: (...a) => fetch(...a)
        })
    : null;
  const tourAsk = async (q, stop, onStage) => {
    onStage?.('render', 'drafting in voice…');
    const out = await tourCallModel({
      system:
        `${corePrompt}\n\n${cardPersonaText(tourSettings.card)}\n\n` +
        `You are answering a visitor's question AT A TOUR STOP. Ground your answer in the ` +
        `stop's doc below and the map concepts it names. You have no record tools here: if ` +
        `the answer would need a specific claim's record, say so plainly and point at the ` +
        `companion panel (☊) instead of guessing.\n\nStop doc ("${stop.title}"):\n${stop.copy}`,
      messages: [{ role: 'user', content: q }]
    });
    return { text: out.text, rendered_by: tourSettings.card?.name || 'core' };
  };

  const onClaimAdded = (claim) => {
    setAdding(false);
    if (claim && !visibleAtDepth(claim, depth)) {
      setNotice(
        `Claim placed at ${claim.radial_tier ?? 'the off-axis list'} — it survived review, but sits beyond your current depth view. Dial to ${depthNeededFor(claim)} to see it.`
      );
    } else {
      setNotice('Claim placed — it survived review.');
    }
    reload();
  };

  const createTopic = () =>
    askConfirm(`Create the topic "${newTopic.name.trim() || '(unnamed)'}"? Its onion starts empty and follows the same rules.`, doCreateTopic);
  const doCreateTopic = async () => {
    setRejection(null);
    try {
      const t = await api.createTopic(newTopic);
      await reload();
      setAddingTopic(false);
      setNewTopic({ name: '', description: '' });
      switchTopic(t.id);
      setNotice(`Topic "${t.name}" created — its onion starts empty and follows the same rules.`);
    } catch (e) {
      if (e instanceof RuleRejection) setRejection(e);
      else setError(e.message);
    }
  };

  return (
    <>
      {showIntro && (
        <div className="intro-overlay" role="dialog" aria-label="Welcome">
          <div className="intro-card">
            <h2 style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink)', fontSize: 15 }}>
              Truth Onion — read-only showcase
            </h2>
            <ul>
              <li>This sphere shows only what's established. Turn the dial to see further out.</li>
              <li>Click any tile for its evidence, placement reason, and challenge history.</li>
              <li>
                Everything here obeys rules enforced at the data layer — this demo is read-only;
                the full engine refuses cheating instead.
              </li>
            </ul>
            <button className="primary" onClick={dismissIntro}>
              Explore
            </button>
          </div>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-row">
          <h1>Truth Onion</h1>
          <span className="current-topic" title="Open topic">{topic.name}</span>
          <SearchBox
            topics={topics}
            currentTopicId={topic.id}
            depth={depth}
            setDepth={setDepth}
            demo={demo}
            onOpenTopic={(id) => switchTopic(id)}
            onOpenClaim={(topicId, claimId) => {
              // Single-click semantics: panel opens, no chain view.
              if (topicId !== topic.id) switchTopic(topicId);
              dispatch({ type: 'select', id: claimId });
              setAdding(false);
            }}
            onNewTopic={() => setAddingTopic(true)}
            onNewClaim={() => {
              const blocked = writeBlockedReason(scrubTs);
              if (blocked) {
                setNotice(blocked);
                return;
              }
              setAdding(true);
              dispatch({ type: 'deselect' });
              setRejection(null);
              setNotice(null);
            }}
            onFullSearch={runFullSearch}
          />
          {demo && (
            <span className="demo-badge" title="Mutations are refused by the server, not just hidden here">
              read-only showcase
            </span>
          )}
          {/* Operator decision (2.98): the feedback link replaces the header
              add-claim button — adding a claim lives in the search dropdown.
              Feedback is anonymized: payload only, quarantined, never read
              by the engine. Works for everyone, demo included. */}
          <button
            className="primary"
            style={!demo ? { marginLeft: 'auto' } : undefined}
            onClick={() => setFeedbackOpen(true)}
            title="Send anonymized feedback — category + text only, no identity, quarantined outside the record"
          >
            ✉ feedback
          </button>
        </div>
        <div className="topbar-row">
          <DepthDial depth={depth} setDepth={setDepth} />
          <TimeScrubber
            epoch={topicTimelineMeta?.epoch}
            earliest={topicTimelineMeta?.earliest}
            value={scrubTs}
            onChange={scrubTo}
          />
          <div className="view-toggle" role="group" aria-label="View">
            <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>
              2D rings
            </button>
            <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>
              3D sphere
            </button>
          </div>
          <button
            className={`tab${companionOpen ? ' active' : ''}`}
            onClick={() => setCompanionOpen((v) => !v)}
            title="The companion: BYOK narration and topic Q&A. Read-only by construction."
          >
            ☊ companion
          </button>
          <button
            className={`tab${tourState ? ' active' : ''}`}
            onClick={() => {
              dismissTourInvite();
              setTourState({ phase: 'setup' });
            }}
            title="The guided tour — with your companion's voice, or as written copy. Re-launchable any time."
          >
            ❔ tour
          </button>
          <div className="legend">
            {['core', 'inner', 'middle', 'outer', 'outermost'].map((t) => (
              <span key={t}>
                <span className="swatch" style={{ background: `var(--tier-${t})` }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {fullSearch && (
        <div className="fullsearch-overlay" role="dialog" aria-label="Full record search" onKeyDown={(e) => e.key === 'Escape' && setFullSearch(null)}>
          <div className="fullsearch-panel">
            <div className="fullsearch-head">
              <strong>Full record: “{fullSearch.q}”</strong>
              <span className="muted">
                {' '}claims · placement reasons · sources · gap statements · challenges — parking
                lot excluded
              </span>
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => setFullSearch(null)}>
                close
              </button>
            </div>
            {fullSearch.error && <div className="rejection">{fullSearch.error}</div>}
            {fullSearch.results === null && <div className="empty">searching…</div>}
            {fullSearch.results?.length === 0 && !fullSearch.error && (
              <div className="empty">No matches anywhere in the record.</div>
            )}
            {fullSearch.results?.length > 0 &&
              Object.entries(
                fullSearch.results.reduce((groups, hit) => {
                  (groups[hit.topic.name] ??= []).push(hit);
                  return groups;
                }, {})
              ).map(([topicName, hits]) => (
                <div key={topicName} className="fullsearch-group">
                  <div className="search-group">{topicName}</div>
                  {hits.map((hit, i) => (
                    <button key={`${hit.claim_id}-${hit.matched_field}-${i}`} className="search-item" onClick={() => openHit(hit)}>
                      <span className={`badge tier tier-${hit.tier ?? 'offaxis'}`}>
                        {hit.tier ?? 'off-axis'}
                      </span>{' '}
                      <span className={`badge layer-${hit.layer}`}>{hit.layer}</span>{' '}
                      {hit.off_axis && <span className="badge">off-axis</span>}{' '}
                      <span className="muted">matched {hit.matched_field.replace(/_/g, ' ')}:</span>{' '}
                      {hit.snippet}
                      <div className="muted" style={{ marginTop: 2 }}>#{hit.claim_id} · {hit.claim_text}</div>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}

      {feedbackOpen && (
        <div className="fullsearch-overlay" role="dialog" aria-label="Send anonymized feedback">
          <div className="fullsearch-panel" style={{ maxWidth: 520 }}>
            <div className="fullsearch-head">
              <strong>Anonymized feedback</strong>
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => { setFeedbackOpen(false); setFbState(null); }}>
                close
              </button>
            </div>
            <p className="empty" style={{ marginTop: 0 }}>
              Exactly the category and text below are sent — no identity, no account, nothing
              else. It lands in an append-only quarantine inbox outside the record: the engine
              never reads it, and it never renders anywhere. Volume is a prompt for the operator
              to look, never a force that moves anything.
            </p>
            <label>Category</label>
            <select value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
              <option value="other">general</option>
              <option value="bug">something is broken</option>
              <option value="confusion">something is confusing</option>
              <option value="dispute">I dispute a placement</option>
              <option value="idea">idea</option>
            </select>
            <label>Message (max 2000 characters)</label>
            <textarea
              maxLength={2000}
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="what you'd tell the operator…"
            />
            <p className="muted" style={{ fontSize: 11.5 }}>
              Payload to be sent, in full: {`{ category: "${fbCategory}", message: "${fbMessage.slice(0, 60)}${fbMessage.length > 60 ? '…' : ''}" }`}
            </p>
            <div className="row">
              <button
                className="primary"
                disabled={!fbMessage.trim() || fbState === 'sending'}
                onClick={async () => {
                  setFbState('sending');
                  try {
                    await api.feedback({ category: fbCategory, message: fbMessage.trim() });
                    setFbState({ ok: true });
                    setFbMessage('');
                  } catch (e) {
                    setFbState({ error: e.message });
                  }
                }}
              >
                {fbState === 'sending' ? 'sending…' : 'send'}
              </button>
            </div>
            {fbState?.ok && <p className="key-promise">✓ Received into the quarantine inbox. Nothing else was kept.</p>}
            {fbState?.error && <p className="rejection">{fbState.error}</p>}
          </div>
        </div>
      )}

      {compare && (
        <div className="fullsearch-overlay" role="dialog" aria-label="Snapshot comparison">
          <div className="fullsearch-panel">
            <div className="fullsearch-head">
              <strong>Claim #{compare.claimId} — then vs. now</strong>
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => setCompare(null)}>
                close
              </button>
            </div>
            {compare.error && <div className="rejection">{compare.error}</div>}
            {!compare.then && !compare.error && <div className="empty">reconstructing…</div>}
            {compare.then && (
              <div className="compare-grid">
                {(() => {
                  const then = compare.then.claim;
                  const now = compare.now;
                  const cite = (s) => `${s.citation}${s.reconstructed ? ' (reconstructed)' : ''}`;
                  const thenCites = then ? then.sources.map(cite) : [];
                  const nowCites = now ? now.sources.map((s) => s.citation) : [];
                  const col = (title, c, otherCites, cites, unknownVertical) => (
                    <div className="compare-col">
                      <h3>{title}</h3>
                      {!c ? (
                        <div className="empty">
                          Not yet in the record at this moment.
                        </div>
                      ) : (
                        <>
                          <span className={`badge tier tier-${c.radial_tier ?? 'offaxis'}`}>
                            {c.radial_tier ?? 'off-axis'}
                          </span>{' '}
                          <span className={`badge status-${c.status}`}>{c.status}</span>
                          {unknownVertical && (
                            <span className="badge">vertical unknown at this time</span>
                          )}
                          <h4>Sources ({cites.length})</h4>
                          <ul>
                            {cites.map((t, i) => (
                              <li key={i} className={otherCites.includes(t.replace(' (reconstructed)', '')) || otherCites.includes(t) ? '' : 'compare-diff'}>
                                {t}
                              </li>
                            ))}
                          </ul>
                          <div className="muted">
                            {c.challenges.length} challenge record{c.challenges.length === 1 ? '' : 's'} ·{' '}
                            {(c.kernel_links || []).length} kernel link
                            {(c.kernel_links || []).length === 1 ? '' : 's'}
                          </div>
                        </>
                      )}
                    </div>
                  );
                  return (
                    <>
                      {col(
                        `As of ${formatTs(compare.ts)}${compare.then.pre_epoch ? ' (pre-epoch reconstruction — incomplete)' : ''}`,
                        then,
                        nowCites,
                        thenCites,
                        then?.vertical_unknown
                      )}
                      {col('At review (now)', now, thenCites.map((t) => t.replace(' (reconstructed)', '')), nowCites, false)}
                    </>
                  );
                })()}
              </div>
            )}
            <p className="muted" style={{ fontSize: 11.5 }}>
              Highlighted sources exist on one side only — what arrived, or left, between the two
              moments. The diff is the record's answer to “was this placement right given what was
              known then?”
            </p>
          </div>
        </div>
      )}

      {tourInvite && !showIntro && !tourState && (
        <div className="tour-invite">
          Take the tour? Eight stops, skippable anywhere — with your companion's voice or as
          written copy.
          <div className="row" style={{ marginTop: 6 }}>
            <button
              className="small primary"
              onClick={() => {
                dismissTourInvite();
                setTourState({ phase: 'setup' });
              }}
            >
              set up a companion & tour
            </button>
            <button
              className="small"
              onClick={() => {
                dismissTourInvite();
                setTourState({ phase: 'tour', mode: 'written' });
              }}
            >
              written tour
            </button>
            <button className="small" onClick={dismissTourInvite}>
              not now
            </button>
          </div>
        </div>
      )}

      {tourState?.phase === 'setup' && (
        <SetupWalkthrough
          appOrigin={window.location.origin}
          onDone={(outcome) => {
            if (outcome === 'companion') setTourState({ phase: 'tour', mode: 'companion' });
            else if (outcome === 'written') setTourState({ phase: 'tour', mode: 'written' });
            else setTourState(null);
          }}
        />
      )}

      {tourState?.phase === 'tour' && (
        <Tour
          mode={tourState.mode}
          card={tourSettings?.card || null}
          corePrompt={corePrompt}
          callModel={tourState.mode === 'companion' ? tourCallModel : null}
          askInStop={tourAsk}
          applyStop={applyTourStop}
          onExit={() => setTourState(null)}
        />
      )}

      <div className="main">
        <div className="onion-wrap">
          <div className="axis-note up">▲ documented help</div>
          <div className="axis-note down">▼ documented harm</div>
          {frozen && (
            <div className={`time-banner${snapshot?.pre_epoch ? ' preepoch' : ''}`}>
              {snapshot?.pre_epoch ? (
                <>
                  ◦ Before recorded history — the log epoch is{' '}
                  {snapshot?.epoch ? formatTs(snapshot.epoch) : 'unknown'}. This view is derived
                  from records that carry their own timestamps and is NOT complete.
                </>
              ) : (
                <>Viewing {formatTs(scrubTs)} — read-only.</>
              )}
              {snapshot?.reconstruction_notes?.length > 0 && (
                <span
                  className="muted"
                  title={snapshot.reconstruction_notes.join('\n')}
                >
                  {' '}
                  · {snapshot.reconstruction_notes.length} reconstruction note
                  {snapshot.reconstruction_notes.length === 1 ? '' : 's'}
                </span>
              )}{' '}
              <button className="small" onClick={() => scrubTo(null)}>return to now</button>
            </div>
          )}
          {narrationOffer && (
            <button
              className="narrate-offer"
              title="Narration runs only when you ask for it"
              onClick={() => {
                setCompanionOpen(true);
                setNarrationRequest(narrationOffer);
                setNarrationOffer(null);
              }}
            >
              ☊ Narrate claim #{narrationOffer.id}?
            </button>
          )}
          {view === '2d' ? (
            <Onion
              claims={visibleClaims}
              depth={depth}
              selectedId={selectedId}
              onSelect={(id) => {
                dispatch({ type: 'select', id });
                setAdding(false);
                setRejection(null);
                setNotice(null);
              }}
              onNarrate={onNarrate}
            />
          ) : (
            <Onion3D
              claims={visibleClaims}
              depth={depth}
              selectedId={selectedId}
              chainId={ui.chainId}
              onSelect={(id) => {
                dispatch({ type: 'select', id });
                setAdding(false);
                setRejection(null);
                setNotice(null);
              }}
              onEmptyClick={() => dispatch({ type: 'empty' })}
              onEscape={() => dispatch({ type: 'escape' })}
              onNarrate={onNarrate}
            />
          )}
        </div>

        {companionOpen && (
          <div
            className="resize-handle"
            title="Drag to resize the companion panel"
            onPointerDown={(e) => startResize('companion', e)}
          />
        )}
        {companionOpen && (
          <aside className="companion-col" style={{ width: companionW }}>
            <Companion
              corePrompt={corePrompt}
              currentClaim={selected || null}
              activeTopic={topic ? { id: topic.id, name: topic.name } : null}
              narrationRequest={narrationRequest}
              onNarrationDone={() => setNarrationRequest(null)}
              demo={demo}
            />
          </aside>
        )}

        <div
          className="resize-handle"
          title="Drag to resize the panel"
          onPointerDown={(e) => startResize('sidebar', e)}
        />
        <aside className="sidebar" style={{ width: sidebarW }}>
          {confirmReq && (
            <div className="confirm-bar" role="alertdialog" aria-label="Confirm action">
              <span>{confirmReq.message}</span>
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="small primary"
                  onClick={() => {
                    const p = confirmReq.proceed;
                    setConfirmReq(null);
                    p();
                  }}
                >
                  confirm
                </button>
                <button className="small" onClick={() => setConfirmReq(null)}>
                  cancel
                </button>
              </div>
            </div>
          )}
          {rejection && (
            <div className="rejection">
              <button className="small dismiss" onClick={() => setRejection(null)}>dismiss</button>
              <span className="tag">Blocked by the rules — no override</span>
              {rejection.message}
              {rejection.earned_tier != null && (
                <div style={{ marginTop: 6, color: 'var(--ink-2)' }}>
                  Its evidence currently earns: <strong>{rejection.earned_tier}</strong>.
                </div>
              )}
            </div>
          )}
          {notice && <div className="notice" onClick={() => setNotice(null)}>{notice}</div>}
          {error && topics && <div className="rejection">{error}</div>}

          {hiddenCount > 0 && (
            <div className="deeper-note">
              {hiddenCount} more claim{hiddenCount === 1 ? '' : 's'} at deeper levels — the
              dial hides content, never existence.{' '}
              <button className="small" onClick={() => setDepth(Math.min(5, depth + 1))}>
                dial out
              </button>
            </div>
          )}

          <fieldset className="action-area" disabled={busy || frozen}>
          {addingTopic ? (
            <div>
              <h2>
                New topic
                <button className="small" style={{ float: 'right' }} onClick={() => setAddingTopic(false)}>
                  cancel
                </button>
              </h2>
              <label>Name</label>
              <input
                value={newTopic.name}
                onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
              />
              <label>Short description</label>
              <textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
              />
              <div style={{ marginTop: 10 }}>
                <button className="primary" onClick={createTopic}>Create topic</button>
              </div>
            </div>
          ) : adding ? (
            <AddClaim
              key={prefill?.noteId ?? 'blank'}
              topicId={topic.id}
              librarySources={topic.sources || []}
              initialText={prefill?.text ?? ''}
              initialDraft={prefill?.draft ?? null}
              askConfirm={askConfirm}
              onPark={(draft) => {
                parkEntry({
                  kind: 'claim-draft',
                  context: { topic_id: topic.id, topic_name: topic.name },
                  draft,
                  note: ''
                });
                setAdding(false);
                setPrefill(null);
              }}
              onDone={async (claim) => {
                if (prefill?.noteId) {
                  try {
                    await parkingStore.remove(prefill.noteId);
                  } catch {}
                  reloadParking(topic.id);
                }
                setPrefill(null);
                onClaimAdded(claim);
              }}
              onCancel={() => {
                setAdding(false);
                setPrefill(null);
              }}
              setRejection={setRejection}
            />
          ) : selected ? (
            <ClaimPanel
              key={selected.id}
              claim={selected}
              claimIndex={claimIndex}
              visibleClaims={allVisibleClaims}
              librarySources={topic.sources || []}
              topicId={topic.id}
              depth={depth}
              setDepth={setDepth}
              run={run}
              demo={demo}
              frozen={frozen}
              onPark={parkEntry}
              resume={panelResume}
              onDeselect={() => dispatch({ type: 'deselect' })}
              onScrubTo={(ts) => scrubTo(ts)}
              onCompare={async (claimId, ts) => {
                setCompare({ claimId, ts, then: null, now: claimIndex.get(claimId)?.claim || null });
                try {
                  const then = await api.claimAt(claimId, ts);
                  setCompare((c) => (c && c.claimId === claimId ? { ...c, then } : c));
                } catch (e) {
                  setCompare((c) => (c && c.claimId === claimId ? { ...c, error: e.message } : c));
                }
              }}
            />
          ) : (
            <div>
              <h2>
                {topic.name}
                <a
                  className="export-link"
                  href={`/api/topics/${topic.id}/export`}
                  target="_blank"
                  rel="noreferrer"
                  title="Download this topic as JSON (survives npm run reset via npm run import)"
                >
                  export JSON
                </a>
              </h2>
              <TabBar
                label="Topic panel sections"
                tab={topicTab}
                setTab={setTopicTab}
                tabs={[
                  { key: 'about', label: 'About' },
                  { key: 'parking', label: `Parking Lot (${parked.length})`, pending: !!parkText.trim() },
                  { key: 'offaxis', label: `Off-axis (${offAxisTotal})` },
                  { key: 'health', label: 'Health' }
                ]}
              />

              {topicTab === 'health' && (
                <div className="tabpane" role="tabpanel">
                  <p className="empty" style={{ marginTop: 0 }}>
                    Topic health, computed from the event record. Readouts, never leaderboards —
                    nothing here feeds tiers, reputation, or any ranking of participants.
                  </p>
                  {!health || health.topic_id !== topic.id ? (
                    <button
                      className="small"
                      onClick={() => api.topicStats(topic.id).then(setHealth).catch(() => {})}
                    >
                      compute from the log
                    </button>
                  ) : (
                    <dl className="health-list">
                      <dt>Claims on the rings</dt>
                      <dd>{health.claims_on_rings}</dd>
                      <dt>Tier migrations</dt>
                      <dd>
                        {health.migrations.promotions} inward · {health.migrations.demotions} outward ·{' '}
                        {health.migrations.failed_promotions} refused promotion
                        {health.migrations.failed_promotions === 1 ? '' : 's'} (kept on the record)
                      </dd>
                      <dt>Churn (moves per claim)</dt>
                      <dd>{health.churn_moves_per_claim}</dd>
                      <dt>Average survival by tier (days)</dt>
                      <dd>
                        {Object.entries(health.survival_days_by_tier)
                          .map(([t, d]) => `${t}: ${d == null ? '—' : d}`)
                          .join(' · ')}
                      </dd>
                      <dt>Challenge outcomes</dt>
                      <dd>
                        {health.challenge_outcomes.upheld} upheld · {health.challenge_outcomes.rejected}{' '}
                        rejected (survived)
                      </dd>
                      <dt>Character of demotions</dt>
                      <dd>
                        {health.demotion_character.superseded_by_later_evidence} superseded by later
                        evidence · {health.demotion_character.corrected_placements} corrected placements ·{' '}
                        {health.demotion_character.unclassified} unclassified
                      </dd>
                      <dt>Supersession rate</dt>
                      <dd>
                        {health.supersession_rate == null
                          ? '— (no demotions yet)'
                          : `${Math.round(health.supersession_rate * 100)}% of demotions were better evidence displacing sound placements — the health metric of the field, not its participants`}
                      </dd>
                    </dl>
                  )}
                </div>
              )}

              {topicTab === 'about' && (
                <div className="tabpane" role="tabpanel">
                  <p className="empty" style={{ fontStyle: 'normal' }}>{topic.description}</p>
                  <p className="empty">
                    {demo
                      ? 'Click a claim to see its sources, placement reason, and challenge history. Turn the depth dial to reveal weaker tiers.'
                      : 'Click a claim to see its sources, placement reason, and challenge history — or add a new claim and let the rules decide where it may sit.'}
                  </p>
                  <div className="park-inline">
                    <textarea
                      className="composer"
                      rows={1}
                      placeholder="note for your parking lot (optional)"
                      aria-label="Note for your parking lot (optional)"
                      value={topicPinNote}
                      onChange={(e) => {
                        setTopicPinNote(e.target.value);
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                      }}
                    />
                    <button
                      className="small"
                      title="Freeze a pointer to this topic (with your note) into the parking lot"
                      onClick={() => {
                        parkEntry({
                          kind: 'topic-pointer',
                          context: { topic_id: topic.id, topic_name: topic.name },
                          note: topicPinNote.trim()
                        });
                        setTopicPinNote('');
                      }}
                    >
                      ⏸ park topic
                    </button>
                  </div>
                </div>
              )}

              {topicTab === 'parking' && (
                <div
                  className="tabpane"
                  role="tabpanel"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    importParkingFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <p className="empty" style={{ marginTop: 0 }}>
                    Notes, not claims. Private scratch space, outside the epistemics: no tier, no
                    weight, no place on the rings.
                    {demo
                      ? ' In this showcase, parked notes live in THIS BROWSER only — they never touch the server, and they survive demo resets on your device.'
                      : ' Make one a claim when its sources are found.'}
                  </p>
                  <div className="row">
                    <textarea
                      className="composer"
                      rows={1}
                      placeholder="half-formed claim, sources not found yet…"
                      value={parkText}
                      onChange={(e) => {
                        setParkText(e.target.value);
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                      }}
                    />
                    <button
                      className="small"
                      disabled={!parkText.trim()}
                      onClick={async () => {
                        try {
                          await parkingStore.park(topic.id, parkText.trim());
                          setParkText('');
                          reloadParking(topic.id);
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      park
                    </button>
                  </div>
                  {parked.map((n) => {
                    const res = resolveParkedRef(n, { topics });
                    return (
                      <div className="parked-note parked-entry" key={n.id}>
                        <div className="parked-main">
                          <span className="badge">{PARK_KIND_LABEL[n.kind] || n.kind}</span>
                          {n.context?.claim_text && (
                            <span className="muted" title="What the claim said when parked — resume shows today's record">
                              {' '}noted as “{n.context.claim_text.slice(0, 44)}…”
                            </span>
                          )}
                          <div className="parked-snippet">
                            {(n.note || n.text || n.draft?.text || n.draft?.description || n.draft?.citation || '(no note)').slice(0, 90)}
                          </div>
                          <span className="muted">{n.created_at ? AGE(n.created_at) : ''}</span>
                          {!res.resolved && (
                            <span className="badge contested" title={res.reason}>reference unresolved</span>
                          )}
                        </div>
                        <span className="parked-actions">
                          {n.kind === 'note' && !demo && (
                            <button
                              className="small"
                              title="Open the normal create-claim flow with this text — same rules, no shortcut"
                              onClick={() => {
                                setPrefill({ text: n.text, noteId: n.id });
                                setAdding(true);
                                dispatch({ type: 'deselect' });
                              }}
                            >
                              make it a claim
                            </button>
                          )}
                          {n.kind !== 'note' && res.resolved && !(demo && !['claim-pointer', 'topic-pointer'].includes(n.kind)) && (
                            <button
                              className="small"
                              title="Resume — reopens the form with every field as you left it, over today's record"
                              onClick={() => resumeParked(n)}
                            >
                              ▶ resume
                            </button>
                          )}
                          {n.kind !== 'note' && (
                            <button
                              className="small"
                              onClick={() => setExpandedPark(expandedPark === n.id ? null : n.id)}
                            >
                              {expandedPark === n.id ? 'hide' : 'view'}
                            </button>
                          )}
                          <button
                            className="small danger-soft"
                            onClick={() =>
                              askConfirm(
                                `Delete this parked ${PARK_KIND_LABEL[n.kind] || 'entry'}? Parking is private scratch — deletion is permanent and unlogged.`,
                                async () => {
                                  await Promise.resolve(parkingStore.remove(n.id)).catch(() => {});
                                  reloadParking(topic.id);
                                }
                              )
                            }
                          >
                            ✕
                          </button>
                        </span>
                        {expandedPark === n.id && (
                          <div className="parked-draft">
                            {!res.resolved && <div className="rejection">{res.reason}</div>}
                            {n.note && <div><strong>note:</strong> {n.note}</div>}
                            {Object.entries(n.draft || {}).map(([k, v]) => (
                              <div key={k}>
                                <strong>{k}:</strong>{' '}
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {parked.length === 0 && <div className="empty">Empty.</div>}

                  <div className="row" style={{ marginTop: 10 }}>
                    <button
                      className="small"
                      disabled={parked.length === 0}
                      title="Download your notes as readable, versioned JSON — user-initiated only, nothing auto-uploads anywhere"
                      onClick={exportParking}
                    >
                      export notes
                    </button>
                    <label className="small import-label" title="Import a parking-lot export (or drop the file anywhere on this tab)">
                      import…
                      <input
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          importParkingFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {pendingImport && (
                    <div className="card" style={{ marginTop: 8 }}>
                      <strong>
                        Import {pendingImport.items.length} note
                        {pendingImport.items.length === 1 ? '' : 's'}?
                      </strong>
                      <p className="empty" style={{ margin: '4px 0' }}>
                        Merge keeps what you have and skips duplicates. Replace deletes your
                        current notes for this topic first — it asks because it means it.
                      </p>
                      <div className="row">
                        <button className="small primary" onClick={() => runImport('merge')}>
                          merge (default)
                        </button>
                        <button
                          className="small danger-soft"
                          onClick={() =>
                            askConfirm(
                              'Replace your current parking-lot notes for this topic with the imported file? Your existing notes for this topic will be deleted.',
                              () => runImport('replace')
                            )
                          }
                        >
                          replace…
                        </button>
                        <button className="small" onClick={() => setPendingImport(null)}>
                          cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {topicTab === 'offaxis' && (
                <div className="tabpane" role="tabpanel">
                  <p className="empty" style={{ marginTop: 0 }}>
                    Not empirically decidable. Metaphysical claims sit off the radial axis —
                    never ranked proven or unproven.
                  </p>
                  {depth < 5 ? (
                    // The dial hides content, never existence: the count is
                    // honest, the text waits for a deliberate dial-out.
                    <div className="deeper-note">
                      {offAxisTotal === 0
                        ? 'None in this topic.'
                        : `${offAxisTotal} off-axis claim${offAxisTotal === 1 ? '' : 's'} — the dial governs all content.`}{' '}
                      {offAxisTotal > 0 && (
                        <button className="small" onClick={() => setDepth(5)}>
                          extend dial to 5
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="meta-list">
                      {metaphysical.length === 0 && <div className="empty">None in this topic.</div>}
                      {metaphysical.map((c) => (
                        <div
                          key={c.id}
                          className={`card${c.id === selectedId ? ' selected' : ''}`}
                          onClick={() => {
                            dispatch({ type: 'select', id: c.id });
                            setAdding(false);
                          }}
                        >
                          <span className={`badge layer-${c.layer}`}>{c.layer}</span>
                          <span className="badge">metaphysical</span>
                          <div className="claim-text">{c.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </fieldset>
        </aside>
      </div>
    </>
  );
}
