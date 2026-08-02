# Logged design decisions (not built yet)

## Companion voice in shared space (spatial stages, 4+)

**Render-once, transmit-as-audio.** The owner's client synthesizes companion
speech (owner's key, owner's chosen voice) and transmits it through the same
audio channel as player voice chat. One render, one waveform, identical for
every listener; no listener needs any provider; cost lands on the companion's
owner; player-side mute/volume/block tools apply to companions automatically.
Never re-render companion speech per-listener — a character that sounds
different to everyone is not a character.

Extension (local-TTS addendum): the companion is its own audio source in
shared-space voice channels — natively mixed by the client, never a hijack of
the owner's microphone. The virtual-audio-cable pattern is the interim DIY;
native mixing is the design.
