# Asset pipeline and rights

## Included assets

All geometry in `src/rendering/vehicle.ts` and the garage, materials, icons and
synthesized audio are original to this project and supplied under the repository's
MIT license. Lucide icons use the ISC license from the `lucide-react` package.
No manufacturer logo, branded vehicle model, third-party photo, HDR map, font or
sound recording is included. The UI uses locally installed system fonts.

## Authoring a vehicle kit in Blender

1. Use meters, right-handed Blender coordinates, apply scale (1,1,1) and rotation
   before export. Export glTF 2.0 / GLB using Blender's default Y-up conversion.
   Babylon's default scene is left handed. Validate the glTF conversion root;
   do not apply a second axis flip. In the game, X is left/right, Y up and the
   vehicle nose points toward negative Z. Export a one-meter reference cube
   alongside your first test kit to verify scale and orientation.
2. One independent GLB per removable part or an explicitly named node hierarchy.
   Center each part's origin at its attachment datum. Preserve a parent node for
   the part and child meshes for material groups. Put rotation pivots at real
   hinge/shaft centers. Never bake the world mounting transform into vertex data.
3. Name files by stable IDs (`fw-01/engine-lod0.glb`). Name nodes with the part ID
   prefix and descriptive material groups. Create empties for connectors named
   `socket_<connector-id>`. Record position in meters and rotation in degrees
   in the content definition. Connector IDs must match the receiving vehicle.
4. Document the local axis-aligned bounding box in kit metadata. Keep collision
   proxies separate from render meshes. The initial game validates mount distances
   and angles; imported collision geometry will require future physics integration.
5. Use metallic/roughness PBR. Base color is sRGB; roughness, metal and normal maps
   are linear. Pack occlusion/roughness/metallic into RGB channels consistently.
   Use measured metal values, sensible roughness and a clearcoat layer for paint.
   Avoid transparent materials for opaque body surfaces.
6. Aim for 1K textures/mobile and 2K/desktop as a starting point. Supply LOD0/1/2
   with decreasing triangle counts and the same origins/connector transforms.
   Profile before choosing budgets. KTX2/Basis and Draco/Meshopt require their
   decoders to be hosted locally, licensed, configured, and included in the
   offline cache. They are not wired up in the current demo.
7. Test each GLB in Blender and the Khronos glTF validator. Verify scale, materials,
   bounds, pivots, left/right pairs, dependencies and part count in the game.

## Import steps

- Put licensed files under `public/assets/<vehicle-id>/`. Include `LICENSE.txt`,
  source URL, author, license identifier, redistribution terms and modifications.
  Do not bundle an asset without redistribution rights.
- Add a `VehicleDefinition` to `src/content/vehicles.ts` with an assembly kit of
  `PartDefinition` records. A new brand/model uses the same engine; add data and
  its rendering assets rather than changing rule logic.
- Set each part's `asset` to `{ url, license, attribution }`. URLs must be relative
  to the application base for subdirectory and native hosting.
- `src/rendering/assets.ts` supplies a lazy GLB loader with required attribution.
  The demo renderer currently constructs procedural shapes. To activate a GLB kit,
  connect this loader in the renderer's part factory, parent imported meshes under
  that part's root, assign `metadata.partId` to pickable child meshes, retain the
  root transform from the definition, and register shadows. Dispose imported
  materials/textures when unloading the kit. Asset references alone do not render
  GLBs until that factory integration is implemented.
- Supply a simplified ghost proxy for a high-detail part. Share materials and use
  instances where repeated geometry does not require independent deformation.
- Add a content validation test for IDs, acyclic dependencies and transforms. Build
  and test a full install/removal sequence before marking the vehicle playable.

## Assets still needed for higher fidelity

A licensed production vehicle kit, matching physically measured material maps,
an HDR environment, garage prop models, recorded tool/engine audio and authored
LODs. Catalog names confer no rights to use manufacturer branding or geometry.
