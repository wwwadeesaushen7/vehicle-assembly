import { it, expect } from "vitest";
import { collectVehicle } from "../src/persistence/collection";
import { initialAssembly } from "../src/game/assembly";
import { parts } from "../src/content/vehicles";
it("keeps an independent completed build snapshot and rejects unfinished projects", () => {
  const assembly = initialAssembly();
  expect(() => collectVehicle(assembly)).toThrow("complete");
  assembly.installed = parts.map((p) => p.id);
  assembly.fasteners = Object.fromEntries(
    parts.map((p) => [p.id, p.fasteners]),
  );
  const entry = collectVehicle(assembly);
  assembly.installed.pop();
  expect(entry.assembly.installed).toHaveLength(26);
  expect(assembly.installed).toHaveLength(25);
  expect(entry.vehicleId).toBe("fw-01");
});

import { newSave, writeSave, readSave } from "../src/persistence/save";
it("persists a completed snapshot separately from a fresh working chassis", () => {
  const complete = initialAssembly();
  complete.installed = parts.map((p) => p.id);
  complete.fasteners = Object.fromEntries(
    parts.map((p) => [p.id, p.fasteners]),
  );
  const save = newSave();
  save.profile.collection = [collectVehicle(complete)];
  let raw = "";
  const storage = {
    getItem: () => raw || null,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
  writeSave(storage, save);
  const loaded = readSave(storage)!;
  expect(loaded.assembly.installed).toEqual(["frame"]);
  expect(loaded.profile.collection[0].assembly.installed).toHaveLength(26);
});
