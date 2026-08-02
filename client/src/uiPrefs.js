// UI preferences (2.9d): presentation-only client state — panel widths and
// the like. Lives in its own `onion.ui.*` localStorage entries, never sent
// to the server, and survives every reset path exactly like the companion
// family (all app resets are server-side DB operations that cannot reach
// browser storage — pinned by test).

export const UI_PREFS_KEYS = {
  SIDEBAR_WIDTH: 'onion.ui.sidebarWidth',
  COMPANION_WIDTH: 'onion.ui.companionWidth'
};

export const PANEL_BOUNDS = {
  sidebar: { min: 260, max: 560, fallback: 340 },
  companion: { min: 280, max: 560, fallback: 360 }
};

function store(storage) {
  return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
}

export function loadPanelWidth(panel, storage) {
  const s = store(storage);
  const b = PANEL_BOUNDS[panel];
  if (!s || !b) return b?.fallback ?? 320;
  const key = panel === 'sidebar' ? UI_PREFS_KEYS.SIDEBAR_WIDTH : UI_PREFS_KEYS.COMPANION_WIDTH;
  const raw = Number(s.getItem(key));
  if (!Number.isFinite(raw) || raw <= 0) return b.fallback;
  return Math.min(b.max, Math.max(b.min, raw));
}

export function savePanelWidth(panel, width, storage) {
  const s = store(storage);
  const b = PANEL_BOUNDS[panel];
  if (!s || !b) return;
  const key = panel === 'sidebar' ? UI_PREFS_KEYS.SIDEBAR_WIDTH : UI_PREFS_KEYS.COMPANION_WIDTH;
  s.setItem(key, String(Math.min(b.max, Math.max(b.min, Math.round(width)))));
}
