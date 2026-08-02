// SHA-256 hex of the core prompt, displayed in the UI so a modified prompt
// is visible, not hidden. Works in browsers and Node (globalThis.crypto).

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
