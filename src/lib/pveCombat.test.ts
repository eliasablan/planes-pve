import { describe, expect, test } from "bun:test";
import { createPveFiring, type PveFiringState } from "./pveCombat";
import { sampleTerrainHeight } from "./terrainHeight";

type Position = [number, number, number];
const origin: Position = [0, 500, 0];
const forward: Position = [0, 0, -1];
const enemy = (id: string, position: Position) => ({ id, position });

function aircraft(overrides: Partial<PveFiringState> = {}) {
  const hits: { id: string; damage: number }[] = [];
  const events: string[] = [];
  const state: PveFiringState = {
    hp: 100, paused: false, selectedWeapon: "mg", ammo: 120, missiles: 3, pveEnemies: {},
    useAmmo: () => { state.ammo--; events.push("spend:mg"); },
    useMissile: () => { state.missiles--; events.push("spend:missile"); },
    damagePveEnemy: (id, damage) => { hits.push({ id, damage }); events.push(`hit:${id}`); },
    ...overrides,
  };
  const firing = createPveFiring({ getState: () => state, playSound: event => { events.push(event.type); } });
  const frame = (input: Partial<Parameters<typeof firing.update>[0]> = {}) =>
    firing.update({ now: 10_000, firing: true, origin, forward, ...input });
  return { state, hits, events, frame };
}

describe("Firing solution and committed shots", () => {
  for (const weapon of ["mg", "missile"] as const) {
    test(`${weapon}: reticle and hit agree on the enemy closest to the crosshair`, () => {
      const a = aircraft({ selectedWeapon: weapon, pveEnemies: {
        near: enemy("near", [30, 500, -200]),
        centered: enemy("centered", [0, 500, -500]),
      } });
      expect(a.frame()).toEqual({ lock: { id: "centered", distance: 500, inSolution: true }, fired: weapon });
      expect(a.hits).toEqual([{ id: "centered", damage: weapon === "mg" ? 12 : 80 }]);
      expect(a.state.ammo).toBe(weapon === "mg" ? 119 : 120);
      expect(a.state.missiles).toBe(weapon === "missile" ? 2 : 3);
    });
  }

  test("a centered preview outside gun range cannot hide an available firing solution", () => {
    const a = aircraft({ pveEnemies: {
      preview: enemy("preview", [0, 500, -1000]),
      hittable: enemy("hittable", [30, 500, -200]),
    } });
    expect(a.frame().lock).toMatchObject({ id: "hittable", inSolution: true });
    expect(a.hits[0]?.id).toBe("hittable");
  });

  test("a wider tracking preview never receives damage", () => {
    const a = aircraft({ pveEnemies: { preview: enemy("preview", [100, 500, -300]) } });
    expect(a.frame().lock).toMatchObject({ id: "preview", inSolution: false });
    expect(a.hits).toEqual([]);
    expect(a.state.ammo).toBe(119);
  });

  test("equally aligned targets use distance, independent of insertion order", () => {
    const a = aircraft({ pveEnemies: { far: enemy("far", [0, 500, -500]), near: enemy("near", [0, 500, -200]) } });
    expect(a.frame().lock?.id).toBe("near");
    expect(a.hits[0]?.id).toBe("near");
  });

  test("weapon ranges include their limit, and aim vectors are normalized", () => {
    for (const [weapon, range] of [["mg", 780], ["missile", 1200]] as const) {
      const a = aircraft({ selectedWeapon: weapon, pveEnemies: { edge: enemy("edge", [0, 500, -range]) } });
      expect(a.frame({ forward: [0, 0, -5] }).lock?.inSolution).toBe(true);
      expect(a.hits).toHaveLength(1);
      a.state.pveEnemies = { beyond: enemy("beyond", [0, 500, -range - 1]) };
      expect(a.frame({ now: 20_000 }).lock?.inSolution ?? false).toBe(false);
      expect(a.hits).toHaveLength(1);
    }
  });

  test("coincident enemies and zero aim vectors cannot produce a target", () => {
    const a = aircraft({ pveEnemies: { coincident: enemy("coincident", origin) } });
    expect(a.frame().lock).toBeNull();
    a.state.pveEnemies = { ahead: enemy("ahead", [0, 500, -200]) };
    expect(a.frame({ now: 20_000, forward: [0, 0, 0] }).lock).toBeNull();
    expect(a.hits).toEqual([]);
  });

  test("misses spend once, and idle tracking spends nothing", () => {
    const a = aircraft();
    expect(a.frame({ firing: false }).fired).toBeNull();
    expect(a.state.ammo).toBe(120);
    expect(a.frame().fired).toBe("mg");
    expect(a.state.ammo).toBe(119);
    expect(a.hits).toEqual([]);
    expect(a.events).toEqual(["spend:mg", "machine-gun"]);
  });

  test("dead or paused aircraft cannot spend resources, damage, or emit feedback", () => {
    for (const weapon of ["mg", "missile"] as const) {
      const a = aircraft({ selectedWeapon: weapon, paused: true, pveEnemies: { target: enemy("target", [0, 500, -200]) } });
      expect(a.frame().fired).toBeNull();
      a.state.paused = false;
      a.state.hp = 0;
      expect(a.frame().fired).toBeNull();
      expect(a.state.ammo).toBe(120);
      expect(a.state.missiles).toBe(3);
      expect(a.events).toEqual([]);
    }
  });

  test("cooldowns are independent, strict, and accept at most one shot per frame", () => {
    const a = aircraft();
    expect(a.frame({ now: 0 }).fired).toBe("mg");
    expect(a.frame({ now: 150 }).fired).toBeNull();
    a.state.selectedWeapon = "missile";
    expect(a.frame({ now: 150 }).fired).toBe("missile");
    a.state.selectedWeapon = "mg";
    expect(a.frame({ now: 151 }).fired).toBe("mg");
    a.state.selectedWeapon = "missile";
    expect(a.frame({ now: 2150 }).fired).toBeNull();
    expect(a.frame({ now: 2151 }).fired).toBe("missile");
    expect(a.frame({ now: 99_000 }).fired).toBe("missile");
    expect(a.frame({ now: 99_000 }).fired).toBeNull();
    expect(a.state.missiles).toBe(0);
  });

  test("pause preserves existing wall-clock cooldown behavior; a fresh aircraft starts fresh", () => {
    const a = aircraft({ selectedWeapon: "missile" });
    a.frame();
    a.state.paused = true;
    expect(a.frame({ now: 20_000 }).fired).toBeNull();
    a.state.paused = false;
    expect(a.frame({ now: 20_000 }).fired).toBe("missile");
    expect(aircraft({ selectedWeapon: "missile" }).frame().fired).toBe("missile");
  });

  test("final-resource shots preserve sound and damage ordering, without an immediate empty click", () => {
    for (const weapon of ["mg", "missile"] as const) {
      const a = aircraft({ selectedWeapon: weapon, ammo: 1, missiles: 1, pveEnemies: { target: enemy("target", [0, 500, -200]) } });
      a.frame();
      a.frame({ now: 20_000 });
      expect(a.events).toEqual(weapon === "mg"
        ? ["spend:mg", "hit:target", "machine-gun", "ammo-depleted"]
        : ["spend:missile", "missile", "ammo-depleted", "hit:target"]);
      expect(a.hits).toHaveLength(1);
    }
  });

  test("empty warnings are per weapon and trigger hold; release and resupply re-arm them", () => {
    const a = aircraft({ ammo: 0, missiles: 0 });
    for (let frame = 0; frame < 1000; frame++) a.frame();
    a.state.selectedWeapon = "missile";
    a.frame();
    a.state.selectedWeapon = "mg";
    a.frame();
    expect(a.events).toEqual(["weapon-empty", "weapon-empty"]);
    a.frame({ firing: false });
    a.frame();
    expect(a.events).toHaveLength(3);
    a.state.ammo = 1;
    a.frame();
    a.frame({ now: 20_000 });
    expect(a.events.slice(3)).toEqual(["spend:mg", "machine-gun", "ammo-depleted"]);
    expect(a.state.ammo).toBe(0);
  });
});

describe("terrain cover through the firing interface", () => {
  const origin: Position = [200, 100, -260];
  const forward: Position = [1, 0, 0];
  const covered = enemy("covered", [850, 100, -260]);

  test("airborne endpoints across a ridge cannot be locked or hit with either weapon", () => {
    expect(sampleTerrainHeight(origin[0], origin[2])).toBeLessThan(origin[1]);
    expect(sampleTerrainHeight(covered.position[0], covered.position[2])).toBeLessThan(covered.position[1]);
    expect(sampleTerrainHeight(520, -260)).toBeGreaterThan(100);
    for (const weapon of ["mg", "missile"] as const) {
      const a = aircraft({ selectedWeapon: weapon, pveEnemies: { covered } });
      expect(a.frame({ origin, forward }).lock).toBeNull();
      expect(a.hits).toEqual([]);
    }
  });

  test("a missile deals 80 damage with a clear shot above the ridge", () => {
    const a = aircraft({ selectedWeapon: "missile", pveEnemies: { clear: enemy("clear", [850, 260, -260]) } });
    a.frame({ origin: [200, 260, -260], forward });
    expect(a.hits).toEqual([{ id: "clear", damage: 80 }]);
  });

  test("a hidden closer enemy cannot steal either the reticle or hit from a visible target", () => {
    const a = aircraft({ selectedWeapon: "missile", pveEnemies: {
      hidden: enemy("hidden", [520, 100, -260]),
      visible: enemy("visible", [1050, 260, -260]),
    } });
    expect(a.frame({ origin: [200, 260, -260], forward }).lock?.id).toBe("visible");
    expect(a.hits).toEqual([{ id: "visible", damage: 80 }]);
  });
});
