// Shared tab bar (2.9c). Tab state is PRESENTATION ONLY: nothing about
// which tab is open ever gates, fetches, or reorders data — all panel state
// lives in the parent and survives switching, and every action's refusal
// renders where the action lives. A tab may indicate pending input with a
// dot; it never auto-switches. Keyboard: arrows move, focus follows.

export default function TabBar({ tabs, tab, setTab, label }) {
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.key === tab);
    if (i === -1) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      setTab(next.key);
      e.currentTarget.querySelector(`[data-tabkey="${next.key}"]`)?.focus();
    }
  };
  return (
    <div className="tabbar" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.key}
          data-tabkey={t.key}
          role="tab"
          aria-selected={tab === t.key}
          tabIndex={tab === t.key ? 0 : -1}
          className={`tabbtn${tab === t.key ? ' active' : ''}`}
          onClick={() => setTab(t.key)}
        >
          {t.label}
          {t.pending && <span className="tab-pending" title="Unfinished input on this tab"> ●</span>}
        </button>
      ))}
    </div>
  );
}
