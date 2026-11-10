import { parts, partById } from "../content/vehicles";
import type { Transform, Tool } from "../content/schema";
export type Assembly = {
  installed: string[];
  placements: Record<string, Transform>;
  fasteners: Record<string, number>;
};
export type Result =
  | { ok: true; state: Assembly }
  | { ok: false; error: string };
export const initialAssembly = (): Assembly => ({
  installed: ["frame"],
  placements: {},
  fasteners: {},
});
export const copy = <T>(v: T): T => structuredClone(v);
export function placementFor(state: Assembly, id: string): Transform {
  return (
    state.placements[id] ?? {
      position: [
        partById[id].mount.position[0] + 2.5,
        partById[id].mount.position[1],
        partById[id].mount.position[2],
      ],
      rotation: 0,
    }
  );
}
export function prerequisites(state: Assembly, id: string): string[] {
  return partById[id].dependsOn.filter((dep) => !state.installed.includes(dep));
}
export function alignError(
  state: Assembly,
  id: string,
  connector = partById[id].connector,
): string | null {
  const p = partById[id];
  const t = placementFor(state, id);
  if (connector !== p.connector) return "Incompatible connector.";
  if (Math.hypot(...t.position.map((n, i) => n - p.mount.position[i])) > 0.13)
    return "Move the part within 13 cm of its mount, then snap.";
  const degrees = (((t.rotation - p.mount.rotation) % 360) + 360) % 360;
  if (Math.min(degrees, 360 - degrees) > 6)
    return "Rotate the part to align with its mount (within 6°).";
  return null;
}
export function move(
  state: Assembly,
  id: string,
  transform: Transform,
): Result {
  if (!partById[id] || state.installed.includes(id))
    return { ok: false, error: "Remove the installed part before moving it." };
  if (
    !transform.position.every(Number.isFinite) ||
    !Number.isFinite(transform.rotation)
  )
    return { ok: false, error: "Invalid placement." };
  return {
    ok: true,
    state: {
      ...state,
      placements: { ...state.placements, [id]: copy(transform) },
      fasteners: { ...state.fasteners, [id]: 0 },
    },
  };
}
export function snap(state: Assembly, id: string): Result {
  const error = alignError(state, id);
  if (error) return { ok: false, error };
  return move(state, id, partById[id].mount);
}
export function fasten(
  state: Assembly,
  id: string,
  tool: Tool,
  connector?: string,
): Result {
  if (state.installed.includes(id))
    return { ok: false, error: "This part is already installed." };
  const p = partById[id],
    missing = prerequisites(state, id),
    error = alignError(state, id, connector);
  if (missing.length)
    return {
      ok: false,
      error: `Install ${missing.map((x) => partById[x].name).join(", ")} first.`,
    };
  if (error) return { ok: false, error };
  if (tool !== p.tool)
    return {
      ok: false,
      error: `Select the ${p.tool === "torque" ? "torque wrench" : p.tool} for this connection.`,
    };
  const count = Math.min(p.fasteners, (state.fasteners[id] ?? 0) + 1);
  return {
    ok: true,
    state: {
      ...state,
      fasteners: { ...state.fasteners, [id]: count },
      installed:
        count >= p.fasteners ? [...state.installed, id] : state.installed,
    },
  };
}
export function remove(state: Assembly, id: string, tool: Tool): Result {
  if (id === "frame")
    return { ok: false, error: "The chassis is the project foundation." };
  if (!state.installed.includes(id))
    return { ok: false, error: "This part is not installed." };
  const dependents = parts.filter(
    (p) => state.installed.includes(p.id) && p.dependsOn.includes(id),
  );
  if (dependents.length)
    return {
      ok: false,
      error: `Remove ${dependents.map((p) => p.name).join(", ")} first.`,
    };
  if (tool !== partById[id].tool)
    return {
      ok: false,
      error: `Select the ${partById[id].tool} tool to detach this part.`,
    };
  return {
    ok: true,
    state: {
      ...state,
      installed: state.installed.filter((x) => x !== id),
      fasteners: { ...state.fasteners, [id]: 0 },
      placements: {
        ...state.placements,
        [id]: {
          position: [
            partById[id].mount.position[0] + 2.5,
            partById[id].mount.position[1],
            partById[id].mount.position[2],
          ],
          rotation: 0,
        },
      },
    },
  };
}
export function diagnostics(state: Assembly) {
  const checks = [
    {
      name: "Powertrain",
      ids: [
        "engine",
        "transmission",
        "driveshaft",
        "exhaust",
        "radiator",
        "tank",
      ],
    },
    { name: "Electrical", ids: ["battery", "lights"] },
    {
      name: "Running gear",
      ids: parts.filter((p) => p.category === "Chassis").map((p) => p.id),
    },
    {
      name: "Body & cabin",
      ids: ["cockpit", "body", "hood", "glass", "bumper", "trim"],
    },
  ];
  return checks.map((c) => ({
    name: c.name,
    ready: c.ids.every((id) => state.installed.includes(id)),
    missing: c.ids.filter((id) => !state.installed.includes(id)).length,
  }));
}
export function canStart(state: Assembly) {
  return diagnostics(state).every((c) => c.ready);
}
export type History = {
  past: Assembly[];
  present: Assembly;
  future: Assembly[];
};
export function commit(h: History, next: Assembly): History {
  return { past: [...h.past.slice(-79), h.present], present: next, future: [] };
}
export function undo(h: History): History {
  return h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past.at(-1)!,
        future: [h.present, ...h.future],
      }
    : h;
}
export function redo(h: History): History {
  return h.future.length
    ? {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
}
