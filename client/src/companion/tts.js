// SPDX-License-Identifier: AGPL-3.0-only
// TTS: the companion speaks. Baseline is the Web Speech API — free, local,
// no key. Premium (ElevenLabs / OpenAI-compatible speech) and local
// endpoints (AllTalk-style, OpenAI speech shape at a custom URL) follow the
// same key discipline as the LLM: browser -> provider only, enforced by the
// same guard. Fallback honesty: if a card's voice provider is unavailable,
// fall back to the baseline WITH a visible notice — never silently swap a
// character's voice.

import { guardProviderUrl, KeyPrivacyError } from './providers.js';

export function buildTTSRequest({ voice, keys = {}, text }) {
  const provider = voice?.provider;
  if (provider === 'elevenlabs') {
    if (!keys.elevenlabs) throw new Error('No ElevenLabs key in settings.');
    return {
      url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voice)}`,
      headers: { 'content-type': 'application/json', 'xi-api-key': keys.elevenlabs },
      body: { text, model_id: voice.model || 'eleven_multilingual_v2' }
    };
  }
  if (provider === 'openai' || provider === 'local') {
    const base = (provider === 'local' ? voice.endpoint : 'https://api.openai.com/v1') || '';
    if (!base) throw new Error('This voice needs an endpoint URL.');
    const key = provider === 'local' ? keys.local || '' : keys.openai;
    if (provider === 'openai' && !key) throw new Error('No OpenAI key in settings.');
    return {
      url: `${base.replace(/\/+$/, '')}/audio/speech`,
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {})
      },
      body: { model: voice.model || 'tts-1', voice: voice.voice || 'alloy', input: text }
    };
  }
  throw new Error(`Unknown TTS provider "${provider}".`);
}

function speakWebSpeech(text, voice = {}) {
  return new Promise((resolve, reject) => {
    if (!globalThis.speechSynthesis) return reject(new Error('Web Speech unavailable.'));
    const u = new SpeechSynthesisUtterance(text);
    if (voice.rate) u.rate = voice.rate;
    if (voice.pitch) u.pitch = voice.pitch;
    if (voice.voice) {
      const match = speechSynthesis.getVoices().find((v) => v.name === voice.voice);
      if (match) u.voice = match;
    }
    u.onend = resolve;
    u.onerror = () => reject(new Error('Web Speech failed.'));
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

// Speaks pass-2 output only (already fidelity-gated). Returns the engine used.
export async function speak({ text, voice, keys, appOrigin, fetchImpl = fetch, onNotice = () => {} }) {
  const provider = voice?.provider || 'webspeech';
  if (provider === 'webspeech') {
    await speakWebSpeech(text, voice || {});
    return 'webspeech';
  }
  try {
    const req = buildTTSRequest({ voice, keys, text });
    guardProviderUrl(req.url, appOrigin);
    const res = await fetchImpl(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body)
    });
    if (!res.ok) throw new Error(`TTS provider error ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
    return provider;
  } catch (e) {
    if (e instanceof KeyPrivacyError) throw e; // never fall back past a privacy refusal
    onNotice(
      `${voice?.provider} voice unavailable (${e.message}) — using the baseline voice instead.`
    );
    await speakWebSpeech(text, {});
    return 'webspeech-fallback';
  }
}
