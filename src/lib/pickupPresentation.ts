import type { PickupKind } from "@/store/useGameStore";

/** Visual identity only; quantities and selection live in pveSupplies. */
export const PICKUP_PRESENTATION: Record<PickupKind, { color: string; label: string; unit: string }> = {
  ammo: { color: "#f4c95d", label: "Ammo", unit: "rounds" },
  missile: { color: "#65a6ff", label: "Missile", unit: "missile" },
  repair: { color: "#51d6a3", label: "Repair", unit: "health" },
};
