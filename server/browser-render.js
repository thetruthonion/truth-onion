// Headless-browser rendering fallback for the fetch proxy.
//
// Why: some pages (e.g. justice.gov /archives/opa/pr/ press releases) return
// HTTP 200 but an empty JS-rendered shell to a plain fetch — the body only
// exists after JavaScript runs. A quote check against the shell is
// inconclusive, so those sources could not be mechanically verified at all.
// This module drives the machine's INSTALLED Chromium browser (Edge ships
// with Windows; Chrome if present) via puppeteer-core — no downloaded browser
// binary, no new network surface beyond the page itself.
//
// SSRF discipline: callers must have already passed the main URL through
// blockedReason. On top of that, every subresource request the rendered page
// makes is intercepted and refused if it targets localhost / .local /
// .internal / a literal private IP — a JS-rendered page must not become a
// bridge into the internal network. (DNS-resolving every subresource host
// would be exhaustive but slow; literal checks cover the direct attacks, and
// the proxy itself never carries credentials.)

import fs from 'node:fs';
import net from 'node:net';
import puppeteer from 'puppeteer-core';
import { isPrivateIp } from './fetch-proxy.js';

const RENDER_TIMEOUT_MS = 25_000;

const BROWSER_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

export function findBrowserExecutable() {
  for (const p of BROWSER_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function privateTarget(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return true;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.localhost|.*\.internal|.*\.local)$/i.test(host)) return true;
  if (net.isIP(host) && isPrivateIp(host)) return true;
  return false;
}

// One shared browser process, launched lazily on first render and reused.
let browserPromise = null;
async function getBrowser() {
  const executablePath = findBrowserExecutable();
  if (!executablePath) return null;
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ executablePath, headless: true, args: ['--disable-gpu'] })
      .catch((e) => {
        browserPromise = null; // a failed launch must not poison future tries
        throw e;
      });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  if (b) await b.close().catch(() => {});
}

// Render one page in the real browser and return its post-JS HTML.
// Returns { ok, status, html, final_url } or { ok: false, reason }.
export async function renderPage(rawUrl, { timeoutMs = RENDER_TIMEOUT_MS } = {}) {
  if (privateTarget(rawUrl)) return { ok: false, reason: 'target refused by render guard' };
  let browser;
  try {
    browser = await getBrowser();
  } catch (e) {
    return { ok: false, reason: `browser launch failed: ${e.message}` };
  }
  if (!browser) return { ok: false, reason: 'no local Chrome/Edge found for browser rendering' };

  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // The rendered page must not reach into the internal network.
      if (privateTarget(req.url())) return req.abort().catch(() => {});
      return req.continue().catch(() => {});
    });
    const resp = await page.goto(rawUrl, { waitUntil: 'networkidle2', timeout: timeoutMs });
    const html = await page.content();
    return {
      ok: true,
      status: resp ? resp.status() : 0,
      html,
      final_url: page.url()
    };
  } catch (e) {
    return { ok: false, reason: e.name === 'TimeoutError' ? 'render timeout' : e.message };
  } finally {
    await page.close().catch(() => {});
  }
}
