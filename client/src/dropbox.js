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
export const FEEDBACK_EMAIL = 'truth.onionwright@gmail.com';

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
