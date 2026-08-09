# SPDX-License-Identifier: AGPL-3.0-only
# Truth Onion — public read-only demo image (release decision record: Fly.io,
# but the file is a portable OCI build — the host stays a twelve-line decision).
#
# Build from the REPO ROOT (fly.toml at the root points here):
#   docker build -f deploy/Dockerfile -t truth-onion-demo .
#   docker run -p 3111:3111 truth-onion-demo
#
# THE DEPLOY GATE LIVES IN THIS BUILD. `RUN npm test` runs the full suite —
# explicitly including demo D4 (the fetch proxy is ABSENT in demo mode) and
# D5 (the local engine keeps it) — and a red suite means no image exists to
# ship. A build that silently reacquires the fetch proxy fails loudly here,
# at build time, not in production.
#
# The pristine database is seeded AT IMAGE BUILD from the versioned fixtures
# in the repo (server/seed.js + exports/*.json, imported through the rules
# layer by scripts/build-demo.mjs). The runtime DB is EPHEMERAL — no VOLUME
# instruction, no mount — and resets to the pristine seed on every boot:
# persistence is client-side saves, by settled decision. The fetch proxy and
# therefore puppeteer/any browser binary are deliberately absent from the
# shipped demo (an open keyless fetcher is an abuse relay).

FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The gate: full suite, D4/D5 included. Red = no image.
RUN npm test
# Frontend build + pristine seed from the versioned fixtures.
RUN npm run build-demo

FROM node:24-alpine
WORKDIR /srv/app
COPY --from=build /src/demo/app /srv/app
COPY --from=build /src/demo/data/pristine.db /srv/data/pristine.db
RUN npm install --omit=dev
ENV DEMO_MODE=true
ENV ONION_DB=/srv/data/runtime.db
ENV DEMO_PRISTINE=/srv/data/pristine.db
ENV DEMO_RATE_LIMIT=120
# PUBLIC_ORIGIN and DEMO_REPO_URL are host configuration — see fly.toml [env].
EXPOSE 3111
CMD ["node", "server/index.js"]
