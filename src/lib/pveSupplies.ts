import type { PickupKind, PickupState } from "../store/useGameStore";

export type SupplyResources = {
  ammo: number;
  maxAmmo: number;
  missiles: number;
  maxMissiles: number;
  hp: number;
  maxHp: number;
};

export function getPickupBenefit(kind: PickupKind, resources: SupplyResources): number {
  if (kind === "ammo") return Math.max(0, Math.min(60, resources.maxAmmo - resources.ammo));
  if (kind === "missile") return Math.max(0, Math.min(1, resources.maxMissiles - resources.missiles));
  return Math.max(0, Math.min(50, resources.maxHp - resources.hp));
}

export type UsefulPickup = {
  pickup: PickupState;
  amount: number;
  distance: number;
  dy: number;
  angle: number;
};

export function findUsefulPickup(
  pickups: Record<string, PickupState> | readonly PickupState[],
  resources: SupplyResources,
  position: readonly [number, number, number],
  heading: number,
  forwardOnly = false,
): UsefulPickup | null {
  let nearest: UsefulPickup | null = null;
  for (const pickup of Object.values(pickups)) {
    const amount = getPickupBenefit(pickup.kind, resources);
    if (amount <= 0) continue;
    const dx = pickup.position[0] - position[0];
    const dy = pickup.position[1] - position[1];
    const dz = pickup.position[2] - position[2];
    const distance = Math.hypot(dx, dy, dz);
    if (nearest && distance >= nearest.distance) continue;
    const bearing = Math.atan2(dx, -dz) * 180 / Math.PI + heading;
    const angle = ((bearing + 180) % 360 + 360) % 360 - 180;
    if (forwardOnly && Math.abs(angle) >= 90) continue;
    nearest = { pickup, amount, distance, dy, angle };
  }
  return nearest;
}
