import { create } from "zustand";

export type PlayerState = {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  hp: number;
  isAlive: boolean;
  lastUpdate: number;
};

export type KillLogEntry = {
  id: string;
  killer: string;
  victim: string;
  timestamp: number;
};

export type GameStatus = "lobby" | "countdown" | "playing" | "finished";

export type UserProfile = {
  id: string;
  username: string;
  total_kills: number;
  total_wins: number;
  ranking_points: number;
};

interface GameState {
  // Local Player
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  missiles: number;
  maxMissiles: number;
  flares: number;
  maxFlares: number;
  score: number;
  localKills: number;
  
  // Game Context
  gameStatus: GameStatus;
  currentMatchId: string | null;
  startTime: number | null;
  
  // Other Players
  players: Record<string, PlayerState>;
  killLog: KillLogEntry[];
  
  // Flight Data
  altitude: number;
  speed: number;
  pitch: number;
  roll: number;
  heading: number;
  zoneRadius: number;
  zoneCenter: [number, number]; // [x, z]
  targetZoneRadius: number;
  targetZoneCenter: [number, number];
  selectedWeapon: 'mg' | 'missile';
  showLargeMap: boolean;
  localPlayerPosition: [number, number];
  user: UserProfile | null;
  
  // Actions
  setHp: (hp: number) => void;
  reduceHp: (amount: number) => void;
  setAmmo: (ammo: number) => void;
  useAmmo: () => void;
  setMissiles: (missiles: number) => void;
  useMissile: () => void;
  setFlares: (flares: number) => void;
  useFlare: () => void;
  addScore: (points: number) => void;
  addLocalKill: () => void;
  
  setSelectedWeapon: (weapon: 'mg' | 'missile') => void;
  setShowLargeMap: (show: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setLocalPlayerPosition: (pos: [number, number]) => void;
  setFlightData: (data: { altitude: number, speed: number, pitch: number, roll: number, heading: number }) => void;
  setZoneData: (data: { radius: number, center: [number, number] }) => void;
  setTargetZoneData: (data: { radius: number, center: [number, number] }) => void;
  setGameStatus: (status: GameStatus) => void;
  setMatchId: (id: string | null) => void;
  setStartTime: (time: number | null) => void;
  
  updatePlayer: (id: string, state: Partial<PlayerState>) => void;
  removePlayer: (id: string) => void;
  addKill: (killer: string, victim: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Defaults
  hp: 100,
  maxHp: 100,
  ammo: 50,
  maxAmmo: 50,
  missiles: 2,
  maxMissiles: 2,
  flares: 2,
  maxFlares: 2,
  score: 0,
  localKills: 0,
  
  gameStatus: "lobby",
  currentMatchId: null,
  startTime: null,
  
  players: {},
  killLog: [],

  altitude: 0,
  speed: 0,
  pitch: 0,
  roll: 0,
  heading: 0,
  zoneRadius: 1000,
  zoneCenter: [0, 0],
  targetZoneRadius: 1000,
  targetZoneCenter: [0, 0],
  selectedWeapon: 'mg',
  showLargeMap: false,
  localPlayerPosition: [0, 0],
  user: null,
  
  // Actions
  setHp: (hp) => set({ hp }),
  reduceHp: (amount) => set((state) => ({ hp: Math.max(0, state.hp - amount) })),
  setAmmo: (ammo) => set({ ammo }),
  useAmmo: () => set((state) => ({ ammo: Math.max(0, state.ammo - 1) })),
  setMissiles: (missiles) => set({ missiles }),
  useMissile: () => set((state) => ({ missiles: Math.max(0, state.missiles - 1) })),
  setFlares: (flares) => set({ flares }),
  useFlare: () => set((state) => ({ flares: Math.max(0, state.flares - 1) })),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  addLocalKill: () => set((state) => ({ localKills: state.localKills + 1 })),
  
  setSelectedWeapon: (selectedWeapon) => set({ selectedWeapon }),
  setShowLargeMap: (showLargeMap) => set({ showLargeMap }),
  setUser: (user) => set({ user }),
  setLocalPlayerPosition: (localPlayerPosition) => set({ localPlayerPosition }),
  setFlightData: (data) => set(data),
  setZoneData: (data) => set({ zoneRadius: data.radius, zoneCenter: data.center }),
  setTargetZoneData: (data) => set({ targetZoneRadius: data.radius, targetZoneCenter: data.center }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setMatchId: (id) => set({ currentMatchId: id }),
  setStartTime: (time) => set({ startTime: time }),
  
  updatePlayer: (id, playerUpdate) => set((state) => {
    const existing = state.players[id] || {
      id,
      username: "Pilot",
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      hp: 100,
      isAlive: true,
      lastUpdate: Date.now()
    };
    
    return {
      players: {
        ...state.players,
        [id]: { ...existing, ...playerUpdate, lastUpdate: Date.now() }
      }
    };
  }),
  
  removePlayer: (id) => set((state) => {
    const { [id]: removedPlayer, ...remaining } = state.players;
    void removedPlayer;
    return { players: remaining };
  }),
  
  addKill: (killer, victim) => set((state) => ({
    killLog: [
      { id: crypto.randomUUID(), killer, victim, timestamp: Date.now() },
      ...state.killLog.slice(0, 4) // Keep last 5
    ]
  })),
  
  resetGame: () => set({
    hp: 100,
    ammo: 50,
    missiles: 2,
    flares: 2,
    score: 0,
    localKills: 0,
    gameStatus: "lobby",
    killLog: []
  })
}));
