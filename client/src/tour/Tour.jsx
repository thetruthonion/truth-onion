// SPDX-License-Identifier: AGPL-3.0-only
// The tour framework (2.96). THE SCRIPT NAVIGATES; THE COMPANION NARRATES.
// This component owns stops, order, highlighting, and every UI change —
// deterministically, from stops.js data via callbacks App hands it. The
// model never drives the UI; in keyed mode it only voices the grounding doc
// (tourNarrate) and answers in-stop questions. Keyless mode is the same
// stops, same order, written copy — no fake companion, ever.

import { useEffect, useRef, useState } from 'react';
import { TOUR_STOPS } from './stops.js';
import { narrateTourStop } from './tourNarrate.js';

export default function Tour({
  mode, // 'written' | 'companion'
  card,
  corePrompt,
  callModel,
  askInStop, // async (question, stop) => {text} — companion Q&A, existing pipeline
  applyStop, // (apply) => void — App executes the deterministic navigation
  onExit
}) {
  const [idx, setIdx] = useState(0);
  const [voice, setVoice] = useState(null); // narration result for this stop
  const [stage, setStage] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const stop = TOUR_STOPS[idx];

  // The panel must never sit on what a stop is showing: each stop carries a
  // default corner (panelPos) chosen away from its subject, and the whole
  // panel is draggable by its header — once the visitor moves it, their
  // spot wins for the rest of the tour.
  const [dragPos, setDragPos] = useState(null); // {left, top} after a drag
  const startDrag = (e) => {
    if (e.target.tagName === 'BUTTON') return; // header buttons still click
    e.preventDefault();
    const rect = rootRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const move = (ev) =>
      setDragPos({
        left: Math.max(4, Math.min(window.innerWidth - rect.width - 4, ev.clientX - dx)),
        top: Math.max(4, Math.min(window.innerHeight - 60, ev.clientY - dy))
      });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Entering a stop: the FRAMEWORK applies the navigation, then (keyed mode)
  // asks the companion to voice the doc.
  useEffect(() => {
    if (!stop) return;
    applyStop(stop.apply || {});
    setAnswer(null);
    setQuestion('');
    setVoice(null);
    setStage(null);
    if (mode !== 'companion') return;
    let live = true;
    setBusy(true);
    narrateTourStop({
      stop,
      card,
      corePrompt,
      callModel,
      onStage: (k, label) => live && setStage(label)
    })
      .then((v) => live && setVoice(v))
      .finally(() => {
        if (live) {
          setBusy(false);
          setStage(null);
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, mode]);

  useEffect(() => {
    // Highlight the stop's target; clean up when leaving.
    if (!stop?.highlight) return;
    const el = document.querySelector(stop.highlight);
    if (el) el.classList.add('tour-target');
    return () => el && el.classList.remove('tour-target');
  }, [stop]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [idx]);

  if (!stop) return null;
  const last = idx === TOUR_STOPS.length - 1;

  const ask = async () => {
    const q = question.trim();
    if (!q || busy || mode !== 'companion') return;
    setBusy(true);
    setAnswer(null);
    try {
      const out = await askInStop(q, stop, (k, label) => setStage(label));
      setAnswer(out);
    } catch (e) {
      setAnswer({ text: `That didn't work: ${e.message}`, rendered_by: 'system' });
    } finally {
      setBusy(false);
      setStage(null);
      setQuestion('');
    }
  };

  return (
    <div
      className={`tour-panel pos-${stop.panelPos || 'bottom-right'}${dragPos ? ' dragged' : ''}`}
      style={dragPos ? { left: dragPos.left, top: dragPos.top, right: 'auto', bottom: 'auto', transform: 'none' } : undefined}
      role="dialog"
      aria-label="Guided tour"
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowRight' && !last) setIdx(idx + 1);
        if (e.key === 'ArrowLeft' && idx > 0) setIdx(idx - 1);
        if (e.key === 'Escape') onExit(idx);
      }}
    >
      <div className="tour-head tour-drag" onPointerDown={startDrag} title="Drag to move this panel">
        <span className="drag-grip" aria-hidden="true">⠿</span>
        <strong>{stop.title}</strong>
        <span className="muted">
          {' '}
          · stop {idx + 1} of {TOUR_STOPS.length}
        </span>
        <button className="small" style={{ marginLeft: 'auto' }} onClick={() => onExit(idx)}>
          exit tour
        </button>
      </div>

      {mode === 'companion' ? (
        <>
          {busy && !voice && <div className="empty stage-indicator">…{stage || 'thinking'}…</div>}
          {voice && (
            <div className={`tour-copy${voice.plain ? ' plain' : ''}`}>
              {voice.rendered_by && voice.rendered_by !== 'core' && !voice.plain && (
                <div className="by">{voice.rendered_by}</div>
              )}
              {voice.text}
              {voice.notice && <div className="companion-notice">{voice.notice}</div>}
            </div>
          )}
        </>
      ) : (
        <div className="tour-copy">{stop.copy}</div>
      )}

      {stop.tryIt && (
        <div className="tour-try">
          <strong>Try it:</strong> {stop.tryIt}
        </div>
      )}

      {mode === 'companion' && (
        <div className="tour-ask">
          <input
            placeholder="Ask about this stop…"
            value={question}
            disabled={busy}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button className="small" disabled={busy || !question.trim()} onClick={ask}>
            ask
          </button>
          {answer && (
            <div className="tour-answer">
              {answer.rendered_by && answer.rendered_by !== 'system' && (
                <div className="by">{answer.rendered_by}</div>
              )}
              {answer.text}
            </div>
          )}
        </div>
      )}

      <div className="tour-nav">
        <button className="small" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          ← back
        </button>
        {!last ? (
          <button className="primary" onClick={() => setIdx(idx + 1)}>
            next →
          </button>
        ) : (
          <button className="primary" onClick={() => onExit(null)}>
            finish
          </button>
        )}
      </div>
    </div>
  );
}
