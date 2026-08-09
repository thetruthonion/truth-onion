// SPDX-License-Identifier: AGPL-3.0-only
// Source picker (2.9d follow-up): the "attach from the topic library" select
// becomes a SEARCH input, like the claim picker. Empty focus lists the whole
// attachable library — one entity per document, create once attach
// everywhere — and typing ranks citations with the same lexical-only ranker
// (searchRank: no popularity, no activity). Candidates arrive pre-filtered
// by the caller (this topic's library, minus already-attached), and the
// picker fetches nothing of its own.

import { useMemo, useRef, useState } from 'react';
import { rankMatches } from './searchRank.js';

export default function SourcePicker({ sources, value, onChange, placeholder }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const chosen = value !== '' && value != null ? sources.find((s) => s.id === Number(value)) : null;

  const rows = useMemo(() => {
    const labeled = sources.map((s) => ({ ...s, text: s.citation }));
    const query = q.trim();
    if (!query) return labeled;
    return rankMatches(query, labeled);
  }, [q, sources]);

  const pick = (s) => {
    if (!s) return;
    onChange(s.id);
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
      setHighlight((h) => Math.min(rows.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(rows[highlight]);
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
        value={open ? q : chosen ? `[${chosen.tier}] ${chosen.citation.slice(0, 50)}` : ''}
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
          {rows.map((s, i) => (
            <button
              key={s.id}
              role="option"
              aria-selected={highlight === i}
              className={`search-item${highlight === i ? ' hl' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
            >
              <span className="badge">{s.tier}</span>{' '}
              {s.citation.length > 62 ? s.citation.slice(0, 61) + '…' : s.citation}
            </button>
          ))}
          {rows.length === 0 && (
            <div className="search-empty">
              {q.trim() ? 'No matching sources in this topic’s library.' : 'The library is empty.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
