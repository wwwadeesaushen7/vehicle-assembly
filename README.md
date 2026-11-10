# Formworks — Vehicle Assembly

A playable, local-first 3D assembly sandbox built with React, TypeScript, Vite and
Babylon.js. The first milestone features an original 26-component FW-01 coupe in a
customizable home workshop. The meshes are original procedural demo assets, not
photorealistic manufacturer models.

## Run the web game

Requires Node **22.18+** (Node 24.22.1 used for validation) and npm.

```sh
git clone https://github.com/wwwadeesaushen7/vehicle-assembly.git
cd vehicle-assembly
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci
npm run dev -- --port 5173
```

Open the address printed by Vite on your own development machine. On hosted
systems, use the host's supported access mechanism. The onboarding interface does
not provide localhost preview links. On Windows PowerShell, set
`$env:ELECTRON_SKIP_BINARY_DOWNLOAD="1"` before `npm ci` for a web-only install.

Choose **Enter the workshop → Start a new build**. Select a component, move it
using Drag part or the X/Y/Z controls, rotate to align it, and snap it into its
socket. **Guide to mount** places a component near the socket. Choose the specified
tool and tighten every fastener. Dependencies and tool checks also apply in Free
Assembly mode. Inspection mode disables assembly operations.

Use Vehicle diagnostics after completing all systems to start the engine, enter
the basic test area, or add the completed car to the collection. The test area
uses kinematic acceleration/steering, not a physics-based driving model.

## Verification

```sh
npm test                 # assembly and validated save logic
npm run typecheck
npm run build            # production web bundle + PWA service worker
npm run preview -- --port 4173
# In another terminal, with a local Chromium installed:
CHROMIUM_PATH=/usr/bin/chromium TEST_BASE_URL=http://127.0.0.1:4173 npm run test:browser
```

For focused regression checks against a running production preview, use
`TEST_BASE_URL=http://127.0.0.1:4173 npm run test:input` for 3D dragging and
read-only inspection, and `npm run test:offline` for service-worker offline
startup. `TEST_SUITE=mobile` limits the main browser suite to mobile emulation.

The browser suite performs a complete 26-part build through the UI, verifies
invalid placement/tool rejection, rotation, snapping, undo/redo, garage settings,
diagnostics, starting/driving, export, save/reload, camera interaction and mobile
layout/touch input. Screenshots and logs go into ignored `artifacts/`.
Mobile browser emulation is not real-device validation.

## Controls

| Action         | Input                                                     |
| -------------- | --------------------------------------------------------- |
| Orbit          | Left drag / one-finger drag                               |
| Pan            | Right drag / two-finger drag                              |
| Zoom           | Wheel / pinch / on-screen + and −                         |
| Select         | Component list or click mesh                              |
| Move component | Drag part mode or X/Y/Z buttons; arrows move X/Z by 10 cm |
| Rotate / focus | R (configurable in settings) / F                          |
| Undo / redo    | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z                             |
| Save           | Ctrl/Cmd+S or save button                                 |
| Test driving   | WASD, arrows, or on-screen press-and-hold buttons         |

## Persistence and customization

Projects autosave locally after edits. Completed collection entries retain a separate assembly snapshot, so starting another project does not erase the finished build. Save captures the camera as well. Export
and import JSON backups in Settings. Versioned saves validate known part IDs,
dependency order, fasteners, transforms, preferences and garage data. Storage
errors are reported; export backups before clearing browser/app data. No account,
server, secrets or cloud service is needed for this milestone.

The home workshop supports wall and cabinet colors, three floor finishes and
lighting intensity. Low/Medium/High/Ultra adjust render resolution, shadows,
postprocessing and ambient occlusion (Ultra/WebGL 2). Touch devices default to
Low, with simpler initial wheel geometry. Low-detail geometry is selected on
scene creation; reload after saving Low if you also want that geometry reduction.

## Platforms and releases

- **Web/PWA:** deploy `dist/` to HTTPS static hosting. The application uses relative
  asset URLs and precaches its shell and rendering modules. Offline use requires
  one successful online load and service-worker activation. An install button
  appears only when the browser supplies an install prompt; Safari uses its Share
  menu. Updates prompt the user to save and reopen the app.
- **Windows:** a sandboxed Electron shell and electron-builder NSIS target are
  included. On a Windows development machine, install dependencies without
  `ELECTRON_SKIP_BINARY_DOWNLOAD` (or run `node node_modules/electron/install.js`
  after unsetting it). Run `npm run desktop`, then `npm run dist:windows`. The
  installer is written under `release/`. Configure code signing for public releases.
  No Windows installer has been built or executed in this Linux validation.
- **Android:** generated Capacitor 8 project in `android/`. Install Android Studio,
  JDK 21 and the SDK versions declared in `android/variables.gradle`. Run
  `npm run android:sync`, `npm run android:open`, then build with Android Studio or
  `cd android && ./gradlew assembleDebug`. The debug APK is written to
  `android/app/build/outputs/apk/debug/`. Release APK/AAB builds require a private
  signing keystore supplied outside Git. No APK or real-device validation is claimed.

Only set `VITE_WINDOWS_DOWNLOAD_URL` or `VITE_ANDROID_DOWNLOAD_URL` to HTTPS URLs
of artifacts that you have actually built and published. Rebuild the web app
when setting these variables. The landing page otherwise shows unpublished
status and offers no fabricated downloads.

## Architecture, content and limits

See [architecture](docs/ARCHITECTURE.md), [milestones](docs/MILESTONES.md),
[asset import/export specifications](docs/ASSETS.md), and
[environment setup](docs/ENVIRONMENT.md).

The vehicle registry includes manufacturer, model, year, trim, drivetrain,
propulsion, license, materials and dependency-driven part definitions. Future
categories and manufacturer names are metadata only. No unlicensed branded
meshes, logos or external textures are bundled.

Current visuals use procedural PBR materials, original geometry, workshop
reflection capture, dynamic shadows and optional SSAO. Production HDR maps,
scanned materials, detailed licensed GLBs, recorded mechanical audio, texture
compression/asset LODs and GPU memory profiling remain future work. Audio is
original synthesized feedback. Restoration economics, shops, customer jobs,
career, additional garages and physics simulation are not implemented.

## Pinned toolchain

| Package                        | Version          |
| ------------------------------ | ---------------- |
| React / React DOM              | 19.2.0           |
| TypeScript                     | 5.9.3            |
| Vite / React plugin            | 7.2.2 / 5.1.0    |
| Babylon core / loaders         | 9.35.0           |
| Vite PWA plugin                | 1.1.0            |
| Vitest / Playwright            | 3.2.4 / 1.56.1   |
| Electron / electron-builder    | 45.2.3 / 26.18.0 |
| Capacitor core / Android / CLI | 8.6.0            |

The lockfile records the exact dependency tree. Use `npm ci` for repeatable setup.
