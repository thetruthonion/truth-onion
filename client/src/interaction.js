// The interaction model as a pure state machine, so its guarantees are
// testable without a renderer. 2.9b supersession (this REPLACES the 2.9
// select behavior):
//
//   single-click   → tile select + evidence panel ONLY. No lineage draw,
//                    no clearing, no reframing.
//   double-click   → the chain view, when the claim has a kernel lineage:
//                    everything not in the chain clears; narration rides on
//                    it. Without a lineage: no clearing — narration only.
//   empty click    → the full sphere restores AT THE DEPTH THE DIAL IS SET
//                    TO. The dial never resets; no transition here touches
//                    depth except the dial itself.
//   Escape         → rest + camera home (its 2.9 meaning, retained).
//
// The reducer owns depth precisely so that "the dial never resets" is a
// provable property of every transition, not a habit of the caller.

export function initialInteraction(depth = 1) {
  return { mode: 'rest', selectedId: null, chainId: null, depth, goHome: false };
}

export function interactionReducer(state, action) {
  switch (action.type) {
    case 'select':
      // Single click: select + panel only — the 2.9 lineage-on-select is
      // gone. Inside the chain view the only clickable tiles ARE the chain's,
      // so a select there updates the panel and the chain persists (a single
      // click never clears and never restores; that is the empty click's job).
      if (state.mode === 'chain') {
        return { ...state, selectedId: action.id, goHome: false };
      }
      return { ...state, mode: 'selected', selectedId: action.id, chainId: null, goHome: false };
    case 'chain':
      // Double click on a claim WITH a kernel lineage.
      return { ...state, mode: 'chain', selectedId: action.id, chainId: action.id, goHome: false };
    case 'narrate_only':
      // Double click without a lineage: no clearing. Selection still lands
      // so the panel matches what is being narrated.
      return { ...state, mode: 'selected', selectedId: action.id, chainId: null, goHome: false };
    case 'empty':
      // Restore the sphere at the current dial depth — depth untouched.
      return { ...state, mode: 'rest', selectedId: null, chainId: null, goHome: false };
    case 'escape':
      return { ...state, mode: 'rest', selectedId: null, chainId: null, goHome: true };
    case 'home_done':
      return { ...state, goHome: false };
    case 'deselect':
      // The panel's close button: same restore as an empty click.
      return { ...state, mode: 'rest', selectedId: null, chainId: null, goHome: false };
    case 'dial':
      // The ONLY transition that may change depth.
      return { ...state, depth: action.depth };
    default:
      return state;
  }
}
