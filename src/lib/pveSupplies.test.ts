import { beforeEach, describe, expect, test } from "bun:test";
import { useGameStore, type PickupState } from "../store/useGameStore";
import { resetLocalMatch, startLocalMatch } from "./matchLifecycle";
import { findUsefulPickup, getPickupBenefit } from "./pveSupplies";

const resources = { ammo: 120, maxAmmo: 180, missiles: 3, maxMissiles: 5, hp: 100, maxHp: 100 };
const pickup = (id: string, kind: PickupState["kind"], position: PickupState["position"] = [0, 0, 0]): PickupState => ({ id, kind, position });

describe("supply guidance", () => {
  test("benefits use the actual remaining capacity", () => {
    expect(getPickupBenefit("ammo", { ...resources, ammo: 170 })).toBe(10);
    expect(getPickupBenefit("repair", { ...resources, hp: 95 })).toBe(5);
    expect(getPickupBenefit("ammo", { ...resources, ammo: 0 })).toBe(60);
    expect(getPickupBenefit("repair", { ...resources, hp: 10 })).toBe(50);
    expect(getPickupBenefit("missile", resources)).toBe(1);
    expect(getPickupBenefit("missile", { ...resources, missiles: 5 })).toBe(0);
    expect(getPickupBenefit("ammo", { ...resources, ammo: 200 })).toBe(0);
  });

  test("chooses the nearest useful box in three dimensions and skips full resources", () => {
    const boxes = {
      repair: pickup("repair", "repair", [0, 0, -1]),
      high: pickup("high", "ammo", [0, 100, 0]),
      near: pickup("near", "missile", [0, 0, -50]),
      far: pickup("far", "ammo", [0, 0, -70]),
    };
    expect(findUsefulPickup(boxes, resources, [0, 0, 0], 0)?.pickup.id).toBe("near");
    expect(findUsefulPickup(boxes, { ...resources, ammo: 180, missiles: 5 }, [0, 0, 0], 0)).toBeNull();
    expect(findUsefulPickup({}, resources, [0, 0, 0], 0)).toBeNull();
  });

  test("forward guidance ignores boxes behind the aircraft without hiding useful boxes ahead", () => {
    const boxes = [pickup("behind", "ammo", [0, 0, 100]), pickup("ahead", "repair", [0, 0, -200])];
    const damaged = { ...resources, hp: 95 };
    expect(findUsefulPickup(boxes, damaged, [0, 0, 0], 0, true)?.pickup.id).toBe("ahead");
    expect(findUsefulPickup(boxes.slice(0, 1), damaged, [0, 0, 0], 0, true)).toBeNull();
    expect(findUsefulPickup(boxes, damaged, [0, 0, 0], 180, true)?.pickup.id).toBe("behind");
  });

  test("reports height, distance and signed heading-relative directions", () => {
    const box = pickup("right", "ammo", [13, 24, 30]);
    expect(findUsefulPickup([box], resources, [10, 20, 30], 0)).toEqual({
      pickup: box, amount: 60, distance: 5, dy: 4, angle: 90,
    });
    expect(findUsefulPickup([box], resources, [10, 20, 30], 300)?.angle).toBe(30);
    expect(findUsefulPickup([box], resources, [10, 20, 30], -450)?.angle).toBe(0);
    const below = findUsefulPickup([pickup("below", "ammo", [0, -5, -10])], resources, [0, 0, 0], 0);
    expect(below?.dy).toBe(-5);
    expect(below?.angle).toBe(0);
    expect(findUsefulPickup([pickup("left", "ammo", [-10, 0, 0])], resources, [0, 0, 0], 0)?.angle).toBe(-90);
    expect(findUsefulPickup([pickup("behind", "ammo", [0, 0, 10])], resources, [0, 0, 0], 0)?.angle).toBe(-180);
  });
});

describe("pickup collection receipts", () => {
  beforeEach(() => useGameStore.getState().resetGame());

  test("nearly full resources record only the amount restored", () => {
    const state = useGameStore.getState();
    state.setAmmo(170);
    state.setHp(95);
    state.spawnPvePickups([pickup("ammo", "ammo"), pickup("repair", "repair")]);
    state.collectPvePickup("ammo");
    state.collectPvePickup("repair");
    const after = useGameStore.getState();
    expect(after.ammo).toBe(180);
    expect(after.hp).toBe(100);
    expect(after.pvePickupReceipts.map(({ id, kind, amount }) => ({ id, kind, amount }))).toEqual([
      { id: "ammo", kind: "ammo", amount: 10 },
      { id: "repair", kind: "repair", amount: 5 },
    ]);
    expect(after.pvePickupReceipts.every((receipt) => receipt.collectedAt > 0)).toBe(true);
  });

  test("full boxes are consumed with zero receipts and duplicate calls do not collect again", () => {
    const state = useGameStore.getState();
    state.setAmmo(180);
    state.setMissiles(5);
    state.spawnPvePickups([pickup("a", "ammo"), pickup("m", "missile"), pickup("r", "repair")]);
    for (const id of ["a", "m", "r", "a", "m", "r", "missing"]) state.collectPvePickup(id);
    const after = useGameStore.getState();
    expect(after.pvePickups).toEqual({});
    expect(after.pvePickupReceipts.map(({ amount }) => amount)).toEqual([0, 0, 0]);
    expect([after.ammo, after.missiles, after.hp]).toEqual([180, 5, 100]);
  });

  test("collections in one synchronous batch retain separate receipts and sequential capacity", () => {
    const state = useGameStore.getState();
    state.setAmmo(100);
    state.spawnPvePickups([pickup("a", "ammo"), pickup("b", "ammo"), pickup("c", "ammo")]);
    ["a", "b", "c"].forEach(state.collectPvePickup);
    expect(useGameStore.getState().pvePickupReceipts.map(({ amount }) => amount)).toEqual([60, 20, 0]);
    expect(useGameStore.getState().ammo).toBe(180);
  });

  test("history stays bounded and restart clears supplies and receipts", () => {
    const state = useGameStore.getState();
    for (let i = 0; i < 40; i++) {
      state.spawnPvePickups([pickup(String(i), "missile")]);
      state.collectPvePickup(String(i));
    }
    expect(useGameStore.getState().pvePickupReceipts).toHaveLength(32);
    expect(useGameStore.getState().pvePickupReceipts[0].id).toBe("8");
    state.spawnPvePickups([pickup("remaining", "ammo")]);
    resetLocalMatch();
    startLocalMatch();
    const restarted = useGameStore.getState();
    expect(restarted.pvePickups).toEqual({});
    expect(restarted.pvePickupReceipts).toEqual([]);
    expect([restarted.ammo, restarted.missiles, restarted.hp]).toEqual([120, 3, 100]);
    expect(restarted.gameStatus).toBe("playing");
  });
});
