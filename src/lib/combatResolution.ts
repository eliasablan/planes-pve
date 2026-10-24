import { playGameSound } from "@/lib/gameAudio";
import { finishLocalMatch } from "@/lib/matchLifecycle";
import { PlayerState, UserProfile, useGameStore } from "@/store/useGameStore";

export const DAMAGE = {
  machineGun: 10,
  missile: 65,
  zone: 15,
  collision: 100,
} as const;

export type WeaponKind = "mg" | "missile" | "zone" | "collision";

export type HitEvent = {
  victimId: string;
  victimName: string;
  killerId: string;
  killerName: string;
  damage: number;
  weapon: WeaponKind;
  matchId?: string | null;
};

export type KillEvent = {
  victimId: string;
  victimName: string;
  killerId: string;
  killerName: string;
  matchId?: string | null;
};

type ShotSnapshot = {
  roomName: string;
  shooterId: string;
  shooterName: string;
  position: [number, number, number];
  forward: [number, number, number];
};

const MG_RANGE = 900;
const MG_AIM_DOT = 0.985;
const KILL_SCORE = 100;

export function resolveMachineGunShot(snapshot: ShotSnapshot) {
  const state = useGameStore.getState();
  if (state.ammo <= 0) return { fired: false };

  state.useAmmo();

  const target = findTargetInReticle(
    Object.values(state.players),
    snapshot.shooterId,
    snapshot.position,
    snapshot.forward,
    MG_RANGE,
    MG_AIM_DOT
  );

  if (target) {
    void import("@/lib/realtimeRoom").then(({ publishHit }) => {
      void publishHit(snapshot.roomName, {
        victimId: target.id,
        victimName: target.username,
        killerId: snapshot.shooterId,
        killerName: snapshot.shooterName,
        damage: DAMAGE.machineGun,
        weapon: "mg",
        matchId: state.currentMatchId,
      });
    });
  }

  return { fired: true, targetId: target?.id };
}

export function resolveMissileFire() {
  const state = useGameStore.getState();
  if (state.missiles <= 0) return false;
  state.useMissile();
  return true;
}

export function resolveFlareUse() {
  const state = useGameStore.getState();
  if (state.flares <= 0) return false;
  state.useFlare();
  return true;
}

export function applyLocalDamage(damage: number, source: "enemy" | "environment" = "environment") {
  const state = useGameStore.getState();
  const nextHp = Math.max(0, state.hp - damage);
  state.setHp(nextHp);
  if (source === "enemy" && nextHp < state.hp) {
    playGameSound({ type: nextHp === 0 ? "enemy-fatal" : "enemy-hit" });
  }
  if (state.hp > 0 && nextHp === 0) {
    finishLocalMatch();
  }
  return { hp: nextHp, eliminated: state.hp > 0 && nextHp === 0 };
}

export function eliminateLocalPlayer() {
  const state = useGameStore.getState();
  if (state.hp <= 0) return { eliminated: false };
  state.setHp(0);
  finishLocalMatch();
  return { eliminated: true };
}

export async function resolveIncomingHit(
  roomName: string,
  localUser: Pick<UserProfile, "id" | "username">,
  hit: HitEvent
) {
  if (hit.victimId !== localUser.id) return;

  const outcome = applyLocalDamage(hit.damage);
  if (!outcome.eliminated) return;

  const kill: KillEvent = {
    victimId: localUser.id,
    victimName: localUser.username,
    killerId: hit.killerId,
    killerName: hit.killerName,
    matchId: hit.matchId,
  };

  recordKill(kill, localUser.id);
  const { publishKill } = await import("@/lib/realtimeRoom");
  await publishKill(roomName, kill);

  if (kill.matchId) {
    const { logKill } = await import("@/lib/matchLogging");
    await logKill(kill.matchId, kill.killerId, kill.victimId);
  }
}

export function recordKill(kill: KillEvent, localUserId?: string) {
  const state = useGameStore.getState();
  state.addKill(kill.killerName, kill.victimName);

  if (localUserId && kill.killerId === localUserId) {
    state.addLocalKill();
    state.addScore(KILL_SCORE);
  }
}

function findTargetInReticle(
  players: PlayerState[],
  shooterId: string,
  origin: [number, number, number],
  forward: [number, number, number],
  range: number,
  minDot: number
) {
  let best: { player: PlayerState; distance: number } | null = null;

  for (const player of players) {
    if (player.id === shooterId || !player.isAlive || player.hp <= 0) continue;

    const toTarget = subtract(player.position, origin);
    const distance = length(toTarget);
    if (distance <= 0 || distance > range) continue;

    const dot = dotProduct(normalize(toTarget), normalize(forward));
    if (dot < minDot) continue;

    if (!best || distance < best.distance) {
      best = { player, distance };
    }
  }

  return best?.player ?? null;
}

function subtract(a: [number, number, number], b: [number, number, number]) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as [number, number, number];
}

function length(v: [number, number, number]) {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function normalize(v: [number, number, number]) {
  const len = length(v);
  if (len === 0) return [0, 0, 0] as [number, number, number];
  return [v[0] / len, v[1] / len, v[2] / len] as [number, number, number];
}

function dotProduct(a: [number, number, number], b: [number, number, number]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
