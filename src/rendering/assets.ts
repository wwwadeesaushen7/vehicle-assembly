import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { type Scene } from "@babylonjs/core/scene";
import type { PartDefinition } from "../content/schema";
export async function importLicensedPart(part: PartDefinition, scene: Scene) {
  if (!part.asset?.license || !part.asset.attribution)
    throw new Error("Asset license and attribution are required.");
  await import("@babylonjs/loaders/glTF");
  return ImportMeshAsync(part.asset.url, scene);
}
