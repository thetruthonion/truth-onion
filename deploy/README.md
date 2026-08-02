# Hosting the demo (Fly.io)

The release decision record picks Fly.io; the Dockerfile here is a portable
OCI build, so the host remains a twelve-line decision if that ever changes.

## What the artifact is

- **Read-only demo, enforced server-side** (`DEMO_MODE=true`): every mutation
  answers 403; rate limiting (`DEMO_RATE_LIMIT`, default 120 req/min/IP)
  covers every `/api` route and every `/claim` page.
- **Ephemeral database, by design.** The pristine seed is built **at image
  build** from the versioned fixtures in the repo; the runtime DB resets to
  it on every deploy and machine restart. There is **no volume anywhere** —
  do not add one. Visitor persistence is client-side saves (settled
  decision); the app database never holds visitor submissions.
- **The fetch proxy is deliberately absent** from the demo (D4 pins it), so
  no puppeteer/Chromium/browser binary is needed in the container. The
  companion's `fetch_url`/`verify_source` surface the showcase message
  instead.
- **The deploy gate is inside the image build**: `RUN npm test` runs the
  full suite (D4/D5 included). A red suite means no image ships.

## Operator flow

Run from the repo root, logged into the Fly account created under the
monitored thetruthonion.org address (MFA on):

```bash
fly launch --copy-config --no-deploy
```

```bash
fly deploy
```

`fly launch` creates the app and asks for a region; `--copy-config` keeps
the checked-in `fly.toml` (root of the repo). `fly deploy` builds the image
— test gate and seed included — and ships it. After DNS: set
`PUBLIC_ORIGIN` (and `DEMO_REPO_URL` once the repo is public) in
`fly.toml` `[env]` and redeploy.

## Cost guardrails (recommended)

- **Spend alert: set $10/month in the Fly dashboard** (Billing → Spending
  notifications). The baseline — one shared-cpu-1x/512MB machine that stops
  when idle — sits comfortably under that; the alert exists so a surprise
  (traffic spike, runaway restart loop) is a notification, not an invoice.
- **Test windows: size up for the window, then destroy.** Fly bills by the
  hour, so a load test or launch-day window can run bigger honestly:

  ```bash
  fly scale vm shared-cpu-2x --memory 1024
  ```

  and afterwards return to baseline:

  ```bash
  fly scale vm shared-cpu-1x --memory 512
  ```

  A machine scaled up for an afternoon costs cents; one forgotten for a
  month is the whole budget line. Scale back down (or `fly machine destroy`
  spares) when the window closes.

## Local smoke test (no Fly account needed)

```bash
docker build -f deploy/Dockerfile -t truth-onion-demo .
```

```bash
docker run -p 3111:3111 truth-onion-demo
```

Then http://localhost:3111 — three topics, every write 403, `/api/fetch`
404, `/claim/1` serves the document.
