// SPDX-License-Identifier: AGPL-3.0-only
// Fetch-proxy tests: the SSRF guard, the browser-header fetch, and the
// MECHANICAL quote check that makes verification a fact, not a model claim.

import assert from 'node:assert/strict';
import { blockedReason, isPrivateIp, fetchPage } from '../server/fetch-proxy.js';
import { renderPage } from '../server/browser-render.js';

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}

console.log('\nFetch proxy — SSRF-guarded, mechanical verification\n');

const publicResolver = async () => [{ address: '93.184.216.34' }]; // example.com-ish

await test('P1. private/reserved IPs are recognized', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '172.16.0.1', '::1', '0.0.0.0']) {
    assert.equal(isPrivateIp(ip), true, `${ip} must be private`);
  }
  for (const ip of ['93.184.216.34', '8.8.8.8', '1.1.1.1']) {
    assert.equal(isPrivateIp(ip), false, `${ip} must be public`);
  }
});

await test('P2. the SSRF guard blocks localhost, private hosts, metadata, and bad schemes', async () => {
  assert.match(await blockedReason('http://localhost:3111/api/topics/1', {}), /local/);
  assert.match(await blockedReason('http://127.0.0.1/x', {}), /private|reserved/);
  assert.match(await blockedReason('http://169.254.169.254/latest/meta-data/', {}), /private|reserved/);
  assert.match(await blockedReason('file:///etc/passwd', {}), /scheme/);
  assert.match(await blockedReason('ftp://example.com', {}), /scheme/);
  assert.match(await blockedReason('http://intranet.local/', {}), /local/);
  // A host that RESOLVES to a private address is blocked (rebinding guard).
  assert.match(
    await blockedReason('http://sneaky.example', { resolver: async () => [{ address: '10.1.2.3' }] }),
    /private|reserved/
  );
});

await test('P3. a public URL passes the guard', async () => {
  assert.equal(await blockedReason('https://www.justice.gov/x', { resolver: publicResolver }), null);
  assert.equal(await blockedReason('https://8.8.8.8/', {}), null); // literal public IP
});

await test('P4. fetchPage returns text + title from a public page', async () => {
  const fetchStub = async () => ({
    ok: true,
    status: 200,
    url: 'https://www.justice.gov/x',
    text: async () => '<html><head><title>United States v. Purdue Pharma L.P.</title></head><body>Judge Madeline Cox Arleo accepted the plea.</body></html>'
  });
  const page = await fetchPage('https://www.justice.gov/x', { fetchImpl: fetchStub, resolver: publicResolver });
  assert.equal(page.reachable, true);
  assert.equal(page.status, 200);
  assert.match(page.title, /Purdue Pharma/);
  assert.match(page.text, /Madeline Cox Arleo/);
});

await test('V1. quote check is MECHANICAL: present → verified, absent → not', async () => {
  const filler = 'The United States District Court for the District of New Jersey convened for the sentencing hearing. '.repeat(6);
  const body = `<html><body>${filler} the court accepted the plea agreement and sentenced Purdue Pharma L.P. ${filler}</body></html>`;
  const fetchStub = async () => ({ ok: true, status: 200, url: 'u', text: async () => body });
  const yes = await fetchPage('https://www.justice.gov/x', {
    fetchImpl: fetchStub,
    resolver: publicResolver,
    quote: 'accepted the plea agreement and sentenced Purdue Pharma'
  });
  assert.equal(yes.quote_found, true);
  assert.equal(yes.verified, true);
  const no = await fetchPage('https://www.justice.gov/x', {
    fetchImpl: fetchStub,
    resolver: publicResolver,
    quote: 'Purdue collected exactly $225 million'
  });
  assert.equal(no.quote_found, false);
  assert.equal(no.verified, false);
});

await test('V2. a blocked URL is unreachable, never verified (no laundering failure into confirmation)', async () => {
  const page = await fetchPage('http://169.254.169.254/latest/', { quote: 'anything', fetchImpl: async () => ({}) });
  assert.equal(page.reachable, false);
  assert.equal(page.blocked, true);
  assert.equal(page.verified, undefined, 'a blocked fetch can never be verified');
});

await test('V4. a 200 EMPTY SHELL (JS-rendered) is inconclusive, NEVER a confident "not found"', async () => {
  // A page that returns 200 but essentially no body text — a JS-rendered SPA
  // or soft-404. A quote check must be inconclusive, not a false negative.
  const shell = '<html><head><title>&nbsp;</title></head><body><div id="app"></div></body></html>';
  const fetchStub = async () => ({ ok: true, status: 200, url: 'u', text: async () => shell });
  const page = await fetchPage('https://www.justice.gov/archives/opa/pr/x', {
    fetchImpl: fetchStub,
    resolver: publicResolver,
    quote: 'the claims resolved by the civil settlements are allegations only'
  });
  assert.equal(page.readable, false, 'an empty shell is not readable');
  assert.equal(page.quote_found, null, 'quote check on an unreadable page is inconclusive (null), not false');
  assert.equal(page.verified, false, 'never verified');
  assert.match(page.reason, /javascript|readable|browser/i, 'reason explains the shell');
});

await test('V5. a READABLE page that genuinely lacks the quote is a real "false" (unchanged)', async () => {
  const body = '<html><body>' + 'The court accepted the plea and sentenced the company. '.repeat(20) + '</body></html>';
  const fetchStub = async () => ({ ok: true, status: 200, url: 'u', text: async () => body });
  const page = await fetchPage('https://www.justice.gov/x', {
    fetchImpl: fetchStub,
    resolver: publicResolver,
    quote: 'Purdue collected exactly $225 million'
  });
  assert.equal(page.readable, true, 'a real article is readable');
  assert.equal(page.quote_found, false, 'a readable page missing the quote is a genuine false');
  assert.equal(page.verified, false);
});

await test('B1. a JS shell FALLS BACK to the headless browser and the quote verifies mechanically', async () => {
  const shell = '<html><head><title>&nbsp;</title></head><body><div id="app"></div></body></html>';
  const filler = 'The Department of Justice announced the global resolution of its investigations. '.repeat(6);
  const rendered = `<html><head><title>Justice Department Announces Global Resolution</title></head><body>${filler} the claims resolved by the civil settlements are allegations only ${filler}</body></html>`;
  let renderCalls = 0;
  const page = await fetchPage('https://www.justice.gov/archives/opa/pr/x', {
    fetchImpl: async () => ({ ok: true, status: 200, url: 'u', text: async () => shell }),
    renderImpl: async () => {
      renderCalls++;
      return { ok: true, status: 200, html: rendered, final_url: 'u' };
    },
    resolver: publicResolver,
    quote: 'the claims resolved by the civil settlements are allegations only'
  });
  assert.equal(renderCalls, 1, 'the browser fallback ran');
  assert.equal(page.via, 'browser', 'the result says HOW the page was read');
  assert.equal(page.readable, true);
  assert.equal(page.quote_found, true);
  assert.equal(page.verified, true, 'the quote verifies against the RENDERED page');
  assert.match(page.title, /Global Resolution/);
});

await test('B2. when the browser render ALSO fails, the result stays inconclusive — never a false "not found"', async () => {
  const shell = '<html><body><div id="app"></div></body></html>';
  const page = await fetchPage('https://www.justice.gov/archives/opa/pr/x', {
    fetchImpl: async () => ({ ok: true, status: 200, url: 'u', text: async () => shell }),
    renderImpl: async () => ({ ok: false, reason: 'render timeout' }),
    resolver: publicResolver,
    quote: 'allegations only'
  });
  assert.equal(page.readable, false);
  assert.equal(page.quote_found, null, 'still inconclusive');
  assert.equal(page.verified, false);
  assert.match(page.reason, /render/i, 'the reason reports the render failure');
});

await test('B3. a readable plain fetch NEVER invokes the browser (fast path stays fast)', async () => {
  const body = '<html><body>' + 'A perfectly ordinary server-rendered page with plenty of text. '.repeat(10) + '</body></html>';
  let renderCalls = 0;
  const page = await fetchPage('https://www.justice.gov/x', {
    fetchImpl: async () => ({ ok: true, status: 200, url: 'u', text: async () => body }),
    renderImpl: async () => {
      renderCalls++;
      return { ok: true, status: 200, html: body };
    },
    resolver: publicResolver
  });
  assert.equal(page.readable, true);
  assert.equal(page.via, 'fetch');
  assert.equal(renderCalls, 0, 'no browser for a page the plain fetch already read');
});

await test('B4. a bot-block 403 triggers the browser fallback', async () => {
  const filler = 'United States Attorney announces resolution of the misbranding case. '.repeat(6);
  const page = await fetchPage('https://media.defense.example/2007-plea', {
    fetchImpl: async () => ({ ok: false, status: 403, url: 'u', text: async () => 'Forbidden' }),
    renderImpl: async () => ({ ok: true, status: 200, html: `<html><body>${filler}</body></html>` }),
    resolver: publicResolver,
    quote: 'resolution of the misbranding case'
  });
  assert.equal(page.via, 'browser');
  assert.equal(page.reachable, true, 'the browser got through');
  assert.equal(page.verified, true);
});

await test('B5. the render guard refuses private/internal targets without launching anything', async () => {
  for (const url of ['http://localhost:3111/api/topics/1', 'http://10.0.0.5/x', 'http://169.254.169.254/latest/', 'file:///C:/secrets.txt']) {
    const r = await renderPage(url);
    assert.equal(r.ok, false, `${url} must be refused`);
    assert.match(r.reason, /render guard/, `${url} refused by the guard, not by a failed launch`);
  }
});

await test('V3. a real error (e.g. network) reports unreachable, not verified', async () => {
  const page = await fetchPage('https://down.example/x', {
    quote: 'x',
    resolver: publicResolver,
    fetchImpl: async () => {
      throw new Error('ECONNREFUSED');
    }
  });
  assert.equal(page.reachable, false);
  assert.ok(!page.verified);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
