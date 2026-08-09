// SPDX-License-Identifier: AGPL-3.0-only
import { DEPTH_LABELS } from './depth.js';

// One global dial. Keyboard accessible (arrow keys on the range input), with
// an always-visible current-depth indicator.
export default function DepthDial({ depth, setDepth }) {
  return (
    <div className="dial" role="group" aria-label="Depth dial">
      <label htmlFor="depth-dial" className="dial-title">
        Depth {depth}/5
      </label>
      <input
        id="depth-dial"
        type="range"
        min="1"
        max="5"
        step="1"
        value={depth}
        onChange={(e) => setDepth(Number(e.target.value))}
        aria-valuetext={DEPTH_LABELS[depth]}
      />
      <span className="dial-label" aria-hidden="true">
        {DEPTH_LABELS[depth]}
      </span>
    </div>
  );
}
