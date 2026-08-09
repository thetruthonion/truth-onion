// The anonymous drop box (client side). Contributions and feedback go to
// the SITE's Netlify Function — durable storage on the operator's site
// account, never the disposable demo host, never the app database.
//
// Anonymity, exactly as far as it is true: we don't ask who you are and
// don't retain anything that says — and the copy never claims more than
// that (transport metadata seen by the site's edge belongs to the host and
// is not copied into storage; the payload is the only thing persisted).
//
// If the endpoint is unreachable — site down, function not yet deployed —
// the callers say so plainly and offer the email fallback. Never a silent
// failure, never a fake success.

export const DROPBOX_URL = 'https://thetruthonion.org/api/dropbox';
export const FEEDBACK_EMAIL = 'contact@thetruthonion.org';

export const DROPBOX_ANONYMITY_LINE =
  "we don't ask who you are and don't retain anything that says";

export const DROPBOX_UNREACHABLE_MESSAGE =
  `The drop box can't be reached right now (the site may be down, or the box not yet deployed). Nothing was sent. Email works instead: ${FEEDBACK_EMAIL}.`;

async function post(body, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(DROPBOX_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    return { ok: false, unreachable: true, message: DROPBOX_UNREACHABLE_MESSAGE };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    return {
      ok: false,
      unreachable: false,
      message: json?.error || `The drop box refused (${res.status}).`
    };
  }
  return { ok: true, receipt: json?.receipt ?? null };
}

// Anonymous feedback: exactly the category and message are sent — no
// identity, no account, nothing else.
export function sendFeedback({ category, message }, fetchImpl = fetch) {
  return post({ kind: 'feedback', category, message }, fetchImpl);
}

// A save-file contribution: exactly the save file is sent — nothing else.
export function sendSave(save, fetchImpl = fetch) {
  return post({ kind: 'save', save }, fetchImpl);
}

// A dropped or picked save file, reduced to exactly what will be sent:
// the parsed contents. This function takes the file's TEXT alone — the
// filename, size, and anything else the browser knows about the file
// have no path into the payload, because nothing here can see them.
export function parseSaveFileText(text) {
  let save;
  try {
    save = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "That file isn't readable as JSON, so it can't be a save file. Nothing was sent."
    };
  }
  if (save === null || typeof save !== 'object' || Array.isArray(save)) {
    return {
      ok: false,
      message: "That file's JSON isn't a save object. Nothing was sent."
    };
  }
  return { ok: true, save };
}
