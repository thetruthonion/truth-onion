// The time scrubber (2.95): the depth dial's sibling axis. Renders the topic
// at any past moment, computed from the event log alone. Same legibility
// standard as the dial — the control shows exactly what it is doing: an
// obvious Now position, a visible current-timestamp readout, and an honest
// epoch boundary ("recorded history begins here") behind which every view is
// a reconstruction and says so. A filter that hid its own filtering would be
// a lie.

import { useMemo } from 'react';
import { formatTs, tsToMs, msToTs } from './timeState.js';

export default function TimeScrubber({ epoch, earliest, value, onChange }) {
  // Domain: [earliest recorded/derived moment, now]. `value` null = Now.
  const nowMs = useMemo(() => Date.now(), [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const minMs = earliest ? tsToMs(earliest) : nowMs - 86400000;
  const epochMs = epoch ? tsToMs(epoch) : null;
  const atMs = value ? tsToMs(value) : nowMs;
  const span = Math.max(1, nowMs - minMs);
  const epochPct = epochMs ? Math.min(100, Math.max(0, ((epochMs - minMs) / span) * 100)) : null;
  const preEpoch = value != null && epochMs != null && atMs < epochMs;

  return (
    <div className={`time-scrubber${value != null ? ' scrubbed' : ''}`}>
      <span className="dial-title" title="Render the topic as of a past moment — from the event log alone">
        Time
      </span>
      <div className="scrub-track">
        {epochPct != null && epochPct > 0 && (
          <div
            className="scrub-preepoch"
            style={{ width: `${epochPct}%` }}
            title="Before the log epoch: reconstructions from self-timestamped records — incomplete by nature"
          />
        )}
        <input
          type="range"
          min={minMs}
          max={nowMs}
          step={1000}
          value={atMs}
          aria-label="Time scrubber"
          onChange={(e) => {
            const ms = Number(e.target.value);
            // The top of the track IS Now — no timestamp pretends to be it.
            onChange(ms >= nowMs - 1500 ? null : msToTs(ms));
          }}
        />
      </div>
      <span className="dial-label scrub-label">
        {value == null ? 'Now' : formatTs(value)}
        {preEpoch && ' · before recorded history'}
      </span>
      {value != null && (
        <button className="small" onClick={() => onChange(null)} title="Return to the present">
          now
        </button>
      )}
    </div>
  );
}
