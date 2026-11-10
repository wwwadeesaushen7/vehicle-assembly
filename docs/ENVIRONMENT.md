# Reusable environment setup

Use the existing `/workspace/vehicle-assembly` checkout. Cloud tasks are already
isolated; do not create a Git worktree unless the user explicitly requests one.

## Install or refresh

```sh
set -eu
cd /workspace/vehicle-assembly
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --no-audit
npm run build
```

The project-local npm cache is ignored by Git. The environment needs HTTPS access
to registry.npmjs.org and the existing GitHub Git proxy. No credentials or runtime
environment variables are required for the web workflow. Verification remains
on. Native packaging additionally needs platform SDKs and artifact hosts.

## Start in each new task

Processes do not survive an environment snapshot. From the existing checkout:

```sh
npm run dev -- --port 5173
```

Keep the process running in a terminal session. Check that an internal HTTP GET
returns the Formworks HTML, then run the browser test for functional validation:

```sh
curl --fail http://127.0.0.1:5173/
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

For a deployment check, run `npm run build`, start `npm run preview -- --port 4173`,
and run `TEST_BASE_URL=http://127.0.0.1:4173 npm run test:browser`. Browser tests use
isolated profiles and do not touch player saves in an existing browser session.

Generated outputs, installed modules and test artifacts are ignored. Do not claim
native installer, physical-device or fresh cloud snapshot validation from web
checks. See README for Windows and Android prerequisites.
