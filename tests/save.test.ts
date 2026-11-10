import { describe, it, expect } from "vitest";
import {
  decodeSave,
  newSave,
  readSave,
  writeSave,
  SAVE_KEY,
  type StoragePort,
} from "../src/persistence/save";
function memory(): StoragePort {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
describe("versioned local persistence", () => {
  it("roundtrips assembly placements, preferences, garage and profile", () => {
    const store = memory(),
      s = newSave();
    s.assembly.placements.engine = {
      position: [2.5, 1.04, -1.25],
      rotation: 45,
    };
    s.preferences.garage.floor = "epoxy";
    s.preferences.garage.wall = "#847663";
    s.preferences.quality = "Low";
    s.profile.name = "Mechanic";
    writeSave(store, s);
    const loaded = readSave(store)!;
    expect(loaded.assembly).toEqual(s.assembly);
    expect(loaded.preferences).toEqual(s.preferences);
    expect(loaded.profile).toEqual(s.profile);
  });
  it("returns null for a new device", () =>
    expect(readSave(memory())).toBeNull());
  it("rejects malformed JSON and unsupported versions", () => {
    expect(() => decodeSave("{")).toThrow();
    expect(() =>
      decodeSave(JSON.stringify({ ...newSave(), version: 2 })),
    ).toThrow("Unsupported");
  });
  it("rejects unknown or duplicated part IDs", () => {
    const s = newSave();
    s.assembly.installed.push("fake");
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
    s.assembly.installed = ["frame", "frame"];
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
  });
  it("rejects impossible dependency order and unfinished installed fasteners", () => {
    const s = newSave();
    s.assembly.installed.push("transmission");
    expect(() => decodeSave(JSON.stringify(s))).toThrow("dependencies");
    s.assembly.installed = ["frame", "engine"];
    expect(() => decodeSave(JSON.stringify(s))).toThrow("fasteners");
  });
  it("rejects corrupt settings, transforms and count ranges", () => {
    const a = newSave();
    a.preferences.camera.radius = 1000;
    expect(() => decodeSave(JSON.stringify(a))).toThrow("camera");
    const b = newSave();
    b.assembly.placements.engine = { position: [0, Infinity, 0], rotation: 0 };
    expect(() => decodeSave(JSON.stringify(b))).toThrow("transform");
    const c = newSave();
    c.assembly.fasteners.engine = 10;
    expect(() => decodeSave(JSON.stringify(c))).toThrow("fasteners");
  });
  it("does not silently overwrite a corrupt save", () => {
    const store = memory();
    store.setItem(SAVE_KEY, "bad");
    expect(() => readSave(store)).toThrow();
    expect(store.getItem(SAVE_KEY)).toBe("bad");
  });
  it("surfaces full or unavailable storage", () => {
    const store: StoragePort = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    expect(() => writeSave(store, newSave())).toThrow("Quota");
  });
});
