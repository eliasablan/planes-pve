"use client";

import { useGameStore } from "@/store/useGameStore";
import { PickupIcon } from "@/components/ui/PickupIcon";
import { PICKUP_PRESENTATION } from "@/lib/pickupPresentation";
import { findUsefulPickup } from "@/lib/pveSupplies";
import { CombatRadar } from "./CombatRadar";
import { GameDisplayControls, type DisplaySettings } from "./GameDisplayControls";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Crosshair, Gauge, HeartPulse, Rocket, Shell, Target } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function HUD({ display, onDisplayChange }: { display: DisplaySettings; onDisplayChange: (settings: DisplaySettings) => void }) {
  const {
    hp,
    maxHp,
    ammo,
    maxAmmo,
    missiles,
    maxMissiles,
    score,
    altitude,
    groundClearance,
    speed,
    heading,
    selectedWeapon,
    wave,
    enemiesRemaining,
    boundaryWarning,
    localPlayerPosition,
    pveEnemies,
    pvePickups,
    pvePickupReceipts,
    damageIndicator,
    lastEnemyHit,
    targetLock,
    killLog,
  } = useGameStore();
  const supply = findUsefulPickup(
    pvePickups,
    { ammo, maxAmmo, missiles, maxMissiles, hp, maxHp },
    [localPlayerPosition[0], altitude - 5, localPlayerPosition[1]],
    heading,
    true,
  );
  const inSolution = Boolean(targetLock?.inSolution);
  const isLowHealth = hp < 30;

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, []);

  const hitAge = damageIndicator ? now - damageIndicator.timestamp : Number.POSITIVE_INFINITY;
  const hitOpacity = damageIndicator ? Math.max(0, 1 - hitAge / 850) * damageIndicator.intensity : 0;

  // Track wave changes during render instead of in an effect.
  const [seenWave, setSeenWave] = useState(wave);
  const [waveAnnouncedAt, setWaveAnnouncedAt] = useState<number | null>(null);
  if (wave !== seenWave) {
    setSeenWave(wave);
    setWaveAnnouncedAt(wave > seenWave ? now : null);
  }
  const waveAnnouncement = waveAnnouncedAt !== null && now - waveAnnouncedAt < 2600 ? wave : null;

  const visibleReceipts = pvePickupReceipts.filter((receipt) => now - receipt.collectedAt < 3200);
  const visibleKills = killLog.filter((k) => now - k.timestamp < 3200);
  const notifications = [
    ...visibleKills.map(kill => ({ type: "kill" as const, key: `kill:${kill.id}`, timestamp: kill.timestamp, kill })),
    ...visibleReceipts.map(receipt => ({ type: "pickup" as const, key: `pickup:${receipt.id}`, timestamp: receipt.collectedAt, receipt })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const enemyHitAge = lastEnemyHit ? now - lastEnemyHit.timestamp : Number.POSITIVE_INFINITY;
  const enemyHitWindow = lastEnemyHit?.kill ? 560 : 320;
  const enemyHitOpacity = Math.max(0, 1 - enemyHitAge / enemyHitWindow);

  return (
    <div data-combat-hud style={{ width: `${10000 / display.hudScale}%`, height: `${10000 / display.hudScale}%`, transform: `scale(${display.hudScale / 100})`, transformOrigin: "top left" }} className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-4 font-mono text-white sm:p-6">
      <style>{`
        [data-hud-metrics] > div, [data-hud-flight] > div, [data-hud-weapons] > div:not([data-display-controls]) { background-color: rgb(5 7 10 / .8); }
        [data-hud-radar-panel] { width: 184px; order: 2; }
        [data-hud-notifications] { top: 244px; }
        [data-display-controls] { min-height: 56px; }
        @media (min-width: 1920px) {
          [data-hud-radar-panel] { width: 216px; }
          [data-hud-notifications] { top: 280px; width: 256px; }
        }
        @media (max-width: 639px) {
          [data-hud-radar-panel] { width: 126px; }
          [data-hud-notifications] { top: 180px; }
        }
        @media (max-height: 500px) {
          [data-hud-metrics] { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
          [data-hud-radar-panel] { position: absolute; left: 0; top: 68px; width: 116px; padding: 4px; }
          [data-hud-resources] { gap: 8px; }
          [data-hud-flight], [data-hud-weapons] { flex-wrap: nowrap; gap: 5px; }
          [data-hud-flight] > div, [data-hud-weapons] > div { min-width: 0; padding: 6px; }
          [data-hud-health] { width: 116px; }
          [data-hud-health] > div:first-child { gap: 4px; font-size: 9px; }
          [data-hud-weapons] { margin-left: auto; }
          [data-display-controls] { min-height: 44px; padding: 0 !important; }
          [data-display-controls] > button { width: 30px; }
          [data-hud-notifications] { top: 232px; left: 24px; right: auto; width: 300px; gap: 3px; }
          [data-hud-notifications] [role="log"] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; }
          [data-hud-notifications] [role="log"] svg { width: 12px; height: 12px; }
          [data-hud-weapons] > div > div:first-child { white-space: nowrap; font-size: 9px; letter-spacing: 0; }
          [data-hud-notifications] [role="log"] > div { padding: 3px 5px; font-size: 10px; }
        }
        @media (max-width: 639px) and (max-height: 360px) {
          [data-hud-radar-panel] { width: 80px; }
          [data-hud-radar-panel] > div { font-size: 8px; white-space: nowrap; gap: 2px; }
          [data-hud-notifications] { top: 188px; left: 16px; }
        }
        @media (max-width: 360px) and (min-height: 501px) {
          [data-combat-hud] { padding: 12px; }
          [data-hud-metrics] { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; width: calc(100vw - 24px); }
          [data-hud-metrics] > div { min-width: 0; padding: 8px; }
          [data-hud-metrics] > div > div:first-child { font-size: 9px; letter-spacing: 1px; }
          [data-hud-metrics] > div > div:last-child { font-size: 20px; }
          [data-hud-radar-panel] { position: absolute; left: 0; top: 68px; padding: 4px; width: 106px; }
          [data-hud-notifications] { left: 12px; right: auto; top: 210px; width: calc(100% - 24px); gap: 3px; }
          [data-hud-notifications] [role="log"] > div { padding: 3px 5px; font-size: 9px; white-space: nowrap; gap: 4px; }
          [data-hud-notifications] [role="log"] svg { width: 14px; height: 14px; }
          [data-hud-flight], [data-hud-weapons] { flex-wrap: nowrap; gap: 6px; }
          [data-hud-flight] > div { min-width: 0; flex: 1; padding: 6px; }
          [data-hud-flight] > [data-hud-health] { flex: 1.4; }
          [data-hud-health] > div:first-child > span:last-child { font-size: 20px; }
          [data-hud-health] > div:first-child > span:first-child svg { display: none; }
          [data-hud-flight] > div > div:first-child { font-size: 9px; letter-spacing: 0; }
          [data-hud-weapons] > div { flex: 1; min-width: 0; padding: 6px; }
          [data-display-controls] { flex: none !important; min-height: 44px; padding: 0 !important; }
          [data-display-controls] > button { width: 30px; }
        }
      `}</style>
      {/* Health vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: Math.max(0, (100 - hp) / 100),
          background: "radial-gradient(circle, transparent 42%, rgba(246,95,95,0.24) 100%)",
        }}
      />

      {/* Critical health pulse border */}
      {isLowHealth && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 60px rgba(246,95,95,0.22)",
            animation: "title-flicker 1.6s ease-in-out infinite",
          }}
        />
      )}

      {/* Damage direction flash */}
      {damageIndicator && hitOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: hitOpacity,
            background: hitGradient(damageIndicator.angle),
            boxShadow: `inset 0 0 ${24 + hitOpacity * 48}px rgba(246,95,95,${0.28 + hitOpacity * 0.34})`,
          }}
        />
      )}

      {/* Wave announcement */}
      {waveAnnouncement !== null && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
          style={{ animation: "wave-announce 2.6s ease-out forwards" }}
        >
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.5em] text-[#f4c95d]/70">
              Incoming
            </div>
            <div
              className="mt-2 text-7xl font-black uppercase leading-none sm:text-8xl"
              style={{ textShadow: "0 0 80px rgba(244,201,93,0.55), 0 0 30px rgba(244,201,93,0.3)" }}
            >
              Wave {waveAnnouncement}
            </div>
            <div className="mt-3 text-[11px] font-black uppercase tracking-[0.38em] text-white/40">
              Eliminate all contacts
            </div>
          </div>
        </div>
      )}

      {/* Heading tape */}
      <CompassTape heading={heading} />

      {/* Top row */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div data-hud-metrics className="grid gap-3 sm:grid-cols-3">
          <Metric label="Score" value={score.toString().padStart(6, "0")} />
          <Metric label="Wave" value={wave.toString().padStart(2, "0")} />
          <Metric label="Enemies" value={enemiesRemaining.toString().padStart(2, "0")} accent />
        </div>

        <div className="flex items-start gap-3">
          <CombatRadar enemies={pveEnemies} pickups={pvePickups} position={localPlayerPosition} heading={heading} selectedId={supply?.pickup.id} />


        </div>
      </div>

      {/* Center: crosshair + enemy arrows + alerts */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6">
        <div className={`relative h-20 w-20 transition-all duration-150 ${inSolution ? "scale-90 opacity-100" : "opacity-75"}`}>
          <Crosshair
            className={`h-full w-full stroke-[1.5px] transition-colors duration-150 ${inSolution ? "text-[#f65f5f]" : "text-[#f4c95d]"}`}
            style={inSolution ? { filter: "drop-shadow(0 0 1px #000) drop-shadow(0 0 8px #f65f5f)" } : undefined}
          />
          {/* Hit ring flash */}
          {damageIndicator && hitOpacity > 0.1 && (
            <div
              className="absolute left-1/2 top-1/2 h-24 w-24 rounded-full border border-[#f65f5f]"
              style={{
                opacity: hitOpacity * 0.7,
                transform: `translate(-50%, -50%) scale(${1 + (1 - hitOpacity) * 0.5})`,
              }}
            />
          )}
          <div
            className={`absolute inset-[-18%] rounded-full border transition-colors duration-150 ${
              inSolution ? "border-[#f65f5f]/60" : "border-[#f4c95d]/25"
            }`}
          />
          {/* Outgoing hit marker */}
          {enemyHitOpacity > 0 && (
            <HitMarker kill={Boolean(lastEnemyHit?.kill)} opacity={enemyHitOpacity} />
          )}
        </div>

        {nearestEnemies(pveEnemies, localPlayerPosition).map((enemy) => (
          <NearbyEnemyArrow
            key={enemy.id}
            enemy={enemy}
            heading={heading}
            localPlayerPosition={localPlayerPosition}
          />
        ))}

        {boundaryWarning && (
          <div className="flex items-center gap-3 border border-[#f65f5f]/60 bg-[#f65f5f]/20 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-[#ffd0d0] backdrop-blur-md">
            <AlertTriangle className="h-4 w-4" />
            {boundaryWarning}
          </div>
        )}

        {isLowHealth && (
          <div
            className="border border-[#f65f5f]/70 bg-[#f65f5f]/80 px-6 py-3 text-sm font-black uppercase tracking-[0.24em] text-white"
            style={{ animation: "title-flicker 1.2s ease-in-out infinite" }}
          >
            Airframe critical
          </div>
        )}
      </div>

      <div data-hud-notifications className="absolute right-4 top-36 z-10 flex w-[min(48vw,240px)] flex-col gap-1 sm:right-6 sm:top-36 [@media(max-height:500px)]:top-4 [@media(max-height:500px)]:w-48">
        <div role="log" aria-label="Flight notifications" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-1">
          {notifications.map(notification => {
            const age = now - notification.timestamp;
            const receipt = notification.type === "pickup" ? notification.receipt : null;
            const presentation = receipt ? PICKUP_PRESENTATION[receipt.kind] : null;
            return (
              <div key={notification.key} data-flight-notification={notification.type} className="flex items-center gap-2 border-l-2 bg-[#05070a]/90 px-2.5 py-2 text-[11px] font-bold" style={{ borderColor: presentation?.color ?? "#f4c95d", opacity: Math.min(1, (3200 - age) / 450) }}>
                {receipt && presentation ? <>
                  <PickupIcon kind={receipt.kind} className="h-5 w-5 shrink-0 text-white" />
                  <span>{receipt.amount > 0 ? `+${formatBenefit(receipt.amount)} ${presentation.unit} collected` : `${presentation.label} full · collected`}</span>
                </> : notification.type === "kill" ? <>
                  <Crosshair aria-hidden="true" className="h-5 w-5 shrink-0 text-[#f4c95d]" />
                  <span>{notification.kill.victim} destroyed</span>
                </> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div data-hud-resources className="relative z-10 flex flex-col gap-4 max-sm:gap-2 sm:flex-row sm:items-end sm:justify-between [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-end [@media(max-height:500px)]:justify-between">
        <div data-hud-flight className="flex flex-wrap gap-3 max-sm:gap-2 [@media(max-height:500px)]:gap-1.5">
          <Telemetry icon={<Gauge />} label="Altitude" value={Math.round(altitude)} unit="ft" detail={`AGL ${Math.round(groundClearance)}`} />
          <Telemetry icon={<Target />} label="Speed" value={Math.round(speed)} unit="kmh" />
          <div data-hud-health
            className={`min-w-64 border p-4 backdrop-blur-md transition-colors max-sm:min-w-32 max-sm:p-2 [@media(max-height:500px)]:min-w-28 [@media(max-height:500px)]:p-2 ${
              isLowHealth ? "border-[#f65f5f]/55 bg-[#f65f5f]/10" : "border-white/12 bg-black/45"
            }`}
          >
            <div className="mb-3 flex items-center justify-between max-sm:mb-1 [@media(max-height:500px)]:mb-1">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
                <HeartPulse className={`h-4 w-4 ${isLowHealth ? "text-[#f65f5f]" : "text-[#51d6a3]"}`} />
                Health
              </span>
              <span
                className={`text-2xl font-black ${isLowHealth ? "text-[#f65f5f]" : "text-[#51d6a3]"}`}
                style={isLowHealth ? { animation: "title-flicker 1.4s ease-in-out infinite" } : undefined}
              >
                {hp}%
              </span>
            </div>
            <Progress
              value={hp}
              className={`h-2 bg-white/10 ${isLowHealth ? "[&>div]:bg-[#f65f5f]" : "[&>div]:bg-[#51d6a3]"}`}
            />
          </div>
        </div>

        <div data-hud-weapons className="flex flex-wrap justify-end gap-3 max-sm:justify-start max-sm:gap-2 [@media(max-height:500px)]:gap-1.5">
          <Weapon label="MG" count={ammo} low={ammo < 25} active={selectedWeapon === "mg"} shortcut="1" icon={<Shell />} />
          <Weapon label="Missile" count={missiles} low={missiles === 0} active={selectedWeapon === "missile"} shortcut="2" icon={<Rocket />} />
          <GameDisplayControls settings={display} onChange={onDisplayChange} />
        </div>
      </div>
    </div>
  );
}

function formatBenefit(amount: number) {
  return amount > 0 && amount < 0.1 ? "<0.1" : Number(amount.toFixed(1));
}

function nearestEnemies(
  enemies: ReturnType<typeof useGameStore.getState>["pveEnemies"],
  localPlayerPosition: [number, number],
) {
  return Object.values(enemies)
    .map((enemy) => {
      const dx = enemy.position[0] - localPlayerPosition[0];
      const dz = enemy.position[2] - localPlayerPosition[1];
      return { ...enemy, distance: Math.sqrt(dx * dx + dz * dz) };
    })
    .filter((enemy) => enemy.distance < 900)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
}

function NearbyEnemyArrow({
  enemy,
  heading,
  localPlayerPosition,
}: {
  enemy: { role: string; position: [number, number, number]; distance: number };
  heading: number;
  localPlayerPosition: [number, number];
}) {
  const dx = enemy.position[0] - localPlayerPosition[0];
  const dz = enemy.position[2] - localPlayerPosition[1];
  const bearing = Math.atan2(dx, -dz);
  const screenAngle = bearing + (heading * Math.PI) / 180;
  const color = enemy.role === "bomber" ? "#f4c95d" : enemy.role === "fighter" ? "#f65f5f" : "#51d6a3";
  const opacity = Math.max(0.32, 1 - enemy.distance / 980);
  const radius = 118;
  const x = Math.sin(screenAngle) * radius;
  const y = -Math.cos(screenAngle) * radius;

  return (
    <div
      className="absolute left-1/2 top-1/2 h-8 w-8"
      style={{
        opacity,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${screenAngle}rad)`,
      }}
    >
      <div
        className="mx-auto h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent"
        style={{
          borderBottomColor: color,
          filter: `drop-shadow(0 0 8px ${color})`,
        }}
      />
      <div className="mt-1 h-px w-full" style={{ backgroundColor: color, opacity: 0.35 }} />
    </div>
  );
}

function hitGradient(angle: number) {
  const x = 50 + Math.sin(angle) * 48;
  const y = 50 + Math.cos(angle) * 48;
  return [
    `radial-gradient(circle at ${x}% ${y}%, rgba(246,95,95,0.88) 0%, rgba(246,95,95,0.44) 9%, rgba(246,95,95,0.12) 25%, transparent 48%)`,
    "linear-gradient(rgba(246,95,95,0.16), transparent 18%, transparent 82%, rgba(246,95,95,0.16))",
    "linear-gradient(90deg, rgba(246,95,95,0.16), transparent 18%, transparent 82%, rgba(246,95,95,0.16))",
  ].join(", ");
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-32 border border-white/12 bg-black/45 px-4 py-3 backdrop-blur-md [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/44">{label}</div>
      <div className={`mt-1 text-3xl font-black leading-none max-sm:text-xl [@media(max-height:500px)]:text-xl ${accent ? "text-[#f4c95d]" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Telemetry({
  icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  detail?: string;
}) {
  return (
    <div className="min-w-36 border border-white/12 bg-black/45 p-4 backdrop-blur-md max-sm:min-w-20 max-sm:p-2 [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:p-2">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
        <span className="text-[#65a6ff] [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-black leading-none max-sm:text-xl [@media(max-height:500px)]:text-xl">
        {value}
        <span className="ml-1 text-[10px] uppercase text-white/35">{unit}</span>
      </div>
      {detail && <div data-hud-telemetry-detail className="mt-1 max-sm:hidden [@media(max-height:500px)]:hidden text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 tabular-nums">{detail}</div>}
    </div>
  );
}

function Weapon({
  label,
  count,
  low = false,
  active,
  shortcut,
  icon,
}: {
  label: string;
  count: number;
  low?: boolean;
  active: boolean;
  shortcut: string;
  icon: ReactNode;
}) {
  return (
    <div
      className={`min-w-32 border p-4 backdrop-blur-md max-sm:min-w-24 max-sm:p-2 [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:p-2 ${
        active ? "border-[#f4c95d]/65 bg-[#f4c95d]/12" : "border-white/10 bg-black/40 opacity-65"
      }`}
    >
      <div
        className={`mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] ${
          active ? "text-[#f4c95d]" : "text-white/42"
        }`}
      >
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label} [{shortcut}]
      </div>
      <div className={`text-3xl font-black leading-none max-sm:text-xl [@media(max-height:500px)]:text-xl ${low ? "text-[#f65f5f]" : "text-white"}`}>{count}</div>
    </div>
  );
}

function HitMarker({ kill, opacity }: { kill: boolean; opacity: number }) {
  const color = kill ? "#f65f5f" : "#ffffff";
  const offset = kill ? 22 : 16;
  const length = kill ? 18 : 13;

  return (
    <div className="absolute left-1/2 top-1/2" style={{ opacity }}>
      {[45, 135, 225, 315].map((angle) => (
        <div
          key={angle}
          className="absolute left-0 top-0 h-[3px]"
          style={{
            width: length,
            backgroundColor: color,
            // Dark outline keeps the marker readable against bright sky and clouds.
            boxShadow: `0 0 0 1.5px rgba(0,0,0,0.85), 0 0 10px ${color}`,
            transform: `rotate(${angle}deg) translateX(${offset}px) translateY(-1.5px)`,
            transformOrigin: "0 50%",
          }}
        />
      ))}
    </div>
  );
}

const COMPASS_PX_PER_DEG = 3;
const COMPASS_LABELS: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
const COMPASS_TICKS = Array.from({ length: 49 }, (_, index) => index * 15 - 180);

function CompassTape({ heading }: { heading: number }) {
  // Yaw is counter-clockwise from -Z; compass bearings run clockwise from north (-Z).
  const bearing = (((-heading) % 360) + 360) % 360;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 flex-col items-center md:flex sm:top-6 [@media(max-height:500px)]:hidden">
      <div className="relative h-9 w-80 overflow-hidden bg-black/35 backdrop-blur-md [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]">
        <div
          className="absolute left-1/2 top-0 h-full"
          style={{ transform: `translateX(${-bearing * COMPASS_PX_PER_DEG}px)` }}
        >
          {COMPASS_TICKS.map((deg) => {
            const normalized = ((deg % 360) + 360) % 360;
            const label = COMPASS_LABELS[normalized];
            return (
              <div
                key={deg}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: deg * COMPASS_PX_PER_DEG }}
              >
                <div className={`w-px bg-white/55 ${label ? "h-3" : "h-2"}`} />
                <span
                  className={`mt-0.5 text-[10px] font-black ${
                    label ? (normalized === 0 ? "text-[#f4c95d]" : "text-white/80") : "text-white/35"
                  }`}
                >
                  {label ?? normalized}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 border border-white/14 bg-black/50 px-2 py-0.5 text-xs font-black tabular-nums text-[#f4c95d] backdrop-blur-md">
        {Math.round(bearing).toString().padStart(3, "0")}°
      </div>
    </div>
  );
}
