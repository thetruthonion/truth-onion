// Server-side fetch proxy for the companion's fetch_url / verify_source tools.
//
// Why server-side: a client-side fetch of a third-party page hits CORS (and,
// for some hosts, bot-blocks). The server can fetch public pages directly and
// return the text same-origin. This carries NO user key — it is public-page
// retrieval only — so the "keys never touch the server" promise is untouched.
//
// An open fetch proxy is an SSRF weapon, so every request is guarded: http/https
// only, and the resolved host must not be loopback, private, link-local, or a
// cloud-metadata address. Size- and time-capped.

import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 3_000_000;
const TEXT_CHARS = 12_000;
const TIMEOUT_MS = 12_000;
// Below this much stripped body text, a 200 is treated as an unreadable shell
// (JS-rendered SPA / soft-404) — a quote check against it is inconclusive,
// never a confident "not found". A real press release runs to thousands.
const MIN_READABLE_CHARS = 250;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '::') return true;
    if (norm.startsWith('fe80') || norm.startsWith('fc') || norm.startsWith('fd')) return true;
    // v4-mapped ::ffff:a.b.c.d
    const m = norm.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true; // unparseable → treat as blocked
}

// Returns null if fetchable, or a reason string if it must be blocked.
export async function blockedReason(rawUrl, { resolver = dns.lookup } = {}) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return 'not a valid URL';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return `scheme ${u.protocol} not allowed`;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.localhost|.*\.internal|.*\.local)$/i.test(host)) return `host ${host} is local`;
  // Literal IP in the URL:
  if (net.isIP(host)) {
    if (isPrivateIp(host)) return `host ${host} is a private/reserved address`;
    return null;
  }
  // Resolve and check EVERY address the host maps to (anti-rebinding-ish).
  try {
    const results = await resolver(host, { all: true });
    const addrs = Array.isArray(results) ? results : [results];
    for (const r of addrs) {
      const ip = r.address || r;
      if (isPrivateIp(ip)) return `host ${host} resolves to a private/reserved address`;
    }
  } catch {
    return `could not resolve host ${host}`;
  }
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}

// Strip tags to a rough text view for the model + the quote check.
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch a public page. Returns a mechanical result — reachable/status are
// facts, quote_found is a real substring check on the fetched text, not a
// model claim. `fetchImpl` is injectable for tests; `renderImpl` (optional)
// is a headless-browser fallback (see browser-render.js) used ONLY when the
// plain fetch yields an unreadable shell or a bot-block status.
export async function fetchPage(rawUrl, { quote, fetchImpl = fetch, resolver, renderImpl } = {}) {
  const reason = await blockedReason(rawUrl, resolver ? { resolver } : {});
  if (reason) {
    return { url: rawUrl, reachable: false, blocked: true, reason, status: 0 };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let page;
  try {
    const res = await fetchImpl(rawUrl, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: controller.signal
    });
    const raw = await res.text();
    const html = raw.length > MAX_BYTES ? raw.slice(0, MAX_BYTES) : raw;
    const text = toText(html);
    page = {
      status: res.status,
      ok: res.ok,
      final_url: res.url || rawUrl,
      html,
      text,
      via: 'fetch'
    };
  } catch (e) {
    clearTimeout(timer);
    return { url: rawUrl, reachable: false, status: 0, reason: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }

  // A page can return HTTP 200 yet be an empty shell — a JS-rendered SPA the
  // plain fetch can't execute, or a soft-404. We must NOT treat "couldn't
  // read it" as "the content isn't there": a false-negative verification is
  // as dangerous as a false positive. When the shell (or a bot-block 403/429)
  // is detected and a renderer is available, retry in a REAL browser; only if
  // that also fails does the result stay inconclusive (quote_found: null).
  let readable = page.ok && page.text.length >= MIN_READABLE_CHARS;
  const shouldRender = !readable && (page.ok || page.status === 403 || page.status === 429);
  let renderReason = null;
  if (shouldRender && renderImpl) {
    const r = await renderImpl(rawUrl);
    if (r && r.ok) {
      const rHtml = r.html.length > MAX_BYTES ? r.html.slice(0, MAX_BYTES) : r.html;
      const rText = toText(rHtml);
      if (rText.length >= MIN_READABLE_CHARS) {
        page = { status: r.status || page.status, ok: true, final_url: r.final_url || page.final_url, html: rHtml, text: rText, via: 'browser' };
        readable = true;
      } else {
        renderReason = 'browser render also produced no readable text';
      }
    } else {
      renderReason = r && r.reason ? `browser render failed: ${r.reason}` : 'browser render failed';
    }
  }

  const result = {
    url: rawUrl,
    final_url: page.final_url,
    status: page.status,
    ok: page.ok,
    reachable: page.ok,
    readable,
    via: page.via,
    title: extractTitle(page.html),
    text: page.text.slice(0, TEXT_CHARS)
  };
  if (!readable) {
    result.reason = page.ok
      ? `no readable text (likely JavaScript-rendered or a shell)${renderReason ? `; ${renderReason}` : ' — plain fetch cannot read this page; a real browser is needed'}`
      : `status ${page.status}${renderReason ? `; ${renderReason}` : ''}`;
  }
  if (quote != null && String(quote).trim()) {
    result.quote = quote;
    if (!readable) {
      result.quote_found = null; // inconclusive — the page was not readable
      result.verified = false;
    } else {
      const needle = String(quote).toLowerCase().replace(/\s+/g, ' ').trim();
      const hay = page.text.toLowerCase().replace(/\s+/g, ' ');
      result.quote_found = hay.includes(needle);
      result.verified = !!result.quote_found;
    }
  }
  return result;
}
