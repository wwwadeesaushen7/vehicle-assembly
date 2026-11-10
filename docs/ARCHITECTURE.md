# Formworks — Vehicle Assembly

## First playable milestone

A local-first single-player assembly sandbox with an original, procedurally modeled
two-seat coupe, the FW-01. These original meshes are a playable demo, not a claim
of photorealism. No manufacturer logos or third-party vehicle models are included.

## Boundaries

- `src/content`: typed vehicle, part, connector, material, garage and license data.
- `src/game`: pure assembly rules, transforms, diagnostics and reversible history.
- `src/rendering`: Babylon scene, procedural geometry, materials and input bridge.
- `src/persistence`: validated, versioned local saves behind a storage interface.
- `src/platform`: browser capabilities and future platform adapters.
- `src/ui`: React menus, workshop, settings and accessible touch controls.
- `electron`: sandboxed desktop shell; `capacitor.config.ts`: shared Android shell.

React owns serializable state. Babylon receives snapshots and reports selection
and movement events; it does not decide assembly rules. Dependencies are a directed
acyclic graph. Removal must preserve that graph. Installation requires matching
connector, position, orientation, tool and completed fasteners. Free mode removes
the guided recommendation, not physical constraints. Inspection mode is read-only.

One registry drives the inventory, renderer and save validation. Future licensed
GLBs use the same meter-based local transforms and connector IDs. Only implemented
vehicles are selectable; planned categories are clearly marked coming soon.

Saves include a schema version, profile, installed parts, in-progress placements,
fasteners, camera, garage and graphics preferences. History is in-memory. Browser,
Electron and Capacitor initially use localStorage through the same adapter. Export
and import provide portable backups; native filesystem/cloud sync are future adapters.

## Delivery

Vite produces one web bundle. The PWA caches the app shell and lazy game chunk.
Electron loads the bundle locally with isolation enabled. Capacitor copies the
same bundle into its Android webview. Installers are offered only when real release
artifact URLs have been configured. Native builds and real-device testing are a
separate milestone from verified web operation.
