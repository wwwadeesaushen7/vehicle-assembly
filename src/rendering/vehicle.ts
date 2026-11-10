import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { type Material } from "@babylonjs/core/Materials/material";
import type { PartDefinition } from "../content/schema";
import type { Palette } from "./materials";
export function buildPart(
  p: PartDefinition,
  scene: Scene,
  m: Palette,
  lowDetail: boolean,
): Mesh {
  const root = new Mesh(p.id, scene);
  root.metadata = { partId: p.id };
  let n = 0;
  const box = (dim: number[], pos: number[], mat: Material, rot?: number[]) => {
    const b = MeshBuilder.CreateBox(
      `${p.id}-${n++}`,
      { width: dim[0], height: dim[1], depth: dim[2] },
      scene,
    );
    b.parent = root;
    b.position.set(...(pos as [number, number, number]));
    if (rot) b.rotation.set(...(rot as [number, number, number]));
    b.material = mat;
    b.metadata = { partId: p.id };
    return b;
  };
  const cylinder = (
    dia: number,
    height: number,
    pos: number[],
    mat: Material,
    axis: "x" | "y" | "z" = "y",
  ) => {
    const b = MeshBuilder.CreateCylinder(
      `${p.id}-${n++}`,
      { diameter: dia, height, tessellation: lowDetail ? 16 : 32 },
      scene,
    );
    b.parent = root;
    b.position.set(...(pos as [number, number, number]));
    if (axis === "x") b.rotation.z = Math.PI / 2;
    if (axis === "z") b.rotation.x = Math.PI / 2;
    b.material = mat;
    b.metadata = { partId: p.id };
    return b;
  };
  const tube = (points: number[][], radius: number, mat: Material) => {
    const b = MeshBuilder.CreateTube(
      `${p.id}-${n++}`,
      {
        path: points.map((v) => Vector3.FromArray(v)),
        radius,
        tessellation: lowDetail ? 8 : 12,
      },
      scene,
    );
    b.parent = root;
    b.material = mat;
    b.metadata = { partId: p.id };
    return b;
  };
  const torus = (
    dia: number,
    thickness: number,
    pos: number[],
    mat: Material,
    axis: "x" | "y" | "z" = "y",
  ) => {
    const b = MeshBuilder.CreateTorus(
      `${p.id}-${n++}`,
      { diameter: dia, thickness, tessellation: lowDetail ? 24 : 48 },
      scene,
    );
    b.parent = root;
    b.position.set(...(pos as [number, number, number]));
    if (axis === "x") b.rotation.z = Math.PI / 2;
    if (axis === "z") b.rotation.x = Math.PI / 2;
    b.material = mat;
    b.metadata = { partId: p.id };
    return b;
  };
  switch (p.shape) {
    case "frame":
      for (const x of [-0.7, 0.7]) {
        box([0.12, 0.16, 3.9], [x, 0, 0], m.steel);
        tube(
          [
            [x, 0, -1.8],
            [x, 0.6, -0.55],
            [x, 0.6, 0.7],
            [x, 0, 1.7],
          ],
          0.04,
          m.dark,
        );
      }
      for (const z of [-1.7, -0.5, 0.6, 1.65])
        box([1.45, 0.12, 0.1], [0, 0, z], m.steel);
      box([1.4, 0.07, 1.8], [0, 0.07, 0.25], m.dark);
      break;
    case "suspension":
      box([1.75, 0.12, 0.24], [0, 0, 0], m.dark);
      cylinder(0.26, 0.4, [0, 0, 0], m.steel, "x");
      for (const x of [-0.76, 0.76]) {
        cylinder(0.09, 0.48, [x, 0.19, 0], m.alloy);
        for (let i = 0; i < 7; i++)
          torus(0.19, 0.025, [x, -0.02 + i * 0.055, 0], m.orange);
        tube(
          [
            [x - 0.12, 0, 0.22],
            [x, 0.16, 0],
            [x + 0.12, 0, -0.22],
          ],
          0.035,
          m.steel,
        );
      }
      break;
    case "steering":
      cylinder(0.09, 1.7, [0, 0, 0], m.steel, "x");
      tube(
        [
          [-0.5, 0, 0],
          [-0.5, 0.2, 0.3],
          [-0.5, 0.5, 0.65],
        ],
        0.035,
        m.steel,
      );
      break;
    case "engine":
      box([0.64, 0.48, 0.76], [0, 0, 0], m.steel);
      box([0.61, 0.12, 0.84], [0, 0.28, 0], m.dark);
      box([0.14, 0.025, 0.62], [0, 0.35, 0], m.alloy);
      for (let i = 0; i < 4; i++) {
        cylinder(0.06, 0.035, [0.14, 0.36, -0.28 + i * 0.18], m.orange);
        tube(
          [
            [0.3, 0.12, -0.3 + i * 0.18],
            [0.48, 0, -0.3 + i * 0.18],
            [0.48, -0.3, 0.2],
          ],
          0.04,
          m.alloy,
        );
      }
      cylinder(0.25, 0.12, [0, -0.05, -0.44], m.dark, "z");
      cylinder(0.16, 0.1, [-0.25, 0.1, -0.44], m.alloy, "z");
      break;
    case "gearbox":
      cylinder(0.48, 0.32, [0, 0, -0.25], m.alloy, "z");
      box([0.32, 0.32, 0.7], [0, 0, 0.2], m.steel);
      for (let i = 0; i < 6; i++)
        box([0.38, 0.035, 0.02], [0, 0.14, -0.04 + i * 0.09], m.alloy);
      break;
    case "shaft":
      cylinder(0.09, 1.45, [0, 0, 0], m.steel, "z");
      cylinder(0.17, 0.11, [0, 0, 0.6], m.alloy, "z");
      break;
    case "exhaust":
      tube(
        [
          [0, 0, -1.6],
          [0, 0, 0.9],
          [0.12, 0, 1.6],
        ],
        0.055,
        m.alloy,
      );
      box([0.35, 0.2, 0.5], [0, 0, 1], m.steel);
      break;
    case "radiator":
      box([1.1, 0.56, 0.12], [0, 0, 0], m.dark);
      for (let i = 0; i < 12; i++)
        box([1.05, 0.016, 0.02], [0, -0.25 + i * 0.043, -0.07], m.alloy);
      cylinder(0.41, 0.05, [0, 0, 0.1], m.dark, "z");
      break;
    case "battery":
      box([0.3, 0.3, 0.43], [0, 0, 0], m.dark);
      box([0.32, 0.045, 0.45], [0, 0.17, 0], m.rubber);
      for (const z of [-0.15, 0.15])
        cylinder(0.035, 0.05, [0.07, 0.2, z], z < 0 ? m.orange : m.alloy);
      break;
    case "tank":
      box([1.1, 0.25, 0.55], [0, 0, 0], m.alloy);
      for (const x of [-0.35, 0.35]) box([0.05, 0.27, 0.57], [x, 0, 0], m.dark);
      cylinder(0.1, 0.07, [0.3, 0.18, 0], m.dark);
      break;
    case "brake":
      cylinder(0.48, 0.06, [0, 0, 0], m.alloy, "x");
      cylinder(0.17, 0.1, [0, 0, 0], m.dark, "x");
      box([0.12, 0.24, 0.1], [0, 0, 0.22], m.orange);
      if (!lowDetail)
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          cylinder(
            0.018,
            0.065,
            [0, Math.sin(a) * 0.18, Math.cos(a) * 0.18],
            m.dark,
            "x",
          );
        }
      break;
    case "wheel":
      torus(0.92, 0.31, [0, 0, 0], m.rubber, "x");
      cylinder(0.67, 0.24, [0, 0, 0], m.dark, "x");
      torus(0.66, 0.05, [(p.side ?? 1) * 0.15, 0, 0], m.alloy, "x");
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        box(
          [0.07, 0.09, 0.3],
          [(p.side ?? 1) * 0.16, Math.sin(a) * 0.15, Math.cos(a) * 0.15],
          m.alloy,
          [-a, 0, 0],
        );
        cylinder(
          0.035,
          0.04,
          [(p.side ?? 1) * 0.2, Math.sin(a) * 0.08, Math.cos(a) * 0.08],
          m.steel,
          "x",
        );
      }
      cylinder(0.15, 0.05, [(p.side ?? 1) * 0.19, 0, 0], m.alloy, "x");
      if (!lowDetail)
        for (let i = 0; i < 40; i++) {
          const a = (i * Math.PI) / 20;
          box(
            [0.29, 0.02, 0.025],
            [0, Math.sin(a) * 0.606, Math.cos(a) * 0.606],
            m.dark,
            [-a, 0, 0],
          );
        }
      break;
    case "cockpit":
      for (const x of [-0.43, 0.43]) {
        box([0.58, 0.15, 0.61], [x, 0.09, 0.2], m.leather);
        box([0.55, 0.65, 0.14], [x, 0.41, 0.5], m.leather, [0.13, 0, 0]);
        box([0.29, 0.22, 0.14], [x, 0.83, 0.52], m.leather);
      }
      box([1.52, 0.2, 0.38], [0, 0.5, -0.54], m.dark);
      box([0.22, 0.22, 0.95], [0, 0.1, 0.1], m.dark);
      torus(0.33, 0.035, [-0.43, 0.58, -0.26], m.rubber, "z");
      cylinder(0.035, 0.21, [0, 0.3, 0], m.steel);
      break;
    case "body":
      // The side panels follow wheel arches, leaving actual wheel openings.
      for (const side of [-1, 1]) {
        box([0.09, 0.42, 1.47], [side * 0.91, 0.15, -0.01], m.paint);
        box([0.14, 0.13, 1.48], [side * 0.94, -0.17, -0.01], m.dark);
        for (const z of [-1.4, 1.35]) {
          const path = [];
          for (let i = 0; i <= 24; i++) {
            const a = (Math.PI * i) / 24;
            path.push([
              side * 0.96,
              -0.28 + Math.sin(a) * 0.72,
              z + Math.cos(a) * 0.72,
            ]);
          }
          tube(path, 0.105, m.paint);
        }
        for (const z of [-2.05, 2])
          box([0.16, 0.35, 0.38], [side * 0.91, 0, z], m.paint);
      }
      box([1.78, 0.19, 0.63], [0, 0.3, 1.73], m.paint);
      box([1.86, 0.33, 0.12], [0, 0.01, 2.18], m.paint);
      box([1.83, 0.14, 0.18], [0, -0.24, 2.15], m.dark);
      break;
    case "hood":
      box([1.71, 0.09, 1.55], [0, 0, 0], m.paint, [-0.04, 0, 0]);
      for (const x of [-0.58, 0.58])
        for (let i = 0; i < 4; i++)
          box([0.16, 0.014, 0.035], [x, 0.06, 0.25 + i * 0.09], m.dark);
      break;
    case "glass":
      box([1.43, 0.065, 1.15], [0, 0.52, 0.16], m.paint);
      box([1.42, 0.66, 0.025], [0, 0.19, -0.62], m.glass, [-0.53, 0, 0]);
      box([1.42, 0.57, 0.025], [0, 0.23, 0.91], m.glass, [0.58, 0, 0]);
      for (const side of [-1, 1]) {
        tube(
          [
            [side * 0.86, -0.08, -0.82],
            [side * 0.71, 0.51, -0.4],
            [side * 0.71, 0.51, 0.7],
            [side * 0.86, -0.04, 1.07],
          ],
          0.04,
          m.paint,
        );
        box([0.024, 0.42, 0.99], [side * 0.78, 0.2, 0.16], m.glass, [
          0,
          0,
          side * 0.22,
        ]);
        box([0.04, 0.53, 0.06], [side * 0.78, 0.24, 0.55], m.dark, [
          0,
          0,
          side * 0.22,
        ]);
      }
      break;
    case "lights":
      for (const x of [-0.62, 0.62]) {
        box([0.49, 0.13, 0.08], [x, 0.18, -2.07], m.light);
        box([0.53, 0.1, 0.04], [x, 0.1, 2.25], m.tail);
      }
      break;
    case "bumper":
      box([1.87, 0.25, 0.18], [0, 0, 0], m.paint);
      box([1.2, 0.15, 0.2], [0, 0.01, -0.03], m.dark);
      for (let i = 0; i < 9; i++)
        box([0.017, 0.13, 0.025], [-0.5 + i * 0.125, 0.01, -0.14], m.steel);
      box([1.94, 0.045, 0.3], [0, -0.17, 0], m.dark);
      break;
    case "trim":
      for (const side of [-1, 1]) {
        box([0.23, 0.1, 0.18], [side * 1.04, 0, 0], m.paint);
        box([0.17, 0.06, 0.01], [side * 1.04, 0, 0.1], m.glass);
        box([0.055, 0.035, 0.15], [side * 0.98, -0.23, 0.7], m.alloy);
      }
      break;
  }
  // Consolidate geometry per material while preserving independent selectable parts.
  const groups = new Map<Material, Mesh[]>();
  for (const child of root.getChildMeshes()) {
    if (child instanceof Mesh && child.material) {
      const group = groups.get(child.material) ?? [];
      group.push(child);
      groups.set(child.material, group);
    }
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const merged = Mesh.MergeMeshes(group, true, true);
    if (merged) {
      merged.parent = root;
      merged.metadata = { partId: p.id };
    }
  }
  return root;
}
