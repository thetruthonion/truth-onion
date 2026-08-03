import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Onion from './Onion.jsx';
import Onion3D from './Onion3D.jsx';
import ClaimPanel from './ClaimPanel.jsx';
import AddClaim from './AddClaim.jsx';
import DepthDial from './DepthDial.jsx';
import Companion from './Companion.jsx';
import { api, RuleRejection, configureSandbox, onSandboxEvent, setSandboxActor } from './api.js';
import {
  indicatorText,
  apiBase as sbxApiBase,
  divergenceEvents,
  autosaveLabel,
  SAVE_PROMPT_MESSAGE,
  PERSONA_SWITCH_LABEL,
  COPY_CREATED_NOTICE
} from './sandboxState.js';
import {
  fileHandlesSupported,
  pickAutosaveFile,
  makeSaveEngine,
  readBrowserAutosave,
  downloadSave,
  storeHandle,
  loadStoredHandle,
  handlePermissionState,
  requestHandlePermission
} from './autosave.js';
import {
  decorateSave,
  saveFingerprint,
  resumePlan,
  CONTRIBUTION_ASK
} from './sandboxState.js';
import { recordRefusal, refusalLedger, seedRefusals } from './refusalLog.js';
import { sendFeedback, sendSave, DROPBOX_ANONYMITY_LINE, FEEDBACK_EMAIL } from './dropbox.js';
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
  // 2.99a (Amendment C): copy-on-first-write. The visitor browses the
  // canonical record until their first attempted write transparently
  // creates a private session copy (interception lives in api.js — the one
  // client HTTP funnel, punch 1); the indicator is the honesty organ.
  const [sbx, setSbx] = useState({ sid: null, expiresAt: null, persona: 'curator', viewCanonical: false });
  // Save machinery (punch 8): savePrompt is a non-blocking anchored
  // popover — false | 'offer' | 'choose-update-mode'. saveStatus mirrors
  // the engine's status verbatim; the label derives from it.
  const [savePrompt, setSavePrompt] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ fileMode: null, filename: null, behind: 0, mirrorError: null, fileError: null });
  const saveEngineRef = useRef(null); // makeSaveEngine — created with the copy; mirror runs from change one
  const fileWriteTimer = useRef(null);
  const [diffView, setDiffView] = useState(null); // null | {events: [...]} | {loading:true}
  const canonicalMaxEvent = useRef(null); // last canonical event id, for divergence
  const [feedbackPop, setFeedbackPop] = useState(false); // drop-box handoff: anonymous box, email secondary
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [fbCategory, setFbCategory] = useState('other');
  const [fbMessage, setFbMessage] = useState('');
  const [fbState, setFbState] = useState(null); // null | 'sending' | {ok, receipt} | {error, unreachable}
  const [contribState, setContribState] = useState(null); // save contribution: null | 'open' | 'sending' | {ok, receipt} | {error}
  const [copyBirthNote, setCopyBirthNote] = useState(false); // punch 1: shown once, non-blocking
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

  const [resumeOffer, setResumeOffer] = useState(null); // a browser autosave found at boot
  useEffect(() => {
    api
      .meta()
      .then((m) => {
        setDemo(!!m.demo_mode);
        configureSandbox({ demo: !!m.demo_mode }); // arm the api-level first-write funnel
        if (m.demo_mode && !sessionStorage.getItem('onion.intro.seen')) {
          setShowIntro(true);
        }
        if (m.demo_mode) {
          // The canonical record's last event id — the divergence baseline.
          api
            .events()
            .then((evs) => {
              canonicalMaxEvent.current = evs.reduce((m2, e) => Math.max(m2, e.id), 0);
            })
            .catch(() => {});
          // A browser autosave from an earlier visit: offer resume, never
          // auto-import — the save is the visitor's, the choice is theirs.
          const found = readBrowserAutosave();
          if (found) setResumeOffer(found);
        }
      })
      .catch(() => {});
  }, []);

  // Punch 8: the exit nudge — fires when the FILE is behind the copy and
  // no silent writer will catch it up (manual mode, no file yet, or a
  // failing file writer). The mirror protects, but it is never the
  // resting place — the file is.
  useEffect(() => {
    const behindAndUncaught = sbx.sid && saveStatus.behind > 0 && saveStatus.fileMode !== 'file';
    if (!behindAndUncaught) return;
    const nudge = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', nudge);
    return () => window.removeEventListener('beforeunload', nudge);
  }, [saveStatus.behind, saveStatus.fileMode, sbx.sid]);
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

  // Punch 9: which page does a claim's affordance open? Canonical,
  // undiverged claims → the public page; copy-only claims and canonical
  // claims the copy changed → the SESSION page (banner, unshareable —
  // honest, and never a dead link). The baselines are captured from the
  // first canonical load; divergence tracks the copy's own events.
  const canonicalMaxClaim = useRef(null);
  useEffect(() => {
    if (demo && topics && canonicalMaxClaim.current == null && !sbx.sid) {
      canonicalMaxClaim.current = Math.max(0, ...claimIndex.keys());
    }
  }, [demo, topics, claimIndex, sbx.sid]);
  const [divergedIds, setDivergedIds] = useState(() => new Set());
  const refreshDiverged = (save) => {
    if (!save?.record) return;
    const base = canonicalMaxEvent.current ?? 0;
    const ids = new Set();
    for (const e of save.record.events) {
      if (e.id > base && e.claim_id != null) ids.add(e.claim_id);
    }
    setDivergedIds(ids);
  };
  const pageHref = (claimId) =>
    sbx.sid &&
    (divergedIds.has(claimId) ||
      (canonicalMaxClaim.current != null && claimId > canonicalMaxClaim.current))
      ? `/sandbox/${sbx.sid}/claim/${claimId}`
      : `/claim/${claimId}`;

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
  const [confirmReq, setConfirmReq] = useState(null); // {message, proceed, rect}
  // Punch 4 (proximity): the confirm renders ANCHORED to the control that
  // asked. The clicked button is the focused element at ask time; its rect
  // positions the popover. No rect (keyboard path, odd browser) → the bar
  // falls back to its old panel slot rather than vanishing.
  const askConfirm = (message, proceed) => {
    let rect = null;
    try {
      const el = document.activeElement;
      if (el && el.tagName === 'BUTTON') rect = el.getBoundingClientRect();
    } catch {}
    setConfirmReq({ message, proceed, rect });
  };

  // ---- 2.99a sandbox helpers ---------------------------------------------
  // Adopt a created/imported copy: default persona, mirror active from
  // change one (job 1 runs in EVERY browser, setup or not), and the
  // save-first offer as a non-blocking anchored popover (punch 1/8).
  const adoptCopy = (made, { prompt = true } = {}) => {
    setSbx({ sid: made.session_id, expiresAt: made.expires_at, persona: 'curator', viewCanonical: false });
    configureSandbox({ sid: made.session_id, viewCanonical: false, actor: 'curator' });
    saveEngineRef.current = makeSaveEngine({ onStatus: (s) => setSaveStatus(s) });
    // Punch 14: a fresh copy starts the arc; resume paths overwrite this
    // with the ancestor via applyResumePreferences.
    sessionMeta.current = { started_at: new Date().toISOString(), resumed_from: null };
    if (prompt) setSavePrompt('offer');
  };

  // The copy expired (or the save import target vanished): say so plainly,
  // return to the canonical record — the mirror and file hold the work.
  const copyGone = (message) => {
    setSbx({ sid: null, expiresAt: null, persona: 'curator', viewCanonical: false });
    configureSandbox({ sid: null, viewCanonical: false });
    saveEngineRef.current = null;
    setSaveStatus({ fileMode: null, filename: null, behind: 0, mirrorError: null, fileError: null });
    setSavePrompt(false);
    setDivergedIds(new Set());
    setNotice(message);
  };

  // Punch 14: session lineage — a contributed save reads as an arc, not a
  // snapshot. Fresh copies start it; resume/import name the ancestor.
  const sessionMeta = useRef({ started_at: null, resumed_from: null });

  // Punch 10/12/14: everything the save carries beyond the record —
  // preferences, the refusals ledger, the session lineage — is added HERE,
  // once, so the file, the mirror, and the manual download are the same
  // artifact. Pure composition lives in sandboxState.decorateSave.
  const currentSaveText = async (prefetched = null) => {
    const save = prefetched ?? (await api.fetchSandboxSave());
    return JSON.stringify(
      decorateSave(save, {
        autosaveMode: saveEngineRef.current?.fileMode ?? null,
        refusals: refusalLedger(),
        session: sessionMeta.current
      }),
      null,
      2
    );
  };

  // Every successful write (api.js 'wrote' event): JOB 1 mirrors the save
  // immediately in every browser; JOB 2 keeps the file current on its
  // mode's cadence — silent debounce for a picked file, batched so a burst
  // of edits yields ONE download in download mode, nothing in manual mode
  // (the staleness badge counts instead).
  const onRecordChanged = async () => {
    const engine = saveEngineRef.current;
    if (!engine) return;
    try {
      const save = await api.fetchSandboxSave();
      refreshDiverged(save); // punch 9: the page affordance follows divergence
      engine.recordChange(await currentSaveText(save));
      if (engine.fileMode === 'file' || engine.fileMode === 'download') {
        clearTimeout(fileWriteTimer.current);
        fileWriteTimer.current = setTimeout(
          async () => {
            await engine.writeFile(await currentSaveText());
          },
          engine.fileMode === 'file' ? 1500 : 12_000
        );
      }
    } catch (e) {
      setSaveStatus((s) => ({ ...s, mirrorError: e.message }));
    }
  };

  // One-click "update my file now" (manual mode's staleness badge, and the
  // failure popover's recovery action) — the same standard artifact.
  const updateFileNow = async () => {
    const engine = saveEngineRef.current;
    if (!engine) return;
    try {
      await engine.writeFile(await currentSaveText());
    } catch (e) {
      setSaveStatus((s) => ({ ...s, fileError: e.message }));
    }
  };

  // Punch 10: apply a resumed save's preferences — resume re-prompts
  // nothing the browser doesn't mandate. The pure plan (sandboxState) says
  // which single prompt, if any, this browser requires; the popover shows
  // it with its one-line why.
  const applyResumePreferences = async (save) => {
    seedRefusals(save.refusals); // punch 12: the ledger accumulates across sessions
    sessionMeta.current = {
      started_at: new Date().toISOString(),
      resumed_from: { saved_at: save.saved_at ?? null, fingerprint: saveFingerprint(save) }
    };
    const stored = fileHandlesSupported() ? await loadStoredHandle() : null;
    const plan = resumePlan({
      preferences: save.preferences ?? null,
      fsaSupported: fileHandlesSupported(),
      handleStored: !!stored,
      handlePermission: stored ? await handlePermissionState(stored) : null
    });
    if (plan.prompt === 'full-setup') {
      setSavePrompt('offer'); // no preferences in the file — the normal setup
      return;
    }
    if (plan.prompt === null) {
      saveEngineRef.current?.configureFile(
        plan.fileMode === 'file' ? { mode: 'file', handle: stored, filename: stored?.name } : { mode: plan.fileMode }
      );
      return;
    }
    // Exactly one browser-mandated prompt, with its one-line why.
    setSavePrompt({ kind: plan.prompt, why: plan.why, handle: stored });
  };

  // The api funnel's events (punch 1): copy born → adopt it, one plain
  // non-blocking sentence, the save offer; write rerouted → leave canonical
  // view; every write → the save jobs above.
  const sbxHandlers = useRef({});
  sbxHandlers.current = {
    created: (made) => {
      adoptCopy(made);
      setCopyBirthNote(true);
    },
    rerouted: () => setSbx((s) => ({ ...s, viewCanonical: false })),
    wrote: () => onRecordChanged()
  };
  useEffect(
    () =>
      onSandboxEvent((e) => {
        if (e.type === 'copy-created') sbxHandlers.current.created(e.made);
        else if (e.type === 'write-rerouted') sbxHandlers.current.rerouted();
        else if (e.type === 'wrote') sbxHandlers.current.wrote();
      }),
    []
  );

  const run = async (fn, successMsg, opts = {}) => {
    // 2.95 (pinned): a historical view NEVER writes. Every mutation in the
    // app funnels through here; while scrubbed it refuses with the reason.
    const blocked = writeBlockedReason(scrubTs);
    if (blocked) {
      // Punch 12: a client-side block is a refusal too — it lands in the
      // ledger with source 'client', distinct from the rules layer's own.
      recordRefusal({
        action: 'write',
        target: '(scrubbed historical view)',
        persona: sbx.sid ? sbx.persona : null,
        source: 'client',
        blocker_code: 'historical_view_read_only',
        blocker_text: blocked
      });
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
    // Copy-on-first-write happens INSIDE api.js (punch 1) — every mutating
    // call through the one HTTP funnel creates the copy transparently, so
    // nothing here (or in any other component) can halt the first write.
    try {
      const result = await fn();
      await reload();
      let msg = successMsg;
      // Rider C: vertical input the rules did not record is NAMED, never
      // silently zeroed — a non-blocking notice riding the success message.
      if (result?.vertical_notice) msg += ` ${result.vertical_notice}`;
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
      else if (e.rule === 'sandbox_gone') {
        copyGone(e.message);
        await reload(); // base is canonical again — the reading view returns
        return;
      } else setError(e.message);
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
    // Rider C: the non-blocking notice when vertical input was not
    // recorded — named at submit, never silently zeroed.
    const vNote = claim?.vertical_notice ? ` ${claim.vertical_notice}` : '';
    if (claim && !visibleAtDepth(claim, depth)) {
      setNotice(
        `Claim placed at ${claim.radial_tier ?? 'the off-axis list'} — it survived review, but sits beyond your current depth view. Dial to ${depthNeededFor(claim)} to see it.${vNote}`
      );
    } else {
      setNotice(`Claim placed — it survived review.${vNote}`);
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
      {/* 2.99a Amendments A + C: the card is DOORS, not teaching. The two
          facts no visitor may miss — the shared record is read-only; a
          private copy exists where you can act — plus the doors. All
          instruction lives in the tour; sandbox detail lives on the
          first-write message; no guarantee-shaped sentence anywhere. */}
      {showIntro && (
        <div className="intro-overlay" role="dialog" aria-label="Welcome">
          <div className="intro-card">
            <h2 style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink)', fontSize: 15 }}>
              Truth Onion
            </h2>
            <p>
              The curated record of four documented topics — every claim placed by its
              evidence, debunked claims kept visible. This shared record is read-only; the
              sandbox gives you your own private copy — add claims, attach sources, file
              challenges; the rules accept or refuse them, with reasons.
            </p>
            <div className="row">
              <button className="primary" onClick={dismissIntro}>
                Explore the record
              </button>
              <button
                onClick={() => {
                  dismissIntro();
                  dismissTourInvite();
                  setTourState({ phase: 'setup' });
                }}
              >
                Take the tour
              </button>
            </div>
          </div>
        </div>
      )}
      {/* A browser autosave from an earlier visit: the offer, not an auto-
          import. Resuming builds a fresh copy from the save's record. */}
      {resumeOffer && !sbx.sid && (
        <div className="notice" role="status">
          A sandbox autosave from {resumeOffer.saved_at?.slice(0, 16).replace('T', ' ') || 'an earlier visit'} lives
          in this browser.{' '}
          <button
            className="small"
            onClick={async () => {
              try {
                const made = await api.createSandboxCopy(resumeOffer);
                // Punch 10: preferences ride the save — resume restores the
                // record AND the autosave mode; only a browser-mandated
                // prompt (if any) appears, with its one-line why.
                adoptCopy(made, { prompt: false });
                await applyResumePreferences(resumeOffer);
                refreshDiverged(resumeOffer);
                setResumeOffer(null);
                await reload();
                setNotice('Resumed from the in-browser mirror — this copy is that save, restored.');
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            resume from it
          </button>{' '}
          <button className="small" onClick={() => setResumeOffer(null)}>
            not now
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-row">
          <h1>
            <a
              href="https://thetruthonion.org/"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
              title="thetruthonion.org"
            >
              Truth Onion
            </a>
          </h1>
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
          {/* Punch 7: one cluster for which-record-am-I-seeing — the
              indicator (the honesty organ) with its two related actions. */}
          {demo && (
            <span className="hdr-cluster" aria-label="Record indicator">
              <span
                className="demo-badge"
                title={
                  sbx.sid
                    ? 'Your private copy — the same rules accept or refuse your changes here; the shared record is untouched'
                    : 'The shared record is read-only, refused by the server — your first write creates a private copy'
                }
              >
                {indicatorText(sbx)}
              </span>
              {sbx.sid && !sbx.viewCanonical && (
                <>
                  <button
                    className="small"
                    title="What your copy changed, event by event"
                    onClick={async () => {
                      setDiffView({ loading: true });
                      try {
                        const evs = await api.events();
                        setDiffView({ events: divergenceEvents(evs, canonicalMaxEvent.current ?? 0) });
                      } catch (e) {
                        setDiffView({ events: [], error: e.message });
                      }
                    }}
                  >
                    what differs
                  </button>
                  <button
                    className="small"
                    title="Browse the canonical record again — your copy stays intact"
                    onClick={async () => {
                      setSbx((s) => ({ ...s, viewCanonical: true }));
                      configureSandbox({ viewCanonical: true });
                      await reload();
                    }}
                  >
                    view canonical
                  </button>
                </>
              )}
              {sbx.sid && sbx.viewCanonical && (
                <button
                  className="small"
                  onClick={async () => {
                    setSbx((s) => ({ ...s, viewCanonical: false }));
                    configureSandbox({ viewCanonical: false });
                    await reload();
                  }}
                >
                  back to your copy
                </button>
              )}
            </span>
          )}
          {/* Import a save into a fresh copy (round-trip pinned server-side). */}
          {demo && !sbx.sid && (
            <label className="small" style={{ cursor: 'pointer' }} title="Import a sandbox save file — a fresh private copy restored from it">
              import save
              <input
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    const save = JSON.parse(await file.text());
                    const made = await api.createSandboxCopy(save);
                    adoptCopy(made, { prompt: false });
                    await applyResumePreferences(save);
                    refreshDiverged(save);
                    await reload();
                    setNotice('Save imported into a fresh private copy.');
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              />
            </label>
          )}
          {/* Drop-box handoff B: the anonymous feedback box returns as the
              PRIMARY path — durable storage now exists on the site, so the
              honest copy is true again. Email stays inside as the
              if-you'd-like-a-reply option (punch 3's copy box). Unreachable
              endpoint → said plainly, email fallback — never a fake
              success. Punch 7: pinned to a consistent right edge. */}
          <span className="hdr-feedback" style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              className="primary"
              onClick={() => {
                setFeedbackPop((v) => !v);
                setFeedbackCopied(false);
                setFbState(null);
              }}
              title={`Anonymous feedback to the site's drop box — ${DROPBOX_ANONYMITY_LINE}; email available if you'd like a reply`}
            >
              ✉ feedback
            </button>
            {feedbackPop && (
              <span className="popover" role="dialog" aria-label="Anonymous feedback" style={{ minWidth: 300 }}>
                <span className="pop-text">
                  Anonymous: exactly the category and message below are sent — no identity, no
                  account; {DROPBOX_ANONYMITY_LINE}. It lands in a quarantine store outside the
                  record: the engine never reads it, and volume is a prompt for the operator to
                  look, never a force that moves anything.
                </span>
                <select value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
                  <option value="other">general</option>
                  <option value="bug">something is broken</option>
                  <option value="confusion">something is confusing</option>
                  <option value="dispute">I dispute a placement</option>
                  <option value="idea">idea</option>
                </select>
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={fbMessage}
                  onChange={(e) => setFbMessage(e.target.value)}
                  placeholder="what you'd tell the operator… (max 2000 characters)"
                />
                <button
                  className="small primary"
                  disabled={!fbMessage.trim() || fbState === 'sending'}
                  onClick={async () => {
                    setFbState('sending');
                    const out = await sendFeedback({ category: fbCategory, message: fbMessage.trim() });
                    if (out.ok) {
                      setFbState({ ok: true, receipt: out.receipt });
                      setFbMessage('');
                    } else {
                      setFbState({ error: out.message, unreachable: out.unreachable });
                    }
                  }}
                >
                  {fbState === 'sending' ? 'sending…' : 'send anonymously'}
                </button>
                {fbState?.ok && (
                  <span className="pop-text">
                    ✓ Received into the quarantine store. Nothing about you was kept.
                    {fbState.receipt ? ` Receipt (content hash): ${fbState.receipt.slice(0, 16)}` : ''}
                  </span>
                )}
                {fbState?.error && <span className="pop-text" style={{ color: 'var(--critical, #d03b3b)' }}>{fbState.error}</span>}
                <span className="pop-text muted" style={{ fontSize: 11 }}>
                  Prefer email, if you'd like a reply:{' '}
                  <code style={{ userSelect: 'all' }}>{FEEDBACK_EMAIL}</code>{' '}
                  <button
                    className="small"
                    onClick={() =>
                      navigator.clipboard?.writeText(FEEDBACK_EMAIL).then(
                        () => setFeedbackCopied(true),
                        () => setFeedbackCopied(false)
                      )
                    }
                  >
                    {feedbackCopied ? '✓ copied' : 'copy'}
                  </button>{' '}
                  <a className="small" href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('[feedback] Truth Onion demo')}`}>
                    open mail app
                  </a>
                </span>
                <button className="small" onClick={() => setFeedbackPop(false)}>
                  close
                </button>
              </span>
            )}
          </span>
        </div>
        <div className="topbar-row">
          {/* Punch 7: depth and time travel together — one viewing cluster. */}
          <span className="hdr-cluster" aria-label="View depth and time">
            <DepthDial depth={depth} setDepth={setDepth} />
            <TimeScrubber
              epoch={topicTimelineMeta?.epoch}
              earliest={topicTimelineMeta?.earliest}
              value={scrubTs}
              onChange={scrubTo}
            />
          </span>
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
          {/* 2.99a: the persona switcher appears when the copy does. Preset,
              simulated standing — the honesty label is the title AND the
              visible legend below. Gates live in the rules layer. */}
          {demo && sbx.sid && (
            <span className="hdr-cluster persona-switch" title={PERSONA_SWITCH_LABEL}>
              <label style={{ fontSize: 11.5, marginRight: 4 }}>acting as</label>
              <select
                value={sbx.persona}
                onChange={(e) => {
                  const persona = e.target.value;
                  setSbx((s) => ({ ...s, persona }));
                  setSandboxActor(persona);
                }}
              >
                <option value="curator">Curator — full powers in this copy</option>
                <option value="contributor">Contributor — adds & proposes, adjudicates nothing</option>
                <option value="reviewer">Reviewer — adjudicates others' proposals</option>
              </select>
              <span className="muted" style={{ fontSize: 10.5, display: 'block' }}>
                {PERSONA_SWITCH_LABEL}
              </span>
            </span>
          )}
          {/* Punch 7/8: the SAVE cluster — status label, its actions, and
              both save popovers (setup + failure) anchored right here. */}
          {demo && sbx.sid && (
            <span className="hdr-cluster autosave-status" style={{ fontSize: 11.5, position: 'relative' }} title="One save format — the autosaved file IS the standard save">
              {(saveStatus.mirrorError || saveStatus.fileError) ? '⚠ ' : ''}
              {autosaveLabel(saveStatus)}
              {!saveStatus.fileMode && (
                <button className="small" onClick={() => setSavePrompt('offer')}>
                  save your copy
                </button>
              )}
              {(saveStatus.fileMode === 'manual' || saveStatus.fileMode === 'download') && saveStatus.behind > 0 && (
                <button className="small" title="Write the current copy to your file now (one download)" onClick={updateFileNow}>
                  update file now
                </button>
              )}
              {/* Drop-box handoff B: contribute your save — anonymous, to
                  the site's durable quarantine store; the file is the only
                  thing sent. Voluntary, never gating. */}
              <button
                className="small"
                title={`Send this copy's save file to the anonymous drop box — ${DROPBOX_ANONYMITY_LINE}`}
                onClick={() => setContribState(contribState ? null : 'open')}
              >
                contribute save
              </button>
              {contribState && (
                <span className="popover" role="dialog" aria-label="Contribute your save" style={{ minWidth: 300 }}>
                  {(contribState === 'open' || contribState === 'sending') && (
                    <>
                      <span className="pop-text">
                        What will be sent: this copy's save file — your claims, sources,
                        challenges, refusals, and reasons — and nothing else; {DROPBOX_ANONYMITY_LINE}.
                        It's your work: review it first (download below), then send.
                      </span>
                      <button
                        className="small primary"
                        disabled={contribState === 'sending'}
                        onClick={async () => {
                          setContribState('sending');
                          try {
                            const save = JSON.parse(await currentSaveText());
                            const out = await sendSave(save);
                            setContribState(out.ok ? { ok: true, receipt: out.receipt } : { error: out.message });
                          } catch (e) {
                            setContribState({ error: e.message });
                          }
                        }}
                      >
                        {contribState === 'sending' ? 'sending…' : 'send this copy’s save'}
                      </button>
                      <button
                        className="small"
                        title="Review before sending — the file is yours"
                        onClick={async () => downloadSave(await currentSaveText())}
                      >
                        download to review first
                      </button>
                      <button className="small" onClick={() => setContribState(null)}>
                        cancel
                      </button>
                    </>
                  )}
                  {contribState?.ok && (
                    <>
                      <span className="pop-text">
                        ✓ Received into the quarantine store — the file, nothing else.
                        {contribState.receipt ? ` Receipt (content hash): ${contribState.receipt.slice(0, 16)} — proof of inclusion, no identity.` : ''}
                      </span>
                      <button className="small" onClick={() => setContribState(null)}>
                        close
                      </button>
                    </>
                  )}
                  {contribState?.error && (
                    <>
                      <span className="pop-text" style={{ color: 'var(--critical, #d03b3b)' }}>{contribState.error}</span>
                      <span className="pop-text muted" style={{ fontSize: 11 }}>
                        Email works instead: <code style={{ userSelect: 'all' }}>{FEEDBACK_EMAIL}</code> — attach the downloaded save.
                      </span>
                      <button className="small" onClick={() => setContribState('open')}>
                        back
                      </button>
                    </>
                  )}
                </span>
              )}
              {/* Punch 6b: failure surfaces AT the save control, with the
                  recovery action — never a distant corner banner. */}
              {(saveStatus.mirrorError || saveStatus.fileError) && (
                <span className="popover warn" role="alert">
                  {autosaveLabel(saveStatus)}
                  <button className="small" onClick={updateFileNow}>
                    download save now
                  </button>
                  <button
                    className="small"
                    onClick={() => setSaveStatus((s) => ({ ...s, mirrorError: null, fileError: null }))}
                  >
                    dismiss
                  </button>
                </span>
              )}
              {/* Punch 8: save-first setup — a real save creates the file;
                  autosave maintains it. Non-blocking, skippable, anchored. */}
              {savePrompt && (
                <span className="popover" role="dialog" aria-label="Save your copy">
                  {savePrompt === 'offer' && (
                    <>
                      <span className="pop-text">{SAVE_PROMPT_MESSAGE}</span>
                      <button
                        className="small primary"
                        onClick={async () => {
                          const engine = saveEngineRef.current;
                          if (!engine) return;
                          try {
                            const text = await currentSaveText();
                            if (fileHandlesSupported()) {
                              const picked = await pickAutosaveFile();
                              if (!picked) return;
                              engine.configureFile({ mode: 'file', handle: picked.handle, filename: picked.filename });
                              await engine.writeFile(text);
                              // Punch 10: the handle persists beside the
                              // mirror so a return visit reconnects.
                              storeHandle(picked.handle);
                              setSavePrompt(false);
                            } else {
                              downloadSave(text);
                              setSavePrompt('choose-update-mode');
                            }
                          } catch (e) {
                            setSaveStatus((s) => ({ ...s, fileError: e.message }));
                          }
                        }}
                      >
                        Save your copy
                      </button>
                      <button className="small" onClick={() => setSavePrompt(false)}>
                        skip — every change still protected in-browser
                      </button>
                      {/* Punch 11: the voluntary ask — shown at the save
                          moments, dismissible, never repeated in-session,
                          never gating. */}
                      {!sessionStorage.getItem('onion.ui.contribAskSeen') && (
                        <span className="pop-text muted" style={{ fontSize: 11 }}>
                          {CONTRIBUTION_ASK}{' '}
                          <button
                            className="small"
                            onClick={(e) => {
                              sessionStorage.setItem('onion.ui.contribAskSeen', '1');
                              e.target.closest('span').style.display = 'none';
                            }}
                          >
                            dismiss
                          </button>
                        </span>
                      )}
                    </>
                  )}
                  {savePrompt?.kind === 'reconnect' && (
                    <>
                      <span className="pop-text">{savePrompt.why}</span>
                      <button
                        className="small primary"
                        onClick={async () => {
                          const granted = (await requestHandlePermission(savePrompt.handle)) === 'granted';
                          if (granted) {
                            saveEngineRef.current?.configureFile({
                              mode: 'file',
                              handle: savePrompt.handle,
                              filename: savePrompt.handle?.name
                            });
                            setSavePrompt(false);
                          } else {
                            setSavePrompt('offer'); // declined: the normal setup, mirror still protecting
                          }
                        }}
                      >
                        reconnect my save file
                      </button>
                      <button className="small" onClick={() => setSavePrompt('offer')}>
                        use a different save setup
                      </button>
                    </>
                  )}
                  {savePrompt?.kind === 'pick-where' && (
                    <>
                      <span className="pop-text">{savePrompt.why}</span>
                      <button
                        className="small primary"
                        onClick={async () => {
                          try {
                            const picked = await pickAutosaveFile();
                            if (!picked) return;
                            saveEngineRef.current?.configureFile({ mode: 'file', handle: picked.handle, filename: picked.filename });
                            await saveEngineRef.current?.writeFile(await currentSaveText());
                            storeHandle(picked.handle);
                            setSavePrompt(false);
                          } catch (e) {
                            setSaveStatus((s) => ({ ...s, fileError: e.message }));
                          }
                        }}
                      >
                        pick where
                      </button>
                      <button className="small" onClick={() => setSavePrompt(false)}>
                        not now — protected in-browser meanwhile
                      </button>
                    </>
                  )}
                  {savePrompt === 'choose-update-mode' && (
                    <>
                      <span className="pop-text">
                        Saved to your Downloads. Keep the file current how? Automatic updates are
                        batched — a burst of edits yields one download — and may create numbered
                        copies in Downloads; updating yourself keeps one file and a visible
                        “file is N changes behind” badge with one-click update.
                      </span>
                      <button
                        className="small primary"
                        onClick={() => {
                          saveEngineRef.current?.configureFile({ mode: 'download' });
                          setSavePrompt(false);
                        }}
                      >
                        update my file automatically
                      </button>
                      <button
                        className="small"
                        onClick={() => {
                          saveEngineRef.current?.configureFile({ mode: 'manual' });
                          setSavePrompt(false);
                        }}
                      >
                        I’ll update it myself
                      </button>
                    </>
                  )}
                </span>
              )}
            </span>
          )}
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

      {/* The save prompt now lives as an anchored popover in the header's
          save cluster (punch 1/4/8) — no modal overlay interrupts a write. */}

      {/* 2.99a Amendment C: the divergence view — what your copy changed. */}
      {diffView && (
        <div className="fullsearch-overlay" role="dialog" aria-label="What differs from the canonical record">
          <div className="fullsearch-panel" style={{ maxWidth: 640 }}>
            <div className="fullsearch-head">
              <strong>Your copy vs. the canonical record</strong>
              <button className="small" style={{ marginLeft: 'auto' }} onClick={() => setDiffView(null)}>
                close
              </button>
            </div>
            {diffView.loading && <div className="empty">reading your copy's event log…</div>}
            {diffView.error && <div className="rejection">{diffView.error}</div>}
            {diffView.events && diffView.events.length === 0 && (
              <div className="empty">No divergence yet — your copy still matches the canonical record exactly.</div>
            )}
            {diffView.events?.map((e) => (
              <div className="event" key={e.id}>
                <span className="muted">{e.created_at}</span> · <strong>{e.action.replace(/_/g, ' ')}</strong>
                {' '}· actor: {e.actor}
                {e.claim_id != null && <> · claim #{e.claim_id}</>}
                <div className="muted" style={{ fontSize: 11.5 }}>{e.reason}</div>
              </div>
            ))}
            {diffView.events && (
              <p className="muted" style={{ fontSize: 11.5 }}>
                Every entry above is your copy's own event log past the canonical record's last
                entry — the same append-only log the engine keeps, with your personas as actors.
              </p>
            )}
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
              apiBase={sbxApiBase(sbx)}
            />
          </aside>
        )}

        <div
          className="resize-handle"
          title="Drag to resize the panel"
          onPointerDown={(e) => startResize('sidebar', e)}
        />
        <aside className="sidebar" style={{ width: sidebarW }}>
          {/* Punch 4: the confirm anchors to the asking control (fixed at
              its rect); the in-panel slot is only the no-rect fallback. */}
          {confirmReq && (
            <div
              className="confirm-bar"
              role="alertdialog"
              aria-label="Confirm action"
              style={
                confirmReq.rect
                  ? {
                      position: 'fixed',
                      zIndex: 60,
                      top: Math.min(confirmReq.rect.bottom + 6, window.innerHeight - 120),
                      left: Math.max(8, Math.min(confirmReq.rect.left, window.innerWidth - 340)),
                      maxWidth: 330
                    }
                  : undefined
              }
            >
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
          {/* Punch 1: the one-time copy-birth sentence — informational,
              plain, non-blocking, adjacent to where actions happen. */}
          {copyBirthNote && (
            <div className="notice" role="status" onClick={() => setCopyBirthNote(false)}>
              {COPY_CREATED_NOTICE}
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
              offAxisClaims={(topic.claims || []).filter((c) => c.radial_tier == null)}
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
              // 2.99a Amendment C: write affordances SHOW in demo — the
              // first attempt transparently creates the private copy and
              // the rules answer there. Read-only is the server's posture
              // on the shared record, no longer the panel's.
              demo={false}
              pageHref={pageHref}
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
                          {c.kind_proposal && <span className="badge contested">kind challenge pending</span>}
                          <div className="claim-text">{c.text}</div>
                          {/* 2.99b: the recast map — who reworded this into
                              what, and where the evidence actually put it.
                              Zero weight both ways: none of their fates
                              moves this claim. */}
                          {c.recasts?.length > 0 && (
                            <div className="small muted" style={{ marginTop: 4 }}>
                              {c.recasts.map((r) => (
                                <div key={r.id}>
                                  recast → #{r.id} “{r.text.slice(0, 60)}…”{' '}
                                  <span className={`badge tier tier-${r.radial_tier ?? 'offaxis'}`}>{r.radial_tier}</span>{' '}
                                  <span className={`badge status-${r.status}`}>{r.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Contest the category from here too — the form
                              lives in the claim panel (Move machinery), so
                              file directly with a prompt-sized reason. */}
                          {!demo || sbx.sid ? (
                            <div className="small" style={{ marginTop: 4 }}>
                              {c.kind_proposal ? (
                                <span className="muted">pending: → {c.kind_proposal.to} — adjudicate in the record's flow</span>
                              ) : (
                                <button
                                  className="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const reason = window.prompt(
                                      'Contest this claim as EMPIRICAL. The resolvability argument: which evidence type — documents, court records, reporting, data — could bear on this exact sentence, and how?'
                                    );
                                    if (reason && reason.trim()) {
                                      run(
                                        () => api.proposeKindChallenge(c.id, 'empirical', reason.trim()),
                                        'Kind challenge filed — zero effect until adjudication.'
                                      );
                                    }
                                  }}
                                >
                                  contest kind → empirical
                                </button>
                              )}
                            </div>
                          ) : null}
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
