// Builds the self-contained, read-only demo package in demo/.
// Usage: npm run build-demo

import { execSync } from 'node:child_process';
import {
  rmSync,
  mkdirSync,
  cpSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  existsSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demo = join(root, 'demo');

console.log('1/5 Building the frontend…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('2/5 Assembling demo/app…');
rmSync(demo, { recursive: true, force: true });
mkdirSync(join(demo, 'app', 'server'), { recursive: true });
mkdirSync(join(demo, 'data'), { recursive: true });
for (const f of ['index.js', 'db.js', 'rules.js', 'service.js', 'seed.js', 'seed-uap.js', 'seed-aieval.js', 'timemachine.js', 'claimpages.js', 'sourcelinks.js', 'history.js', 'sandbox.js']) {
  copyFileSync(join(root, 'server', f), join(demo, 'app', 'server', f));
}
// 2.99a: sandbox copies restore from the same fixture the pristine DB was
// built from — the package carries it so copy-on-first-write works hosted.
mkdirSync(join(demo, 'app', 'exports'), { recursive: true });
copyFileSync(
  join(root, 'exports', 'curated-record.history.json'),
  join(demo, 'app', 'exports', 'curated-record.history.json')
);
// The companion's immutable core prompt ships in the bundle; copy the source
// file too so demo users can inspect what the hash covers.
copyFileSync(join(root, 'sidekick-prompt.md'), join(demo, 'app', 'sidekick-prompt.md'));
cpSync(join(root, 'client', 'dist'), join(demo, 'app', 'client', 'dist'), { recursive: true });
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
writeFileSync(
  join(demo, 'app', 'package.json'),
  JSON.stringify(
    {
      name: 'truth-onion-demo',
      version: rootPkg.version,
      private: true,
      type: 'module',
      description: 'Truth Onion — read-only showcase. Reading is the demo.',
      scripts: { start: 'node server/index.js' },
      dependencies: { express: rootPkg.dependencies.express }
    },
    null,
    2
  )
);

console.log('3/5 Restoring the pristine database from the curated history fixture…');
// The pristine DB is a RESTORE of the exported curated record — original
// timestamps, reasons, and actors preserved verbatim (fix session
// 2026-08-01). Nothing is stamped at build time: the time machine, epoch
// banner, and derived/log honesty markers all read real recorded time.
const pristine = join(demo, 'data', 'pristine.db');
rmSync(pristine, { force: true });
process.env.ONION_DB = pristine;
const { openDb } = await import(`file://${join(root, 'server', 'db.js').replace(/\\/g, '/')}`);
const { restoreHistory } = await import(
  `file://${join(root, 'server', 'history.js').replace(/\\/g, '/')}`
);
const fixturePath = join(root, 'exports', 'curated-record.history.json');
if (!existsSync(fixturePath)) {
  console.error(
    'exports/curated-record.history.json not found — run scripts/export-history.mjs against the live DB first.'
  );
  process.exit(1);
}
const db = openDb(pristine);
const restored = restoreHistory(db, JSON.parse(readFileSync(fixturePath, 'utf8')));
console.log(
  `   Restored ${restored.claims} claims, ${restored.sources} sources, ${restored.events} events (${restored.corrections} disclosed encoding corrections).`
);
for (const t of restored.topics) {
  console.log(`   ${t.name}: recorded history ${t.lo} → ${t.hi}`);
}
db.close();

console.log('4/5 Writing README, QUICKSTART, and run scripts…');
copyFileSync(join(root, 'README.md'), join(demo, 'README.md'));
writeFileSync(
  join(demo, 'QUICKSTART.md'),
  `# Truth Onion — read-only showcase

1. Install Node.js 22.5+ (https://nodejs.org).
2. Run \`run.bat\` (Windows) or \`./run.sh\` (macOS/Linux) — it installs the one dependency and starts the demo.
3. Your browser opens to the onion: the solid sphere is what's ESTABLISHED about MKUltra. Turn the depth dial to reveal weaker tiers.
4. Click any tile or ring node for its evidence, placement reason, and challenge history. Switch topics and the 2D/3D view in the header.
5. This showcase is read-only, enforced server-side. Clone the repo to run the full engine — and try to cheat it yourself.
`
);
writeFileSync(
  join(demo, 'run.bat'),
  `@echo off\r
cd /d "%~dp0app"\r
if not exist node_modules (\r
  echo Installing dependencies...\r
  call npm install --omit=dev\r
)\r
set "DEMO_MODE=true"\r
set "ONION_DB=%~dp0data\\runtime.db"\r
set "DEMO_PRISTINE=%~dp0data\\pristine.db"\r
start "" cmd /c "timeout /t 2 >nul & start "" http://localhost:3111"\r
node server\\index.js\r
`
);
writeFileSync(
  join(demo, 'run.sh'),
  `#!/bin/sh
cd "$(dirname "$0")/app"
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --omit=dev
fi
export DEMO_MODE=true
export ONION_DB="$(cd .. && pwd)/data/runtime.db"
export DEMO_PRISTINE="$(cd .. && pwd)/data/pristine.db"
( sleep 2; open http://localhost:3111 2>/dev/null || xdg-open http://localhost:3111 2>/dev/null ) &
node server/index.js
`
);

// The hosted variant (deploy/Dockerfile, root fly.toml) is AUTHORED IN THE
// REPO, not generated here — the deploy gate and the no-volume rule are
// release decisions pinned by tests/release.test.mjs, and a build script
// overwriting them would un-pin them silently.
console.log('5/5 Deploy artifacts are checked in: deploy/Dockerfile, fly.toml, deploy/README.md.');

console.log('\nDemo package complete: demo/ (hosted build: docker build -f deploy/Dockerfile .).');
