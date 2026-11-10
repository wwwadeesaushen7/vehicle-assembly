import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Scene } from "@babylonjs/core/scene";
export function materials(scene: Scene) {
  const make = (name: string, color: string, metal: number, rough: number) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = Color3.FromHexString(color);
    m.metallic = metal;
    m.roughness = rough;
    m.environmentIntensity = 0.8;
    return m;
  };
  const glass = make("Smoked glazing", "#537575", 0.05, 0.12);
  glass.alpha = 0.38;
  glass.backFaceCulling = false;
  const light = make("Warm LED", "#f3efcf", 0.05, 0.2);
  light.emissiveColor = new Color3(0.9, 0.82, 0.58);
  const tail = make("Tail lamps", "#d22816", 0.15, 0.2);
  tail.emissiveColor = new Color3(0.5, 0.015, 0);
  return {
    paint: make("Cinder red | clearcoat", "#b9442b", 0.5, 0.27),
    steel: make("Brushed steel", "#667475", 0.8, 0.32),
    alloy: make("Machined alloy", "#abb3b2", 0.8, 0.24),
    dark: make("Satin graphite", "#151c1b", 0.4, 0.43),
    rubber: make("Tire rubber", "#171b1a", 0, 0.93),
    leather: make("Saddle upholstery", "#644633", 0, 0.85),
    glass,
    light,
    tail,
    orange: make("Caliper orange", "#da7738", 0.4, 0.4),
  };
}
export type Palette = ReturnType<typeof materials>;
