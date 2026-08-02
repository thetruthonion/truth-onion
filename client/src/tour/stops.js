// The tour script (2.96): ONE deterministic stop sequence, two voices.
// Each stop's `copy` is its GROUNDING DOC — what is on screen, what it
// means, what the visitor can try. Keyless visitors read it verbatim; a
// keyed visitor's companion voices it, grounded in this text plus the
// record manifest, and refuses to narrate a stop whose doc is missing
// (pinned) — the companion does not invent UI.
//
// `apply` is data the FRAMEWORK executes: the script navigates, the
// companion narrates, and the model never drives the UI.

export const TOUR_STOPS = [
  {
    key: 'cold-open',
    panelPos: 'bottom-right',
    title: 'The resting sphere',
    apply: { view: '3d', depth: 1, deselect: true, scrubReset: true },
    highlight: '.onion-wrap',
    copy:
      'This is a map of what is established. At rest you see only the core — claims that ' +
      'earned the center with at least two independent primary documents or court records, and ' +
      'no unresolved credible contradiction. Everything weaker exists, but further out, and ' +
      'showing it is your choice, not the default. Nothing on this map got here by being ' +
      'popular; placement is earned from evidence through rules the interface cannot override.',
    tryIt: 'Drag to spin the sphere. Tiles are claims; their color is their tier.'
  },
  {
    key: 'depth-dial',
    panelPos: 'bottom-right',
    title: 'The depth dial — uncertainty is opt-in',
    apply: { view: '3d', depth: 4, deselect: true },
    highlight: '.dial',
    copy:
      'The depth dial reveals shells outward from the core: inner, middle, outer — each a ' +
      'weaker evidence tier, honestly labeled. The dial hides content, never existence: counts ' +
      'of deeper claims stay visible even when their text does not. Turned to 5 it also shows ' +
      'the outermost shell — debunked claims kept permanently visible so nothing gets ' +
      're-litigated forever — and the off-axis list for claims no evidence could ever settle.',
    tryIt: 'Slide the dial between 1 and 5 and watch shells appear and peel away.'
  },
  {
    key: 'tier-colors',
    panelPos: 'bottom-right',
    title: 'What a shell means',
    apply: { view: '3d', depth: 5, deselect: true },
    highlight: '.legend',
    copy:
      'Hue encodes tier and nothing else: core blue, inner coral, middle violet, outer sky, ' +
      'outermost green — the same colors everywhere a tier appears, in both the 3D and 2D ' +
      'views. A tile\'s surface carries more of the record: dense saturated tiles are richly ' +
      'sourced, papery ones thin; a worn, notched rim means the claim has survived challenges; ' +
      'a faint pulse means live contention. None of that is stored appearance — all of it is ' +
      'derived from the evidence record.',
    tryIt: 'Compare a core tile\'s finish with an outer one.'
  },
  {
    key: 'claim-panel',
    panelPos: 'bottom-left',
    title: 'One claim, its whole case',
    apply: { view: '3d', depth: 5, selectSeedClaim: 'core', topicTabReset: true },
    highlight: '.sidebar',
    copy:
      'A single click opens a claim\'s panel — select only, nothing else moves. The tabs hold ' +
      'the whole case: the claim and its links, its sources with their weights (anonymous and ' +
      'self-published carry zero), why it sits where it sits, and Move — the tier floors, shown ' +
      'as "the floor, not a promise": meeting a floor never guarantees promotion, the review ' +
      'battery still rules, and the History tab keeps every challenge including the refused ' +
      'attempts. The interface renders refusals; it never decides them.',
    tryIt: 'Open the Sources tab and find a zero-weight badge.'
  },
  {
    key: 'chain-view',
    panelPos: 'bottom-right',
    title: 'The chain view — where evidence stops',
    apply: { view: '3d', depth: 5, chainSeedClaim: true },
    highlight: '.onion-wrap',
    copy:
      'A double-click on a claim with lineage clears everything else and turns the chain to ' +
      'face you: solid lines where evidence genuinely connects, and a broken line — swinging ' +
      'wide and hooking back — where a claim overreaches its kernel. The break\'s gap statement ' +
      'names what the kernel establishes, what the claim asserts beyond it, and what evidence ' +
      'would close the gap. A kernel link carries zero weight in every direction: it shows ' +
      'where the evidence stops; it never supports the claim that wears it.',
    tryIt: 'Read the gap statement at the break. Click empty space to restore the sphere.'
  },
  {
    key: 'search',
    panelPos: 'bottom-right',
    title: 'Search that keeps its tiers on',
    apply: { view: '3d', depth: 5, deselect: true, focusSearch: true },
    highlight: '.searchbox',
    copy:
      'The header search quick-jumps to topics and claims, and submitting a query searches the ' +
      'full record — claim text, placement reasons, sources, gap statements, challenge text. ' +
      'Every hit carries its tier chip, kind, and topic inseparably, so a name that appears in ' +
      'a proven core claim and a debunked outermost one shows both, visibly distinct — asserted ' +
      'can never dress as proven. Ranking is lexical match quality only: no popularity, no ' +
      'activity, and tier is displayed but never ranks.',
    tryIt: 'Search "Church Committee" and compare the tier chips across topics.'
  },
  {
    key: 'off-axis',
    panelPos: 'bottom-left',
    title: 'Off-axis — not empirically decidable',
    apply: { view: '3d', depth: 5, deselect: true, topicTab: 'offaxis' },
    highlight: '.sidebar',
    copy:
      'Some claims no document or observation could ever settle. They are never ranked proven ' +
      'or unproven — they sit off the radial axis entirely, in this list, with full text at ' +
      'depth 5. Keeping them off the rings is the honest move in both directions: they cannot ' +
      'be debunked into the outermost shell, and they can never borrow the credibility of the ' +
      'core.',
    tryIt: 'Open one and notice it has no tier badge — only "off-axis."'
  },
  {
    key: 'time-scrubber',
    panelPos: 'bottom-left',
    title: 'The time machine — the map shows its corrections',
    apply: { view: '3d', depth: 5, deselect: true, scrubDemo: true },
    highlight: '.time-scrubber',
    copy:
      'The time scrubber renders the topic at any past moment, computed from the event log ' +
      'alone, and every historical view is strictly read-only. Claim histories distinguish ' +
      '"superseded by later evidence" from "corrected placement" — being right on ' +
      'then-available evidence is not the same failure as being wrong. And the record is ' +
      'honest about its own limits: recorded history begins at the log epoch; earlier moments ' +
      'render as reconstructions, marked derived, never presented as complete. The hatched ' +
      'zone on the track is that boundary.',
    tryIt: 'Scrub into the hatched zone and read the banner.'
  },
  {
    // 2.99a Amendment C: the first-write stop — the boundary is no longer a
    // wall, it is where your private copy begins.
    key: 'boundary',
    panelPos: 'bottom-right',
    title: 'Your first write — the copy and the refusal',
    apply: { view: '3d', depth: 5, deselect: true, scrubReset: true },
    highlight: '.demo-badge',
    copy:
      'The shared record you have been reading is read-only, refused by the server. The marker ' +
      'in the header says which record you are looking at: it reads "canonical record" now, ' +
      'and the moment you attempt a write — add a claim from the search box, attach a source, ' +
      'file a challenge — a private copy of the whole record is created for you and the write ' +
      'lands there, with the marker flipped to "your copy". The same rules layer answers in ' +
      'your copy: try placing a claim at core with one weak source and read the refusal — it ' +
      'names the blocker and the tier the evidence earns. A persona switcher appears with the ' +
      'copy: Curator, Contributor, and Reviewer are preset simulated roles for trying the ' +
      'multiplayer machinery — a Contributor filing a withdrawal proposal that a Reviewer ' +
      'adjudicates, never their own. Your copy lives on the server for 30 idle minutes and is ' +
      'never shared or saved there — set up the autosave when it offers, and export a save ' +
      'file to keep or resume your work. The live source verifier is switched off on this ' +
      'public host; clone the repository to run the full engine locally, mechanical ' +
      'verification included.',
    tryIt: 'Open the search box, choose "+ add claim", and watch the marker flip as your copy is born.'
  }
];

export const REQUIRED_STOP_KEYS = [
  'depth-dial',
  'tier-colors',
  'claim-panel',
  'chain-view',
  'search',
  'off-axis',
  'time-scrubber',
  'boundary'
];
