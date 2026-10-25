import { afterEach, beforeEach, expect, test } from "bun:test";
import { useGameStore, type FlightSnapshot } from "./useGameStore";
import { WORLD_TOPOLOGY } from "../lib/worldTopology";

const flight: FlightSnapshot = {
  localPlayerPosition: [4000.125, -12.25], altitude: 255.125, groundClearance: 237.75,
  speed: 420.125, pitch: 12.125, roll: -24.25, heading: 75.125,
};
let unsubscribe = () => {};
beforeEach(() => useGameStore.getState().resetGame());
afterEach(() => { unsubscribe(); useGameStore.getState().resetGame(); });

test("flight observers see position, full precision telemetry and boundary warning together", () => {
  const snapshots: ReturnType<typeof useGameStore.getState>[] = [];
  unsubscribe = useGameStore.subscribe(state => snapshots.push(state));
  useGameStore.getState().publishFlight(flight);
  expect(snapshots).toHaveLength(1);
  expect(snapshots[0]).toMatchObject({ ...flight, boundaryWarning: "Return to combat airspace" });
  expect(snapshots[0].hp).toBe(100);
  expect(snapshots[0].ammo).toBe(120);

  const radius = WORLD_TOPOLOGY.combatBoundary.warningRadius;
  useGameStore.getState().publishFlight({ ...flight, localPlayerPosition: [radius, 0] });
  expect(snapshots).toHaveLength(2);
  expect(snapshots[1]).toMatchObject({ localPlayerPosition: [radius, 0], boundaryWarning: null });
});

test("identical frames do not publish, while sub-display movement remains observable", () => {
  const state = useGameStore.getState();
  state.publishFlight(flight);
  const initial = useGameStore.getState();
  let publications = 0;
  unsubscribe = useGameStore.subscribe(() => publications++);
  state.publishFlight({ ...flight, localPlayerPosition: [...flight.localPlayerPosition] });
  expect(useGameStore.getState()).toBe(initial);
  expect(publications).toBe(0);
  state.publishFlight({ ...flight, altitude: flight.altitude + 0.001 });
  expect(publications).toBe(1);
  expect(useGameStore.getState().altitude).toBe(flight.altitude + 0.001);
  expect(useGameStore.getState().localPlayerPosition).toBe(initial.localPlayerPosition);
});

test("holding a weapon selection only publishes an actual change", () => {
  let publications = 0;
  unsubscribe = useGameStore.subscribe(() => publications++);
  const state = useGameStore.getState();
  state.setSelectedWeapon("mg");
  expect(publications).toBe(0);
  state.setSelectedWeapon("missile");
  state.setSelectedWeapon("missile");
  expect(publications).toBe(1);
  expect(useGameStore.getState().selectedWeapon).toBe("missile");
});

test("target publication preserves the ten metre threshold and immediately updates eligibility and identity", () => {
  const state = useGameStore.getState();
  let publications = 0;
  unsubscribe = useGameStore.subscribe(() => publications++);
  state.setTargetLock(null);
  state.setTargetLock({ id: "scout", distance: 500, inSolution: false });
  state.setTargetLock({ id: "scout", distance: 509, inSolution: false });
  expect(publications).toBe(1);
  expect(useGameStore.getState().targetLock?.distance).toBe(500);
  state.setTargetLock({ id: "scout", distance: 510, inSolution: false });
  state.setTargetLock({ id: "scout", distance: 511, inSolution: true });
  state.setTargetLock({ id: "fighter", distance: 511, inSolution: true });
  expect(publications).toBe(4);
  state.setTargetLock(null);
  state.setTargetLock(null);
  expect(publications).toBe(5);
  expect(useGameStore.getState().targetLock).toBeNull();
});

test("reset clears the previous run's flight and feedback in one observable snapshot", () => {
  const state = useGameStore.getState();
  state.publishFlight(flight);
  state.setTargetLock({ id: "scout", distance: 500, inSolution: true });
  state.setDamageIndicator({ angle: 1, intensity: 1, timestamp: 1000 });
  const snapshots: ReturnType<typeof useGameStore.getState>[] = [];
  unsubscribe = useGameStore.subscribe(next => snapshots.push(next));
  state.resetGame();
  expect(snapshots).toHaveLength(1);
  expect(snapshots[0]).toMatchObject({
    localPlayerPosition: [0, 0], altitude: 0, groundClearance: 0, speed: 0, pitch: 0, roll: 0, heading: 0,
    targetLock: null, boundaryWarning: null, damageIndicator: null, lastEnemyHit: null,
    pvePickupReceipts: [], killLog: [], gameStatus: "idle",
  });
});
