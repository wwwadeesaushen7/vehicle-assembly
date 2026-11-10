import type { CollectionEntry } from "./collection";
import { initialAssembly, canStart, type Assembly } from "../game/assembly";
import { partById } from "../content/vehicles";
export type Quality = "Low" | "Medium" | "High" | "Ultra";
export interface Preferences {
  quality: Quality;
  sound: boolean;
  rotateKey: string;
  garage: {
    wall: string;
    floor: "concrete" | "tiles" | "epoxy";
    lighting: number;
    cabinet: string;
  };
  camera: {
    alpha: number;
    beta: number;
    radius: number;
    target: [number, number, number];
  };
}
export interface Save {
  version: 1;
  vehicleId: "fw-01";
  profile: { name: string; collection: CollectionEntry[] };
  assembly: Assembly;
  preferences: Preferences;
  savedAt: string;
}
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const SAVE_KEY = "formworks.save.v1";
export const defaults = (): Preferences => ({
  quality:
    typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches
      ? "Low"
      : "High",
  sound: true,
  rotateKey: "r",
  garage: {
    wall: "#333f3d",
    floor: "concrete",
    lighting: 1,
    cabinet: "#b95130",
  },
  camera: { alpha: -2.25, beta: 1.13, radius: 8.7, target: [0, 0.9, 0] },
});
export const newSave = (): Save => ({
  version: 1,
  vehicleId: "fw-01",
  profile: { name: "Builder", collection: [] },
  assembly: initialAssembly(),
  preferences: defaults(),
  savedAt: new Date().toISOString(),
});
const isRecord = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const vector = (v: unknown) =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => finite(n) && Math.abs(n) <= 100);
function validateAssembly(a: unknown): asserts a is Assembly {
  if (
    !isRecord(a) ||
    !Array.isArray(a.installed) ||
    !a.installed.includes("frame") ||
    a.installed.some(
      (id: unknown) => typeof id !== "string" || !Object.hasOwn(partById, id),
    ) ||
    new Set(a.installed).size !== a.installed.length
  )
    throw new Error("Invalid installed parts.");
  for (const id of a.installed)
    if (partById[id].dependsOn.some((dep) => !a.installed.includes(dep)))
      throw new Error("Save has unmet assembly dependencies.");
  if (!isRecord(a.placements) || !isRecord(a.fasteners))
    throw new Error("Invalid assembly state.");
  for (const [id, t] of Object.entries(a.placements))
    if (
      !Object.hasOwn(partById, id) ||
      !isRecord(t) ||
      !vector(t.position) ||
      !finite(t.rotation)
    )
      throw new Error("Invalid part transform.");
  for (const [id, count] of Object.entries(a.fasteners))
    if (
      !Object.hasOwn(partById, id) ||
      !Number.isInteger(count) ||
      (count as number) < 0 ||
      (count as number) > partById[id].fasteners
    )
      throw new Error("Invalid fasteners.");
  for (const id of a.installed)
    if (
      partById[id].fasteners > 0 &&
      a.fasteners[id] !== partById[id].fasteners
    )
      throw new Error("Installed part has unfinished fasteners.");
}
export function decodeSave(raw: string): Save {
  if (raw.length > 1000000) throw new Error("Save file is too large.");
  const s: unknown = JSON.parse(raw);
  if (!isRecord(s) || s.version !== 1 || s.vehicleId !== "fw-01")
    throw new Error("Unsupported save version or vehicle.");
  validateAssembly(s.assembly);
  const p = s.preferences;
  if (
    !isRecord(p) ||
    !["Low", "Medium", "High", "Ultra"].includes(p.quality) ||
    typeof p.sound !== "boolean" ||
    typeof p.rotateKey !== "string" ||
    !/^[a-z]$/.test(p.rotateKey) ||
    p.rotateKey === "f"
  )
    throw new Error("Invalid preferences.");
  const g = p.garage,
    c = p.camera;
  if (
    !isRecord(g) ||
    !/^#[a-f0-9]{6}$/i.test(g.wall) ||
    !/^#[a-f0-9]{6}$/i.test(g.cabinet) ||
    !["concrete", "tiles", "epoxy"].includes(g.floor) ||
    !finite(g.lighting) ||
    g.lighting < 0.3 ||
    g.lighting > 2
  )
    throw new Error("Invalid garage settings.");
  if (
    !isRecord(c) ||
    ![c.alpha, c.beta, c.radius].every(finite) ||
    c.radius < 3 ||
    c.radius > 20 ||
    c.beta < 0.1 ||
    c.beta > 1.55 ||
    !vector(c.target)
  )
    throw new Error("Invalid camera.");
  if (
    !isRecord(s.profile) ||
    typeof s.profile.name !== "string" ||
    s.profile.name.length > 80 ||
    !Array.isArray(s.profile.collection)
  )
    throw new Error("Invalid profile.");
  for (const entry of s.profile.collection) {
    if (
      !isRecord(entry) ||
      entry.vehicleId !== "fw-01" ||
      typeof entry.completedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.completedAt))
    )
      throw new Error("Invalid collection entry.");
    validateAssembly(entry.assembly);
    if (!canStart(entry.assembly))
      throw new Error("Collection contains an unfinished vehicle.");
  }
  if (typeof s.savedAt !== "string" || !Number.isFinite(Date.parse(s.savedAt)))
    throw new Error("Invalid save date.");
  return s as unknown as Save;
}
export function readSave(storage: StoragePort): Save | null {
  const raw = storage.getItem(SAVE_KEY);
  return raw ? decodeSave(raw) : null;
}
export function writeSave(storage: StoragePort, save: Save): void {
  const raw = JSON.stringify({ ...save, savedAt: new Date().toISOString() });
  decodeSave(raw);
  storage.setItem(SAVE_KEY, raw);
}
