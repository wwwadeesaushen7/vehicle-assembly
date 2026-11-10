import { describe, it, expect } from "vitest";
import { parts, partById } from "../src/content/vehicles";
import {
  initialAssembly,
  move,
  snap,
  fasten,
  remove,
  diagnostics,
  canStart,
  commit,
  undo,
  redo,
  type Assembly,
  type Result,
} from "../src/game/assembly";
const good = (r: Result): Assembly => {
  if (!r.ok) throw new Error(r.error);
  return r.state;
};
function install(state: Assembly, id: string) {
  const p = partById[id];
  state = good(move(state, id, p.mount));
  for (let i = 0; i < Math.max(1, p.fasteners); i++)
    state = good(fasten(state, id, p.tool));
  return state;
}
describe("assembly rules", () => {
  it("contains 26 distinct components with resolvable, acyclic dependencies", () => {
    expect(parts.length).toBe(26);
    expect(new Set(parts.map((p) => p.id)).size).toBe(26);
    const visited = new Set<string>();
    while (visited.size < parts.length) {
      const available = parts.filter(
        (p) => !visited.has(p.id) && p.dependsOn.every((d) => visited.has(d)),
      );
      expect(available.length).toBeGreaterThan(0);
      available.forEach((p) => visited.add(p.id));
    }
  });
  it("rejects installation away from the socket", () => {
    const result = fasten(initialAssembly(), "engine", "wrench");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("13 cm");
  });
  it("validates connector identity, position and orientation", () => {
    let s = good(
      move(initialAssembly(), "engine", {
        position: partById.engine.mount.position,
        rotation: 15,
      }),
    );
    expect(snap(s, "engine").ok).toBe(false);
    s = good(move(s, "engine", partById.engine.mount));
    expect(fasten(s, "engine", "wrench", "wrong-connector").ok).toBe(false);
    expect(snap(s, "engine").ok).toBe(true);
  });
  it("accepts wrapped angles and rejects nonfinite movement", () => {
    let s = good(
      move(initialAssembly(), "engine", {
        ...partById.engine.mount,
        rotation: 360,
      }),
    );
    expect(snap(s, "engine").ok).toBe(true);
    expect(move(s, "engine", { position: [NaN, 0, 0], rotation: 0 }).ok).toBe(
      false,
    );
  });
  it("requires engine before transmission", () => {
    const s = good(
      move(initialAssembly(), "transmission", partById.transmission.mount),
    );
    const r = fasten(s, "transmission", "wrench");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("inline-four");
  });
  it("requires the correct tool and every fastener", () => {
    let s = good(move(initialAssembly(), "engine", partById.engine.mount));
    expect(fasten(s, "engine", "screwdriver").ok).toBe(false);
    for (let i = 0; i < 3; i++) {
      s = good(fasten(s, "engine", "wrench"));
      expect(s.installed).not.toContain("engine");
    }
    s = good(fasten(s, "engine", "wrench"));
    expect(s.installed).toContain("engine");
    expect(s.fasteners.engine).toBe(4);
    expect(fasten(s, "engine", "wrench").ok).toBe(false);
  });
  it("moving a partially fastened part resets fasteners", () => {
    let s = good(move(initialAssembly(), "engine", partById.engine.mount));
    s = good(fasten(s, "engine", "wrench"));
    s = good(move(s, "engine", { position: [0, 1.04, -1.2], rotation: 0 }));
    expect(s.fasteners.engine).toBe(0);
  });
  it("protects foundation and dependency order on removal", () => {
    let s = install(initialAssembly(), "engine");
    s = install(s, "transmission");
    expect(remove(s, "frame", "hand").ok).toBe(false);
    expect(remove(s, "engine", "wrench").ok).toBe(false);
    expect(remove(s, "transmission", "hand").ok).toBe(false);
    s = good(remove(s, "transmission", "wrench"));
    expect(remove(s, "engine", "wrench").ok).toBe(true);
  });
  it("never moves an installed part", () => {
    const s = install(initialAssembly(), "engine");
    expect(move(s, "engine", partById.engine.mount).ok).toBe(false);
  });
  it("undoes and redoes without mutation, and clears redo on new action", () => {
    const first = initialAssembly();
    const engine = install(first, "engine");
    let h = commit({ past: [], present: first, future: [] }, engine);
    h = undo(h);
    expect(h.present).toEqual(first);
    h = redo(h);
    expect(h.present).toEqual(engine);
    expect(first.installed).toEqual(["frame"]);
    h = commit(undo(h), install(first, "battery"));
    expect(h.future).toEqual([]);
  });
  it("builds and disassembles a complete vehicle with diagnostics gated", () => {
    let s = initialAssembly();
    expect(canStart(s)).toBe(false);
    for (const p of parts.filter((p) => p.id !== "frame")) s = install(s, p.id);
    expect(s.installed.length).toBe(26);
    expect(diagnostics(s).every((c) => c.ready)).toBe(true);
    expect(canStart(s)).toBe(true);
    for (const p of [...parts].reverse().filter((p) => p.id !== "frame"))
      s = good(remove(s, p.id, p.tool));
    expect(s.installed).toEqual(["frame"]);
    expect(canStart(s)).toBe(false);
  });
});
