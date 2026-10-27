import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { useGameStore, type EnemyRole, type EnemyState, type PickupKind } from "../store/useGameStore";
import { applyLocalDamage } from "./combatResolution";
import { pauseRun, resetRun, resumeRun } from "./runLifecycle";
import { ROLE_STATS } from "./pveRules";
import { minimumAirborneY, sampleTerrainHeight } from "./terrainHeight";
import { createWaveProgression } from "./waveProgression";
import { WORLD_TOPOLOGY } from "./worldTopology";
import { validateResult } from "../../worker/validation";

let now = 10_000;
let clock: ReturnType<typeof spyOn<typeof Date, "now">>;
const state = () => useGameStore.getState();

beforeEach(() => {
  resetRun();
  now = 10_000;
  clock = spyOn(Date, "now").mockImplementation(() => now);
  useGameStore.setState({ gameStatus: "playing", startTime: now, altitude: 505, localPlayerPosition: [0, -500] });
});
afterEach(() => { resetRun(); clock.mockRestore(); });

function enemy(id: string, role: EnemyRole = "scout", position: EnemyState["position"] = [0, 500, -550]): EnemyState {
  return { id, role, position, heading: 0, hp: ROLE_STATS[role].hp, maxHp: ROLE_STATS[role].hp };
}

function scenario(enemies?: EnemyState[]) {
  if (enemies) state().spawnPveEnemies(enemies);
  const damage: number[] = [];
  const progression = createWaveProgression({
    getState: state,
    applyDamage: amount => { damage.push(amount); applyLocalDamage(amount, "enemy"); },
  });
  const step = (ms = 0, delta = 0) => {
    now += ms;
    progression.update({ now, delta });
    return state();
  };
  const pauseFor = (ms: number, renderWhilePaused = false) => {
    pauseRun();
    if (renderWhilePaused) step(ms); else now += ms;
    resumeRun();
  };
  step();
  return { step, pauseFor, damage };
}

function clearWave() {
  for (const id of Object.keys(state().pveEnemies)) state().damagePveEnemy(id, 1000);
}

function addPickup(id: string, kind: PickupKind, position: [number, number, number] = [0, 500, -500]) {
  state().spawnPvePickups([{ id, kind, position }]);
}

describe("Wave progression through the frame interface", () => {
  test("enemy numbers keep growing at least every three waves through wave 30", () => {
    const run = scenario();
    const counts: number[] = [];
    for (let wave = 1; wave <= 30; wave++) {
      counts.push(Object.keys(state().pveEnemies).length);
      clearWave();
      run.step();
      run.step(2400);
    }
    for (let wave = 4; wave <= 30; wave++) {
      expect(counts[wave - 1], `enemy count at wave ${wave} versus wave ${wave - 3}`).toBeGreaterThan(counts[wave - 4]);
    }
  });

  test("wave 30 spawns closer to the map center than wave 15", () => {
    const distances = [15, 30].map(wave => {
      useGameStore.setState({ wave, pveEnemies: {} });
      scenario();
      const enemies = Object.values(state().pveEnemies);
      return enemies.reduce((sum, e) => sum + Math.hypot(e.position[0], e.position[2]), 0) / enemies.length;
    });
    expect(distances[1]).toBeLessThan(distances[0]);
  });

  test("initializes one wave and keeps its role composition and terrain clearance", () => {
    const compositions = [
      [1, ["scout", "fighter", "bomber"]],
      [3, ["scout", "fighter", "bomber", "fighter"]],
      [5, ["scout", "fighter", "bomber", "fighter", "scout"]],
      [11, ["scout", "fighter", "bomber", "fighter", "scout", "bomber", "fighter", "scout"]],
    ] as const;
    for (const [wave, roles] of compositions) {
      useGameStore.setState({ wave, pveEnemies: {} });
      const run = scenario();
      const enemies = Object.values(state().pveEnemies);
      expect(enemies.map(e => e.role)).toEqual([...roles]);
      for (const e of enemies) {
        expect(e.hp).toBe(ROLE_STATS[e.role].hp);
        expect(e.position[1]).toBeGreaterThanOrEqual(minimumAirborneY(e.position[0], e.position[2], 30));
      }
      run.step();
      expect(Object.keys(state().pveEnemies)).toEqual(enemies.map(e => e.id));
      expect(state().score).toBe(0);
    }
  });

  test("accelerates enemy growth after wave 17 and caps simultaneous aircraft at 24", () => {
    for (const [wave, count] of [[1, 3], [3, 4], [11, 8], [17, 11], [18, 12], [20, 14], [30, 24], [100, 24], [10_000, 24]]) {
      useGameStore.setState({ wave, pveEnemies: {} });
      scenario();
      expect(Object.values(state().pveEnemies), `wave ${wave}`).toHaveLength(count);
    }
  });

  test("centers the spawn radius on the map while orienting the arc with the aircraft heading", () => {
    for (const heading of [0, 90, 180, 270, -90, 450]) {
      useGameStore.setState({ pveEnemies: {}, localPlayerPosition: [1300, -900], altitude: 805, heading });
      scenario();
      const angle = heading * Math.PI / 180;
      const enemies = Object.values(state().pveEnemies);
      expect(enemies).toHaveLength(3);
      for (const e of enemies) {
        const dx = e.position[0];
        const dz = e.position[2];
        const distance = Math.hypot(dx, dz);
        expect(distance).toBeCloseTo(500);
        const forwardAlignment = (-dx * Math.sin(angle) - dz * Math.cos(angle)) / distance;
        expect(forwardAlignment).toBeGreaterThanOrEqual(Math.cos(70 * Math.PI / 180) - 1e-9);
        expect(Math.abs(e.position[1] - 800)).toBeLessThanOrEqual(24);
      }
    }
  });

  test("later waves use staggered bands measured from the map center", () => {
    for (const [wave, near, far] of [[1, 500, 500], [3, 480, 480], [5, 460, 520], [11, 400, 460], [20, 310, 370], [30, 240, 300], [50, 240, 300], [10_000, 240, 300]]) {
      useGameStore.setState({ wave, pveEnemies: {}, localPlayerPosition: [-1200, 700] });
      scenario();
      const distances = Object.values(state().pveEnemies).map(e => Math.hypot(e.position[0], e.position[2]));
      expect(Math.min(...distances)).toBeCloseTo(near);
      expect(Math.max(...distances)).toBeCloseTo(far);
    }
  });

  test("flying beyond the boundary does not move the spawn rings away from the map center", () => {
    const limit = WORLD_TOPOLOGY.combatBoundary.damageRadius;
    for (const bearing of [0, Math.PI / 4, Math.PI, -Math.PI / 2]) {
      for (const heading of [0, 90, 180, 270]) {
        const x = Math.cos(bearing) * (limit + 250);
        const z = Math.sin(bearing) * (limit + 250);
        useGameStore.setState({ wave: 50, pveEnemies: {}, localPlayerPosition: [x, z], heading });
        scenario();
        const enemies = Object.values(state().pveEnemies);
        expect(enemies).toHaveLength(24);
        for (const e of enemies) {
          expect(Math.hypot(e.position[0], e.position[2])).toBeLessThanOrEqual(limit - 50 + 1e-8);
          const radius = Math.hypot(e.position[0], e.position[2]);
          expect(radius).toBeGreaterThanOrEqual(240 - 1e-8);
          expect(radius).toBeLessThanOrEqual(300 + 1e-8);
          expect(e.position[1]).toBeGreaterThanOrEqual(minimumAirborneY(e.position[0], e.position[2], 30));
          for (const other of enemies) {
            if (e.id !== other.id) expect(Math.hypot(e.position[0] - other.position[0], e.position[2] - other.position[2])).toBeGreaterThan(50);
          }
        }
      }
    }
  });

  test("awards one clear bonus, keeps supplies, and spawns the next wave at 2.4 seconds", () => {
    const run = scenario();
    clearWave();
    expect(state().score).toBe(520);
    run.step(100);
    expect(state().score).toBe(725);
    const supplyIds = Object.keys(state().pvePickups);
    expect(supplyIds).toHaveLength(1);
    expect(state().wave).toBe(1);
    run.step(2399);
    expect(state().score).toBe(725);
    expect(state().pveEnemies).toEqual({});
    // Flying during the break changes heading and altitude, but the spawn center stays fixed.
    useGameStore.setState({ localPlayerPosition: [1000, -700], altitude: 805, heading: 90 });
    run.step(1, 1);
    expect(state().wave).toBe(2);
    expect(Object.keys(state().pveEnemies)).toHaveLength(3);
    expect(Object.keys(state().pvePickups)).toEqual(supplyIds);
    // A new wave has not moved in the frame that spawned it.
    const first = Object.values(state().pveEnemies)[0];
    expect(Math.hypot(first.position[0], first.position[2])).toBeCloseTo(490);
    expect(Math.abs(first.position[1] - 800)).toBeLessThanOrEqual(24);
    run.step(16, 1);
    expect(state().pveEnemies[first.id].position).not.toEqual(first.position);
  });

  test("recovery crates follow the cleared wave and spawn ahead with terrain clearance", () => {
    for (const [wave, kinds] of [[1, ["ammo"]], [2, ["ammo", "repair"]], [5, ["ammo", "missile"]], [10, ["ammo", "missile", "repair"]]] as const) {
      useGameStore.setState({ wave, pveEnemies: {}, pvePickups: {}, heading: 90, localPlayerPosition: [600, 0], altitude: 50 });
      const run = scenario();
      clearWave();
      run.step();
      const pickups = Object.values(state().pvePickups);
      expect(pickups.map(p => p.kind)).toEqual([...kinds]);
      pickups.forEach((p, index) => {
        expect(p.position[0]).toBeCloseTo(600 - 200 - index * 100);
        expect(p.position[2]).toBeCloseTo(0);
        expect(p.position[1]).toBeGreaterThanOrEqual(minimumAirborneY(p.position[0], p.position[2], 28));
      });
    }
  });

  for (const renderWhilePaused of [false, true]) {
    test(`pause preserves the inter-wave wait (${renderWhilePaused ? "with" : "without"} a paused frame)`, () => {
      const run = scenario();
      clearWave();
      run.step();
      run.step(1000);
      const before = state();
      run.pauseFor(60_000, renderWhilePaused);
      expect(state().score).toBe(before.score);
      expect(state().pvePickups).toEqual(before.pvePickups);
      run.step(1399);
      expect(state().wave).toBe(1);
      run.step(1);
      expect(state().wave).toBe(2);
    });
  }

  test("emergency resupply waits five active seconds, permits missiles, and does not duplicate crates", () => {
    state().setAmmo(0);
    const run = scenario();
    run.step(2000);
    run.pauseFor(30_000);
    run.step(2999);
    expect(state().pvePickups).toEqual({});
    run.step(1);
    const crate = Object.values(state().pvePickups)[0];
    expect(crate.kind).toBe("ammo");
    expect(state().ammo).toBe(0);
    expect(state().missiles).toBe(3);
    run.step(10_000);
    expect(Object.keys(state().pvePickups)).toEqual([crate.id]);
    state().publishFlight({ localPlayerPosition: [crate.position[0], crate.position[2]], altitude: crate.position[1] + 5, groundClearance: 500, speed: 0, pitch: 0, roll: 0, heading: 0 });
    run.step();
    expect(state().ammo).toBe(60);
    expect(state().pvePickups).toEqual({});
  });

  test("recovering ammo or finding any ammo crate cancels the continuous shortage wait", () => {
    const run = scenario();
    state().setAmmo(0);
    run.step();
    run.step(4000);
    state().setAmmo(1);
    run.step();
    state().setAmmo(0);
    run.step();
    run.step(4999);
    expect(state().pvePickups).toEqual({});
    addPickup("far-crate", "ammo", [1000, 500, 1000]);
    run.step(1);
    state().setPvePickups({});
    run.step();
    run.step(4999);
    expect(state().pvePickups).toEqual({});
    run.step(1);
    expect(Object.values(state().pvePickups).map(p => p.kind)).toEqual(["ammo"]);
  });

  test("wave clear cancels the emergency wait and supplies recovery only once", () => {
    state().setAmmo(0);
    const run = scenario();
    run.step(4999);
    clearWave();
    run.step(1);
    expect(Object.keys(state().pvePickups)).toHaveLength(1);
    run.step(1000);
    expect(Object.keys(state().pvePickups)).toHaveLength(1);
  });

  test("start grace and strict attack intervals exclude paused time", () => {
    const run = scenario([enemy("scout")]);
    run.step(3000);
    run.pauseFor(60_000);
    run.step(3500);
    expect(state().hp).toBe(100);
    run.step(1);
    expect(state().hp).toBe(97);
    run.step(1000);
    run.pauseFor(30_000, true);
    run.step(1300);
    expect(state().hp).toBe(97);
    run.step(1);
    expect(state().hp).toBe(94);
  });

  for (const [role, burst, damage, reload] of [["scout", 2, 3, 4200], ["fighter", 3, 5, 5200], ["bomber", 1, 8, 6800]] as const) {
    test(`${role} closes into firing range and attacks a stationary pilot`, () => {
      const run = scenario([enemy(role, role, [0, 500, -950])]);
      for (let frame = 0; frame < 1800; frame++) run.step(1000 / 60, 1 / 60);
      expect(run.damage.length).toBeGreaterThan(0);
      expect(run.damage.every(amount => amount === damage)).toBe(true);
      const position = state().pveEnemies[role].position;
      expect(Math.hypot(position[0], position[1] - 500, position[2] + 500)).toBeLessThan(ROLE_STATS[role].range);
    });

    test(`${role} uses its burst, waits its full active reload, and never catches up missed attacks`, () => {
      const run = scenario([enemy(role, role)]);
      run.step(6501);
      for (let i = 1; i < burst; i++) run.step(2301);
      expect(state().hp).toBe(100 - burst * damage);
      run.step(1000);
      run.pauseFor(40_000);
      run.step(reload - 1001);
      expect(state().hp).toBe(100 - burst * damage);
      run.step(1);
      expect(state().hp).toBe(100 - (burst + 1) * damage);
      run.step(60_000);
      expect(run.damage).toHaveLength(burst + 2);
    });
  }

  test("attacks use fresh health and defeat prevents repair or later attack feedback", () => {
    state().setHp(6);
    const run = scenario([
      enemy("first", "scout", [-20, 500, -540]),
      enemy("fatal", "fighter", [20, 500, -540]),
      enemy("after", "bomber", [0, 500, -540]),
    ]);
    addPickup("repair", "repair");
    run.step(6501);
    expect(run.damage).toEqual([3, 5]);
    expect(state().hp).toBe(0);
    expect(state().gameStatus).toBe("finished");
    expect(state().endTime).toBe(now);
    expect(state().damageIndicator?.intensity).toBe(0.78);
    expect(state().pvePickups.repair).toBeDefined();
    expect(state().pvePickupReceipts).toEqual([]);
    run.step(60_000);
    expect(run.damage).toEqual([3, 5]);
  });

  test("a surviving pilot collects after damage, with sequential capacity-limited benefits", () => {
    state().setHp(10);
    state().setAmmo(100);
    const run = scenario([enemy("scout")]);
    addPickup("repair", "repair");
    addPickup("ammo-a", "ammo");
    addPickup("ammo-b", "ammo");
    addPickup("ammo-c", "ammo");
    run.step(6501);
    expect(state().hp).toBe(57);
    expect(state().ammo).toBe(180);
    expect(state().pvePickupReceipts.map(p => [p.kind, p.amount])).toEqual([["repair", 50], ["ammo", 60], ["ammo", 20], ["ammo", 0]]);
  });

  test("attack range and pickup distance remain strict limits", () => {
    const run = scenario([enemy("edge", "scout", [0, 500, -625])]);
    addPickup("edge", "ammo", [0, 500, -585]);
    run.step(6501);
    expect(run.damage).toEqual([]);
    expect(state().pvePickups.edge).toBeDefined();
    state().setPveEnemies({ near: enemy("near", "scout", [0, 500, -624]) });
    state().setPvePickups({ near: { id: "near", kind: "ammo", position: [0, 500, -584] } });
    run.step();
    expect(run.damage).toEqual([3]);
    expect(state().pvePickups).toEqual({});
  });

  test("low flight uses the aircraft's actual altitude for enemy firing range", () => {
    useGameStore.setState({ localPlayerPosition: [1500, 0], altitude: 55 });
    const run = scenario([enemy("high", "scout", [1500, 200, 0])]);
    run.step(6501);
    expect(run.damage).toEqual([]);
    useGameStore.setState({ altitude: 205 });
    run.step(1);
    expect(run.damage).toEqual([3]);
  });

  test("terrain cover blocks nearby enemy fire", () => {
    const ground = sampleTerrainHeight(400, -300);
    const enemyY = minimumAirborneY(550, -300, 30);
    // Both aircraft are airborne and within Bomber range, on opposite sides of a ridge.
    expect(Math.hypot(150, enemyY - (ground + 5))).toBeLessThan(ROLE_STATS.bomber.range);
    useGameStore.setState({ localPlayerPosition: [400, -300], altitude: ground + 10 });
    const run = scenario([enemy("covered", "bomber", [550, enemyY, -300])]);
    run.step(6501);
    expect(run.damage).toEqual([]);
    // The same horizontal separation permits a hit above the ridge.
    useGameStore.setState({ altitude: 305, pveEnemies: { clear: enemy("clear", "bomber", [550, 300, -300]) } });
    run.step(1);
    expect(run.damage).toEqual([8]);
  });

  test("inactive, defeated, and paused runs do not initialize or advance gameplay", () => {
    const progression = createWaveProgression({ getState: state, applyDamage: () => { throw new Error("Unexpected damage"); } });
    for (const change of [{ gameStatus: "idle" as const }, { gameStatus: "finished" as const }, { hp: 0 }, { paused: true }, { startTime: null }]) {
      useGameStore.setState({ gameStatus: "playing", hp: 100, paused: false, startTime: now, ...change });
      progression.update({ now: now + 60_000, delta: 1 });
      expect(state().pveEnemies).toEqual({});
      expect(state().pvePickups).toEqual({});
      expect(state().score).toBe(0);
    }
  });

  test("reset and a new progression instance discard pending waits and old supplies", () => {
    const oldRun = scenario();
    clearWave();
    oldRun.step();
    resetRun();
    useGameStore.setState({ gameStatus: "playing", startTime: now });
    const fresh = scenario();
    fresh.step(2400);
    expect(state().wave).toBe(1);
    expect(state().score).toBe(0);
    expect(state().pvePickups).toEqual({});
    expect(Object.keys(state().pveEnemies)).toHaveLength(3);
    expect([state().hp, state().ammo, state().missiles]).toEqual([100, 120, 3]);
  });

  test("gameplay results stay acceptable to Worker validation before and after each clear", () => {
    const run = scenario();
    const assertValid = () => {
      const s = state();
      const result = { score: s.score, wave: s.wave, kills: s.localKills, durationMs: now - (s.startTime ?? now), status: "completed" as const };
      expect(validateResult(result, now - 10_000)).toEqual(result);
    };
    for (let wave = 1; wave <= 30; wave++) {
      assertValid();
      for (const id of Object.keys(state().pveEnemies)) {
        state().damagePveEnemy(id, 1000);
        assertValid();
      }
      run.step();
      assertValid();
      run.pauseFor(1000);
      run.step(2400);
      assertValid();
    }
  });
});
