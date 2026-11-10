import { canStart, copy, type Assembly } from "../game/assembly";
export interface CollectionEntry {
  vehicleId: "fw-01";
  completedAt: string;
  assembly: Assembly;
}
export function collectVehicle(assembly: Assembly): CollectionEntry {
  if (!canStart(assembly))
    throw new Error("Only a complete vehicle can join the collection.");
  return {
    vehicleId: "fw-01",
    completedAt: new Date().toISOString(),
    assembly: copy(assembly),
  };
}
