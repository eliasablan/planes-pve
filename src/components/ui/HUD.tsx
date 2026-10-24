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
import type { CSSProperties, ReactNode } from "react";

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

  const [radarSize, setRadarSize] = useState(RADAR_DEFAULT_SIZE);
  useEffect(() => {
    const cycle = (event: KeyboardEvent) => {
      if (event.code !== "KeyM" || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.matches("input,select,textarea,[contenteditable]"))) return;
      setRadarSize((size) => (size + 1) % RADAR_SCALES.length);
    };
    window.addEventListener("keydown", cycle);
    return () => window.removeEventListener("keydown", cycle);
  }, []);

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
    <div data-combat-hud style={{ "--radar-scale": RADAR_SCALES[radarSize], width: `${10000 / display.hudScale}%`, height: `${10000 / display.hudScale}%`, transform: `scale(${display.hudScale / 100})`, transformOrigin: "top left" } as CSSProperties} className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-4 text-wf-ink sm:p-6">
      <style>{`
        [data-hud-metrics] > div, [data-hud-flight] > div, [data-hud-weapons] > div:not([data-display-controls]) { background-color: rgb(0 0 0 / .6); }
        [data-hud-radar-panel] { width: calc(184px * var(--radar-scale)); order: 2; }
        [data-hud-notifications] { top: calc(60px + 184px * var(--radar-scale)); }
        [data-display-controls] { min-height: 56px; }
        @media (min-width: 1920px) {
          [data-hud-radar-panel] { width: calc(216px * var(--radar-scale)); }
          [data-hud-notifications] { top: calc(64px + 216px * var(--radar-scale)); width: 256px; }
        }
        @media (max-width: 639px) {
          [data-hud-radar-panel] { width: calc(126px * min(var(--radar-scale), 1.5)); }
          [data-hud-notifications] { top: calc(54px + 126px * min(var(--radar-scale), 1.5)); }
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
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-start pt-[16vh]"
          style={{ animation: "wave-announce 2.6s ease-out forwards" }}
        >
          <div className="text-center">
            <div className="text-xs text-wf-dim">INCOMING_WAVE</div>
            <div
              className="mt-2 text-7xl font-light leading-none sm:text-8xl"
              style={{ textShadow: "0 0 2px #000, 0 0 40px rgba(0,0,0,0.6)" }}
            >
              Wave {"// "}{waveAnnouncement.toString().padStart(2, "0")}
            </div>
            <div className="mt-3 text-xs text-wf-dim">ELIMINATE_ALL_CONTACTS</div>
          </div>
        </div>
      )}

      {/* Heading tape */}
      <CompassTape heading={heading} />

      {/* Top row */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div data-hud-metrics className="grid gap-3 sm:grid-cols-3">
          <Metric label="SCORE" value={score.toString().padStart(6, "0")} />
          <Metric label="WAVE" value={wave.toString().padStart(2, "0")} />
          <Metric label="ENEMIES" value={enemiesRemaining.toString().padStart(2, "0")} />
        </div>

        <div className="flex items-start gap-3">
          <CombatRadar enemies={pveEnemies} pickups={pvePickups} position={localPlayerPosition} heading={heading} selectedId={supply?.pickup.id} />


        </div>
      </div>

      {/* Center: crosshair + enemy arrows + alerts */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6">
        <div className={`relative h-20 w-20 transition-all duration-150 ${inSolution ? "scale-90 opacity-100" : "opacity-75"}`}>
          <Reticle inSolution={inSolution} />
          {/* Hit ring flash */}
          {damageIndicator && hitOpacity > 0.1 && (
            <div
              className="absolute left-1/2 top-1/2 h-24 w-24 border border-wf-danger"
              style={{
                opacity: hitOpacity * 0.7,
                transform: `translate(-50%, -50%) scale(${1 + (1 - hitOpacity) * 0.5})`,
              }}
            />
          )}
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
          <div className="flex items-center gap-3 border border-wf-danger bg-black/70 px-5 py-3 text-sm font-medium text-wf-danger">
            <AlertTriangle className="h-4 w-4" />
            {boundaryWarning}
          </div>
        )}

        {isLowHealth && (
          <div
            className="border border-wf-danger bg-wf-danger px-6 py-3 text-sm font-semibold text-black"
            style={{ animation: "title-flicker 1.2s ease-in-out infinite" }}
          >
            AIRFRAME_CRITICAL
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
              <div key={notification.key} data-flight-notification={notification.type} className="flex items-center gap-2 border-l-2 bg-black/70 px-2.5 py-2 text-xs" style={{ borderColor: presentation?.color ?? "#f2f2f0", opacity: Math.min(1, (3200 - age) / 450) }}>
                {receipt && presentation ? <>
                  <PickupIcon kind={receipt.kind} className="h-5 w-5 shrink-0 text-white" />
                  <span>{receipt.amount > 0 ? `+${formatBenefit(receipt.amount)} ${presentation.unit} collected` : `${presentation.label} full · collected`}</span>
                </> : notification.type === "kill" ? <>
                  <Crosshair aria-hidden="true" className="h-5 w-5 shrink-0 text-wf-ink" />
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
          <Telemetry icon={<Gauge />} label="ALTITUDE" value={Math.round(altitude)} unit="ft" detail={`ABOVE_GROUND ${Math.round(groundClearance)}`} />
          <Telemetry icon={<Target />} label="SPEED" value={Math.round(speed)} unit="kmh" />
          <div data-hud-health
            className={`wf-frame flex min-w-64 flex-col justify-center p-4 transition-colors max-sm:min-w-32 max-sm:p-2 [@media(max-height:500px)]:min-w-28 [@media(max-height:500px)]:p-2 ${
              isLowHealth ? "border-wf-danger" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between max-sm:mb-1 [@media(max-height:500px)]:mb-1">
              <span className="flex items-center gap-2 text-[11px] font-medium text-wf-dim">
                <HeartPulse className={`h-4 w-4 ${isLowHealth ? "text-wf-danger" : "text-wf-ink"}`} />
                HEALTH
              </span>
              <span
                className={`text-3xl font-light leading-none ${isLowHealth ? "text-wf-danger" : "text-wf-ink"}`}
                style={isLowHealth ? { animation: "title-flicker 1.4s ease-in-out infinite" } : undefined}
              >
                {hp}%
              </span>
            </div>
            <Progress
              value={hp}
              className={`h-[3px] rounded-none bg-wf-hair ${isLowHealth ? "[&>div]:bg-wf-danger" : "[&>div]:bg-wf-ink"}`}
            />
          </div>
        </div>

        <div data-hud-weapons className="flex flex-wrap justify-end gap-3 max-sm:justify-start max-sm:gap-2 [@media(max-height:500px)]:gap-1.5">
          <Weapon label="MG" count={ammo} low={ammo < 25} active={selectedWeapon === "mg"} shortcut="1" icon={<Shell />} />
          <Weapon label="MISSILE" count={missiles} low={missiles === 0} active={selectedWeapon === "missile"} shortcut="2" icon={<Rocket />} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="wf-frame flex min-w-32 flex-col justify-center px-4 py-3 [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:py-2">
      <div className="text-[11px] font-medium text-wf-dim">{label}</div>
      <div className="mt-1 text-3xl font-light leading-none text-wf-ink max-sm:text-xl [@media(max-height:500px)]:text-xl">
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
    <div className="wf-frame flex min-w-36 flex-col justify-center p-4 max-sm:min-w-20 max-sm:p-2 [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:p-2">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-wf-dim">
        <span className="text-wf-ink [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-light leading-none max-sm:text-xl [@media(max-height:500px)]:text-xl">
        {value}
        <span className="ml-1 text-[11px] uppercase text-wf-dim">{unit}</span>
      </div>
      {detail && <div data-hud-telemetry-detail className="mt-1 max-sm:hidden [@media(max-height:500px)]:hidden text-[11px] text-wf-dim tabular-nums">{detail}</div>}
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
      className={`wf-frame flex min-w-32 flex-col justify-center p-4 max-sm:min-w-24 max-sm:p-2 [@media(max-height:500px)]:min-w-20 [@media(max-height:500px)]:p-2 ${
        active ? "border-wf-ink shadow-[inset_0_-2px_0_var(--color-wf-ink)]" : "opacity-60"
      } ${low ? "border-wf-danger" : ""}`}
    >
      <div
        className={`mb-1 flex items-center gap-2 text-[11px] font-medium ${
          active ? "text-wf-ink" : "text-wf-dim"
        }`}
      >
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label} [{shortcut}]
      </div>
      <div className={`text-3xl font-light leading-none max-sm:text-xl [@media(max-height:500px)]:text-xl ${low ? "text-wf-danger" : "text-wf-ink"}`}>{count}</div>
    </div>
  );
}

// Wireframe gunsight: bracketed box with a gapped cross; brackets close in and turn red on a firing solution.
function Reticle({ inSolution }: { inSolution: boolean }) {
  const color = inSolution ? "#ff4d3d" : "#f2f2f0";
  const inset = inSolution ? 14 : 4;
  const far = 80 - inset;
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      className="h-full w-full overflow-visible"
      style={{ filter: "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000)" }}
    >
      <g stroke={color} strokeWidth={1} fill="none" className="transition-all duration-150">
        <path d={`M${inset} ${inset + 12}V${inset}H${inset + 12}M${far - 12} ${inset}H${far}V${inset + 12}M${far} ${far - 12}V${far}H${far - 12}M${inset + 12} ${far}H${inset}V${far - 12}`} />
        <path d="M40 22V34M40 46V58M22 40H34M46 40H58" />
      </g>
      <rect x={39} y={39} width={2} height={2} fill={color} />
    </svg>
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

// Radar width multipliers cycled with M; the default is 1.5× the original 184px panel.
const RADAR_SCALES = [1, 1.5, 2, 2.5];
const RADAR_DEFAULT_SIZE = 1;

const COMPASS_PX_PER_DEG = 3;
const COMPASS_LABELS: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
const COMPASS_TICKS = Array.from({ length: 49 }, (_, index) => index * 15 - 180);

function CompassTape({ heading }: { heading: number }) {
  // Yaw is counter-clockwise from -Z; compass bearings run clockwise from north (-Z).
  const bearing = (((-heading) % 360) + 360) % 360;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 flex-col items-center md:flex sm:top-6 [@media(max-height:500px)]:hidden">
      <div className="relative h-9 w-80 overflow-hidden bg-black/50 [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]">
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
                <div className={`w-px bg-wf-line ${label ? "h-3" : "h-2"}`} />
                <span
                  className={`mt-0.5 text-[10px] ${
                    label ? (normalized === 0 ? "font-semibold text-wf-ink" : "text-wf-ink/80") : "text-wf-dim"
                  }`}
                >
                  {label ?? normalized}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 border border-wf-line bg-black/60 px-2 py-0.5 text-xs tabular-nums text-wf-ink">
        {Math.round(bearing).toString().padStart(3, "0")}°
      </div>
    </div>
  );
}
