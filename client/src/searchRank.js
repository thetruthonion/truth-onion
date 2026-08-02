// Search ranking — LEXICAL MATCH QUALITY ONLY, by construction.
//
// A search that surfaces "active" claims first is a soft popularity channel,
// and popularity moving visibility is adjacent to popularity moving claims —
// refused. So this module scores a (query, text) PAIR OF STRINGS and nothing
// else: no activity, no recency, no challenge counts, no tier, no ids. The
// ranking function cannot read what it is not handed — pinned by test with
// decoy fields.

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Score one text against a query. Higher is better; null means no match.
// Multi-word queries require every word to match somewhere.
export function matchScore(query, text) {
  const q = norm(query);
  const t = norm(text);
  if (!q || !t) return null;
  const words = q.split(' ');
  let score = 0;
  for (const w of words) {
    const at = t.indexOf(w);
    if (at === -1) return null; // every query word must appear
    if (t === w) score += 1000; // exact
    else if (at === 0) score += 800; // text starts with the word
    else if (t[at - 1] === ' ' || /[^a-z0-9]/.test(t[at - 1])) score += 600; // word start
    else score += 400; // substring
    score -= Math.min(200, at); // earlier matches read as better matches
  }
  return score;
}

// Rank items by lexical match quality alone. Items must carry {text}; every
// other field is invisible to the ranking. Ties break on shorter text, then
// on the text itself — deterministic, and tier-neutral within match quality.
export function rankMatches(query, items) {
  return items
    .map((item) => ({ item, score: matchScore(query, item.text) }))
    .filter((r) => r.score !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        norm(a.item.text).length - norm(b.item.text).length ||
        (norm(a.item.text) < norm(b.item.text) ? -1 : 1)
    )
    .map((r) => r.item);
}
