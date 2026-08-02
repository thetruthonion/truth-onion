// Claim picker (2.9d follow-up, operator request): the connect-a-claim
// dropdowns become a SEARCH input. Empty focus shows this claim's own onion
// first — the topic you are standing in — and typing searches every onion,
// ranked by the same lexical-only ranker as the header search (searchRank:
// no activity, no popularity, tier displayed never ranked). Candidates
// arrive pre-filtered by the caller (dial-visible, tier-eligible), so the
// picker adds no reach the dropdown didn't have.

import { useMemo, useRef, useState } from 'react';
import { rankMatches } from './searchRank.js';

export default function ClaimPicker({
  claims, // [{id, text, radial_tier, topic_id, topic_name?}] — pre-filtered candidates
  currentTopicId,
  value,
  onChange,
  placeholder
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const chosen = value != null ? claims.find((c) => c.id === Number(value)) : null;

  const groups = useMemo(() => {
    const query = q.trim();
    const label = (c) => ({
      ...c,
      text: `#${c.id} [${c.radial_tier}] ${c.text}`
    });
    const here = claims.filter((c) => c.topic_id === currentTopicId).map(label);
    const elsewhere = claims.filter((c) => c.topic_id !== currentTopicId).map(label);
    if (!query) {
      // This onion first; other onions wait for a typed search.
      return { here, elsewhere: [], moreHint: elsewhere.length };
    }
    return {
      here: rankMatches(query, here),
      elsewhere: rankMatches(query, elsewhere),
      moreHint: 0
    };
  }, [q, claims, currentTopicId]);

  const flat = [...groups.here, ...groups.elsewhere];

  const pick = (c) => {
    if (!c) return;
    onChange(c.id);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(flat[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className="claim-picker"
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        placeholder={placeholder}
        value={open ? q : chosen ? `#${chosen.id} ${chosen.text.slice(0, 48)}` : ''}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />
      {chosen && !open && (
        <button
          type="button"
          className="small picker-clear"
          title="Clear selection"
          onClick={() => onChange('')}
        >
          ✕
        </button>
      )}
      {open && (
        <div className="search-results" role="listbox">
          {groups.here.length > 0 && <div className="search-group">This onion</div>}
          {groups.here.map((c, i) => (
            <button
              key={c.id}
              role="option"
              aria-selected={highlight === i}
              className={`search-item${highlight === i ? ' hl' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
            >
              <span className={`badge tier tier-${c.radial_tier}`}>{c.radial_tier}</span>{' '}
              {c.text.length > 62 ? c.text.slice(0, 61) + '…' : c.text}
            </button>
          ))}
          {groups.elsewhere.length > 0 && <div className="search-group">Other onions</div>}
          {groups.elsewhere.map((c, i) => {
            const idx = groups.here.length + i;
            return (
              <button
                key={c.id}
                role="option"
                aria-selected={highlight === idx}
                className={`search-item${highlight === idx ? ' hl' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
              >
                <span className={`badge tier tier-${c.radial_tier}`}>{c.radial_tier}</span>{' '}
                {c.text.length > 54 ? c.text.slice(0, 53) + '…' : c.text}
                <span className="muted"> · {c.topic_name}</span>
              </button>
            );
          })}
          {flat.length === 0 && <div className="search-empty">No matching claims.</div>}
          {groups.moreHint > 0 && (
            <div className="search-hidden">
              {groups.moreHint} claim{groups.moreHint === 1 ? '' : 's'} in other onions — type to
              search them.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
