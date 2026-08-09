# Security Policy

## Reporting a vulnerability

Email **contact@thetruthonion.org**.

The Contributing guide invites adversarial testing of the engine — attempts to
launder weak claims inward, forge circular support, tamper with exports, or
bypass the write-time rules. If your finding lets anyone actually do one of
those things against a live instance, or exposes data the platform promises
not to hold, report it here privately rather than filing a public issue.

What to include:

- What the engine claims (the rule or guarantee as documented) and what you
  were able to make it do instead.
- Steps to reproduce, ideally against a fresh `npm run reset` seed.
- Whether the issue is exploitable by an anonymous caller of a hosted
  instance, or requires local access.
- Where the issue involves engine state, the demo save file (export) that
  reproduces it — the same strain data the website drop box collects. A save
  file that shows the rules bending is the most useful artifact a report can
  carry.

You will get an acknowledgment, and a fix or a documented reason before any
public disclosure is coordinated. Findings that survive review are exactly the
contributions this project exists to attract — credit under your handle,
if you want it, in the release notes.

## What this channel holds

A vulnerability report necessarily hands us your email address and whatever
you attach. Stated plainly:

- Report correspondence lives in the monitored contact inbox and is used for
  nothing but working the report. Credit is opt-in; nothing identifying you
  is published without your consent.
- Commit sign-offs are the opposite case: a `Signed-off-by` line is
  permanently public in the git history — which is why pseudonymous
  sign-offs are welcome (see `CONTRIBUTING.md`).
- The website drop box stores the submitted save file only; it records no
  sender metadata, and contact is opt-in.
- Nothing else is requested, so nothing else is held. "Not asked, not
  retained" is the only anonymity claim made here.

## Scope notes

- The demo package intentionally excludes the fetch proxy; reports that the
  demo's `fetch_url` / `verify_source` return errors are expected behavior,
  not vulnerabilities. The full feature set, fetch proxy included, runs from
  this repository — test proxy-path findings against a local clone.
- BYOK keys are client-side only. Any path by which a provider key could
  reach the server is a critical finding.
