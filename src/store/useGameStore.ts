import { playGameSound } from "../lib/gameAudio";
import { create } from "zustand";
import { getPickupBenefit } from "../lib/pveSupplies";
import { WORLD_TOPOLOGY } from "../lib/worldTopology";

export type KillLogEntry = {
  id: string;
  killer: string;
  victim: string;
  timestamp: number;
};

export type GameStatus = "idle" | "playing" | "finished";
export type EnemyRole = "scout" | "fighter" | "bomber";
export type PickupKind = "ammo" | "missile" | "repair";

export type EnemyState = {
  id: string;
  role: EnemyRole;
  position: [number, number, number];
  heading: number;
  hp: number;
  maxHp: number;
};

export type PickupState = {
  id: string;
  kind: PickupKind;
  position: [number, number, number];
};

export type PvePickupReceipt = {
  id: string;
  kind: PickupKind;
  amount: number;
  collectedAt: number;
};

const MAX_PICKUP_RECEIPTS = 32;

export type PveExplosion = {
  id: string;
  position: [number, number, number];
  color: string;
  timestamp: number;
};

export type EnemyHit = {
  kill: boolean;
  timestamp: number;
} | null;

export type TargetLock = {
  id: string;
  distance: number;
  // True when the selected weapon would hit this enemy if fired now.
  inSolution: boolean;
} | null;

export type DamageIndicator = {
  angle: number;
  intensity: number;
  timestamp: number;
} | null;

export type FlightSnapshot = {
  localPlayerPosition: [number, number];
  altitude: number;
  /** Height above the terrain surface directly below the aircraft (sea surface over water). */
  groundClearance: number;
  speed: number;
  pitch: number;
  roll: number;
  heading: number;
};

const INITIAL_FLIGHT: FlightSnapshot = {
  localPlayerPosition: [0, 0], altitude: 0, groundClearance: 0, speed: 0, pitch: 0, roll: 0, heading: 0,
};

interface GameState extends FlightSnapshot {
  // Player aircraft
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  missiles: number;
  maxMissiles: number;
  score: number;
  localKills: number;
  wave: number;
  enemiesRemaining: number;
  boundaryWarning: string | null;
  damageIndicator: DamageIndicator;
  lastEnemyHit: EnemyHit;
  targetLock: TargetLock;
  pveExplosions: PveExplosion[];
  pveEnemies: Record<string, EnemyState>;
  pvePickups: Record<string, PickupState>;
  pvePickupReceipts: PvePickupReceipt[];
  
  // Run context
  gameStatus: GameStatus;
  startTime: number | null;
  endTime: number | null;
  
  killLog: KillLogEntry[];
  
  selectedWeapon: 'mg' | 'missile';
  paused: boolean;
  
  // Actions
  setHp: (hp: number) => void;
  reduceHp: (amount: number) => void;
  setAmmo: (ammo: number) => void;
  useAmmo: () => void;
  setMissiles: (missiles: number) => void;
  useMissile: () => void;
  addScore: (points: number) => void;
  addLocalKill: () => void;
  setWave: (wave: number) => void;
  setEnemiesRemaining: (count: number) => void;
  setDamageIndicator: (indicator: DamageIndicator) => void;
  setTargetLock: (lock: TargetLock) => void;
  setPveEnemies: (enemies: Record<string, EnemyState>) => void;
  spawnPveEnemies: (enemies: EnemyState[]) => void;
  damagePveEnemy: (enemyId: string, damage: number) => void;
  setPvePickups: (pickups: Record<string, PickupState>) => void;
  spawnPvePickups: (pickups: PickupState[]) => void;
  collectPvePickup: (pickupId: string) => void;
  
  setSelectedWeapon: (weapon: 'mg' | 'missile') => void;
  setPaused: (paused: boolean) => void;
  publishFlight: (snapshot: FlightSnapshot) => void;
  setGameStatus: (status: GameStatus) => void;
  setStartTime: (time: number | null) => void;
  setEndTime: (time: number | null) => void;
  
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Defaults
  hp: 100,
  maxHp: 100,
  ammo: 120,
  maxAmmo: 180,
  missiles: 3,
  maxMissiles: 5,
  score: 0,
  localKills: 0,
  wave: 1,
  enemiesRemaining: 0,
  boundaryWarning: null,
  damageIndicator: null,
  lastEnemyHit: null,
  targetLock: null,
  pveExplosions: [],
  pveEnemies: {},
  pvePickups: {},
  pvePickupReceipts: [],
  
  gameStatus: "idle",
  startTime: null,
  endTime: null,
  
  killLog: [],

  ...INITIAL_FLIGHT,
  selectedWeapon: 'mg',
  paused: false,
  
  // Actions
  setHp: (hp) => set({ hp }),
  reduceHp: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
  setAmmo: (ammo) => set({ ammo }),
  useAmmo: () => set((state) => ({ ammo: Math.max(0, state.ammo - 1) })),
  setMissiles: (missiles) => set({ missiles }),
  useMissile: () => set((state) => ({ missiles: Math.max(0, state.missiles - 1) })),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  addLocalKill: () => set((state) => ({ localKills: state.localKills + 1 })),
  setWave: (wave) => set({ wave }),
  setEnemiesRemaining: (enemiesRemaining) => set({ enemiesRemaining }),
  setDamageIndicator: (damageIndicator) => set({ damageIndicator }),
  setTargetLock: (targetLock) => set((state) => {
    const current = state.targetLock;
    if (targetLock?.id === current?.id && targetLock?.inSolution === current?.inSolution &&
      (!targetLock || !current || Math.abs(targetLock.distance - current.distance) < 10)) return state;
    return { targetLock };
  }),
  setPveEnemies: (pveEnemies) => set({ pveEnemies, enemiesRemaining: Object.keys(pveEnemies).length }),
  spawnPveEnemies: (enemies) => set((state) => {
    const pveEnemies = { ...state.pveEnemies };
    for (const enemy of enemies) pveEnemies[enemy.id] = enemy;
    return { pveEnemies, enemiesRemaining: Object.keys(pveEnemies).length };
  }),
  damagePveEnemy: (enemyId, damage) => set((state) => {
    const enemy = state.pveEnemies[enemyId];
    if (!enemy) return {};

    const nextHp = enemy.hp - damage;
    const pveEnemies = { ...state.pveEnemies };
    let scoreGain = 0;
    let killGain = 0;
    let killLog = state.killLog;
    let pveExplosions = state.pveExplosions;
    const now = Date.now();

    if (nextHp <= 0) {
      delete pveEnemies[enemyId];
      scoreGain = enemy.role === "bomber" ? 260 : enemy.role === "fighter" ? 160 : 100;
      killGain = 1;
      killLog = [
        { id: crypto.randomUUID(), killer: "Solo Pilot", victim: enemy.role.toUpperCase(), timestamp: Date.now() },
        ...state.killLog.slice(0, 4),
      ];
      pveExplosions = [
        ...state.pveExplosions.filter((explosion) => now - explosion.timestamp < 1600).slice(-5),
        {
          id: crypto.randomUUID(),
          position: enemy.position,
          color: enemy.role === "bomber" ? "#f4c95d" : enemy.role === "fighter" ? "#f65f5f" : "#51d6a3",
          timestamp: now,
        },
      ];
    } else {
      pveEnemies[enemyId] = { ...enemy, hp: nextHp };
    }

    return {
      pveEnemies,
      enemiesRemaining: Object.keys(pveEnemies).length,
      score: state.score + scoreGain,
      localKills: state.localKills + killGain,
      killLog,
      pveExplosions,
      lastEnemyHit: { kill: nextHp <= 0, timestamp: now },
    };
  }),
  setPvePickups: (pvePickups) => set({ pvePickups }),
  spawnPvePickups: (pickups) => set((state) => {
    const pvePickups = { ...state.pvePickups };
    for (const pickup of pickups) pvePickups[pickup.id] = pickup;
    return { pvePickups };
  }),
  collectPvePickup: (pickupId) => {
    let collected: { kind: PickupKind; amount: number } | undefined;
    set((state) => {
      const pickup = state.pvePickups[pickupId];
      if (!pickup) return {};

      const { [pickupId]: removedPickup, ...pvePickups } = state.pvePickups;
      void removedPickup;

      const amount = getPickupBenefit(pickup.kind, state);
      collected = { kind: pickup.kind, amount };
      // Keep every collection in a burst, including boxes consumed at capacity.
      const pvePickupReceipts = [
        ...state.pvePickupReceipts.slice(-(MAX_PICKUP_RECEIPTS - 1)),
        { id: pickup.id, kind: pickup.kind, amount, collectedAt: Date.now() },
      ];

      if (pickup.kind === "ammo") {
        return { pvePickups, pvePickupReceipts, ammo: state.ammo + amount };
      }
      if (pickup.kind === "missile") {
        return { pvePickups, pvePickupReceipts, missiles: state.missiles + amount };
      }
      return { pvePickups, pvePickupReceipts, hp: state.hp + amount };
    });
    if (collected) {
      playGameSound({ type: collected.amount > 0 ? `pickup-${collected.kind}` : "pickup-full" });
    }
  },
  
  setSelectedWeapon: (selectedWeapon) => set((state) => state.selectedWeapon === selectedWeapon ? state : { selectedWeapon }),
  setPaused: (paused) => set({ paused }),
  publishFlight: (snapshot) => set((state) => {
    const [x, z] = snapshot.localPlayerPosition;
    const boundaryWarning = Math.hypot(x, z) > WORLD_TOPOLOGY.combatBoundary.warningRadius
      ? "Return to combat airspace" : null;
    const samePosition = x === state.localPlayerPosition[0] && z === state.localPlayerPosition[1];
    if (samePosition && snapshot.altitude === state.altitude && snapshot.groundClearance === state.groundClearance &&
      snapshot.speed === state.speed && snapshot.pitch === state.pitch && snapshot.roll === state.roll &&
      snapshot.heading === state.heading && boundaryWarning === state.boundaryWarning) return state;
    // Observers receive one coherent frame; retain position identity when only telemetry changes.
    return { ...snapshot, localPlayerPosition: samePosition ? state.localPlayerPosition : [x, z], boundaryWarning };
  }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setStartTime: (time) => set({ startTime: time }),
  setEndTime: (time) => set({ endTime: time }),

  resetGame: () => set({
    ...INITIAL_FLIGHT,
    hp: 100,
    ammo: 120,
    missiles: 3,
    score: 0,
    localKills: 0,
    wave: 1,
    enemiesRemaining: 0,
    boundaryWarning: null,
    damageIndicator: null,
    lastEnemyHit: null,
    targetLock: null,
    pveExplosions: [],
    pveEnemies: {},
    pvePickups: {},
    pvePickupReceipts: [],
    gameStatus: "idle",
    endTime: null,
    killLog: [],
    paused: false,
    selectedWeapon: "mg",
  })
}));
