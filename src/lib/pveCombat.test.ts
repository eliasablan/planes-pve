import { describe, expect, test } from "bun:test";
import { firePveMachineGun, firePveMissile, findTargetLock } from "./pveCombat";
import { sampleTerrainHeight } from "./terrainHeight";

describe("terrain cover in PvE combat", () => {
  const origin: [number, number, number] = [200, 100, -260];
  const enemy = { id: "behind-ridge", position: [850, 100, -260] as [number, number, number] };
  const forward: [number, number, number] = [1, 0, 0];

  test("a missile cannot damage an enemy across a mountain even when both endpoints are airborne", () => {
    expect(sampleTerrainHeight(origin[0], origin[2])).toBeLessThan(origin[1]);
    expect(sampleTerrainHeight(enemy.position[0], enemy.position[2])).toBeLessThan(enemy.position[1]);
    expect(sampleTerrainHeight(520, -260)).toBeGreaterThan(100);
    const hits: string[] = [];
    firePveMissile({ enemies: [enemy], origin, forward, damagePveEnemy: (id) => hits.push(id) });
    expect(hits).toEqual([]);
  });

  test("the gun and targeting reticle also respect mountain cover", () => {
    const hits: string[] = [];
    firePveMachineGun({ enemies: [enemy], origin, forward, consumeAmmo() {}, damagePveEnemy: (id) => hits.push(id) });
    expect(hits).toEqual([]);
    expect(findTargetLock([enemy], origin, forward, "missile")).toBeNull();
  });

  test("a missile still deals 80 damage with a clear shot above the ridge", () => {
    const hits: number[] = [];
    firePveMissile({ enemies: [{ ...enemy, position: [850, 260, -260] }], origin: [200, 260, -260], forward, damagePveEnemy: (_, damage) => hits.push(damage) });
    expect(hits).toEqual([80]);
  });

  test("a hidden closer enemy does not steal a shot from a visible target", () => {
    const hits: string[] = [];
    const hidden = { id: "under-cover", position: [520, 100, -260] as [number, number, number] };
    const visible = { id: "clear-target", position: [1050, 260, -260] as [number, number, number] };
    firePveMissile({ enemies: [hidden, visible], origin: [200, 260, -260], forward, damagePveEnemy: (id) => hits.push(id) });
    expect(hits).toEqual([visible.id]);
    expect(findTargetLock([hidden, visible], [200, 260, -260], forward, "missile")?.id).toBe(visible.id);
  });
});
