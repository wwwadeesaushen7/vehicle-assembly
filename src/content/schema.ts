export type Vec3 = [number, number, number];
export type Transform = { position: Vec3; rotation: number };
export type Tool = "hand" | "wrench" | "torque" | "screwdriver" | "jack";
export type Category =
  | "Structure"
  | "Powertrain"
  | "Chassis"
  | "Electrical"
  | "Interior"
  | "Body";
export interface PartDefinition {
  id: string;
  name: string;
  category: Category;
  description: string;
  dependsOn: string[];
  mount: Transform;
  connector: string;
  tool: Tool;
  fasteners: number;
  torqueNm: number;
  mass: number;
  shape: string;
  side?: number;
  asset?: { url: string; license: string; attribution: string };
}
export interface VehicleDefinition {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  trim: string;
  category: string;
  drivetrain: string;
  propulsion: string;
  playable: boolean;
  assemblyKit: PartDefinition[];
  configuration: { wheelbase: number; paint: string };
  materials: string[];
  license: { name: string; author: string; source: string };
}
export const vehicleCategories = [
  "Sedans",
  "Hatchbacks",
  "Coupes",
  "SUVs",
  "Pickups",
  "Trucks",
  "Buses",
  "Vans",
  "Motorcycles",
  "Sports cars",
  "Supercars",
  "Electric vehicles",
  "Tractors",
  "Construction vehicles",
  "Bicycles",
  "Boats",
  "Aircraft",
];
export const futureManufacturers = [
  "BMW",
  "Audi",
  "Honda",
  "Toyota",
  "Mercedes-Benz",
  "Volkswagen",
  "Ford",
  "Chevrolet",
  "Nissan",
  "Porsche",
  "Ferrari",
  "Lamborghini",
  "Tesla",
  "Hyundai",
  "Kia",
  "Volvo",
];
