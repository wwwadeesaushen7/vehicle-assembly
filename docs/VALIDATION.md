# Verified first playable

Validation ran on the managed Linux environment with Node 24.22.1, Playwright
1.56.1 and system Chromium using software WebGL. No physical mobile device or
Windows execution environment was used.

- `npm test`: 21 tests passed across assembly, save validation and collection snapshots.
- `npm run build`: TypeScript checks and production Vite/PWA generation passed.
- Desktop browser checks: all 26 components assembled through the UI; invalid
  placement/rotation/tool combinations rejected; prerequisite-safe removal,
  undo/redo, garage settings, engine start, driving, export/import, save/reload
  and opening a completed collection snapshot verified.
- `TEST_SUITE=mobile TEST_BASE_URL=http://127.0.0.1:4173 npm run test:browser`:
  landscape and portrait layouts, touch assembly, orbit, pinch zoom and two-finger
  pan passed on the final production build with no browser errors. Mobile checks
  were rerun separately after correcting multi-touch handling.
- `TEST_BASE_URL=http://127.0.0.1:4173 npm run test:input`: actual mesh dragging,
  precision placement and read-only Inspection keyboard handling passed.
- `npm run test:quality`: Low, Medium, High and Ultra rendered without browser errors.
- `npm run test:offline`: service-worker activation, offline reload, WebGL startup
  and an assembly operation passed.
- `npx cap sync android`: generated Android project synchronized with the web build.
- `node --check electron/main.cjs`: desktop entry-point syntax passed. This is not
  an Electron runtime or Windows installer test.

Screenshots and logs are retained under ignored `artifacts/`. Physical-device
performance, native APK/NSIS builds, signing, installer execution, public HTTPS
hosting, production asset fidelity and cloud snapshot restoration remain unverified.

The cloud configuration service rejected draft reads and could not confirm the
setup/start draft write. Reusable commands are saved locally in `ENVIRONMENT.md`;
configuration publication has not been performed.
