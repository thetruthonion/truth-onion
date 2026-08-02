// Predictive search (2.9c) — replaces the horizontal topic row. One field:
// empty-focus lists every topic (plus "+ new topic"); typing filters live
// across topic titles and claim text in two labeled groups. Ranking comes
// from searchRank.js and reads lexical match quality ONLY — never activity,
// recency, challenge counts, or tier.
//
// Depth honesty: claim results respect the dial. Claims beyond the current
// depth are COUNTED, never excerpted — the dial hides content, not
// existence, and search must not become a leak around it.

import { useMemo, useRef, useState } from 'react';
import { rankMatches } from './searchRank.js';
import { visibleAtDepth, depthNeededFor } from './depth.js';

export default function SearchBox({
  topics,
  currentTopicId,
  depth,
  setDepth,
  demo,
  onOpenTopic,
  onOpenClaim,
  onNewTopic,
  onNewClaim,
  onFullSearch
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const results = useMemo(() => {
    const query = q.trim();
    const topicItems = (topics || []).map((t) => ({
      kind: 'topic',
      id: t.id,
      text: t.name
    }));
    if (!query) {
      // Empty focus: the full topic list, no claims.
      return { topics: topicItems, claims: [], hiddenClaims: 0, hiddenDepth: null };
    }
    const rankedTopics = rankMatches(query, topicItems);
    const claimItems = [];
    let hidden = 0;
    let hiddenDepth = null;
    for (const t of topics || []) {
      for (const c of t.claims) {
        const matched = rankMatches(query, [{ text: c.text }]).length > 0;
        if (!matched) continue;
        if (visibleAtDepth(c, depth)) {
          claimItems.push({
            kind: 'claim',
            id: c.id,
            topicId: t.id,
            topicName: t.name,
            tier: c.radial_tier,
            text: c.text
          });
        } else {
          hidden++;
          const need = depthNeededFor(c);
          hiddenDepth = hiddenDepth == null ? need : Math.max(hiddenDepth, need);
        }
      }
    }
    return {
      topics: rankedTopics,
      claims: rankMatches(query, claimItems).slice(0, 12),
      hiddenClaims: hidden,
      hiddenDepth
    };
  }, [q, topics, depth]);

  // 2.9d: submitting a query opens FULL results across the whole record —
  // the typeahead quick-jump stays as-is above it.
  const fullRow = q.trim() && onFullSearch ? [{ kind: 'full', action: 'full', text: q.trim() }] : [];
  // The search bar owns creation too (2.97 punch list): both add flows live
  // in the dropdown alongside search — entry points only, same gated flows.
  // 2.99a Amendment C: they show in demo too — a first write is exactly how
  // a visitor's private copy comes into being.
  const createRows = !q.trim()
    ? [
        { kind: 'new', action: 'new', text: '+ new topic' },
        { kind: 'newClaim', action: 'newClaim', text: '+ add claim' }
      ]
    : [];
  const flat = [
    ...fullRow,
    ...results.topics.map((t) => ({ ...t, action: 'topic' })),
    ...results.claims.map((c) => ({ ...c, action: 'claim' })),
    ...createRows
  ];
  const off = fullRow.length;

  const close = () => {
    setOpen(false);
    setHighlight(0);
  };

  const pick = (entry) => {
    if (!entry) return;
    if (entry.action === 'topic') onOpenTopic(entry.id);
    else if (entry.action === 'claim') onOpenClaim(entry.topicId, entry.id);
    else if (entry.action === 'new') onNewTopic();
    else if (entry.action === 'newClaim') onNewClaim?.();
    else if (entry.action === 'full') onFullSearch(entry.text);
    setQ('');
    close();
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
      close();
      inputRef.current?.blur();
    }
  };

  const current = (topics || []).find((t) => t.id === currentTopicId);

  return (
    <div
      className="searchbox"
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) close();
      }}
    >
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-label="Search topics and claims"
        placeholder={current ? `${current.name} — search or add topics & claims…` : 'Search or add topics & claims…'}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="search-results" role="listbox">
          {fullRow.length > 0 && (
            <button
              role="option"
              aria-selected={highlight === 0}
              className={`search-item full${highlight === 0 ? ' hl' : ''}`}
              onMouseEnter={() => setHighlight(0)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(fullRow[0])}
            >
              🔎 Search the full record for “{q.trim()}”
              <span className="muted"> — claims, reasons, sources, gaps, challenges</span>
            </button>
          )}
          {results.topics.length > 0 && <div className="search-group">Topics</div>}
          {results.topics.map((t, i) => (
            <button
              key={`t${t.id}`}
              role="option"
              aria-selected={highlight === off + i}
              className={`search-item${highlight === off + i ? ' hl' : ''}${t.id === currentTopicId ? ' current' : ''}`}
              onMouseEnter={() => setHighlight(off + i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ ...t, action: 'topic' })}
            >
              {t.text}
              {t.id === currentTopicId && <span className="muted"> — open</span>}
            </button>
          ))}
          {results.claims.length > 0 && <div className="search-group">Claims</div>}
          {results.claims.map((c, i) => {
            const idx = off + results.topics.length + i;
            return (
              <button
                key={`c${c.id}`}
                role="option"
                aria-selected={highlight === idx}
                className={`search-item${highlight === idx ? ' hl' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick({ ...c, action: 'claim' })}
              >
                <span className={`badge tier tier-${c.tier ?? 'offaxis'}`}>{c.tier ?? 'off-axis'}</span>{' '}
                {c.text.length > 64 ? c.text.slice(0, 63) + '…' : c.text}
                <span className="muted"> · {c.topicName}</span>
              </button>
            );
          })}
          {results.hiddenClaims > 0 && (
            <div className="search-hidden">
              ⊕ {results.hiddenClaims} more match{results.hiddenClaims === 1 ? '' : 'es'} at
              deeper levels — the dial hides content, never existence.{' '}
              <button
                className="small"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDepth(results.hiddenDepth)}
              >
                extend dial to {results.hiddenDepth}
              </button>
            </div>
          )}
          {q.trim() && results.topics.length === 0 && results.claims.length === 0 && results.hiddenClaims === 0 && (
            <div className="search-empty">No matches in topic titles or claim text.</div>
          )}
          {createRows.map((row, i) => {
            const idx = flat.length - createRows.length + i;
            const claimNeedsTopic = row.action === 'newClaim' && !currentTopicId;
            return (
              <button
                key={row.action}
                className={`search-item ghost${highlight === idx ? ' hl' : ''}`}
                role="option"
                aria-selected={highlight === idx}
                disabled={claimNeedsTopic}
                title={claimNeedsTopic ? 'Open a topic first — a claim needs an onion to live in.' : ''}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row)}
              >
                {row.text}
                {row.action === 'newClaim' && currentTopicId && (
                  <span className="muted"> — in the open topic</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
