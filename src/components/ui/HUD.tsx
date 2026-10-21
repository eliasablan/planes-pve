"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Crosshair, Gauge, HeartPulse, MousePointer2, Radar, Rocket, Shell, Target } from "lucide-react";
import { useControls } from "@/hooks/useControls";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function HUD() {
  const {
    hp,
    ammo,
    missiles,
    score,
    altitude,
    speed,
    heading,
    selectedWeapon,
    wave,
    enemiesRemaining,
    boundaryWarning,
    localPlayerPosition,
    pveEnemies,
    pvePickups,
    damageIndicator,
    lastEnemyHit,
    targetLock,
    killLog,
  } = useGameStore();
  const inSolution = Boolean(targetLock?.inSolution);
  const { mouseControlEnabled } = useControls();
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

  const visibleKills = killLog.filter((k) => now - k.timestamp < 3200);

  const enemyHitAge = lastEnemyHit ? now - lastEnemyHit.timestamp : Number.POSITIVE_INFINITY;
  const enemyHitWindow = lastEnemyHit?.kill ? 560 : 320;
  const enemyHitOpacity = Math.max(0, 1 - enemyHitAge / enemyHitWindow);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-4 font-mono text-white sm:p-6">
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
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Score" value={score.toString().padStart(6, "0")} />
          <Metric label="Wave" value={wave.toString().padStart(2, "0")} />
          <Metric label="Enemies" value={enemiesRemaining.toString().padStart(2, "0")} accent />
        </div>

        <div className="flex items-start gap-3">
          {/* Radar */}
          <div className="hidden items-center gap-4 border border-white/12 bg-black/45 px-4 py-3 backdrop-blur-md sm:flex">
            <Radar className="h-5 w-5 text-[#51d6a3]" />
            <div className="relative h-20 w-20 rounded-full border border-[#51d6a3]/45 bg-[#51d6a3]/8 overflow-hidden">
              {/* Sweep arm */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(81,214,163,0.1) 345deg, rgba(81,214,163,0.65) 360deg)",
                  animation: "radar-sweep 3s linear infinite",
                  transformOrigin: "center",
                }}
              />
              {/* Sweep trail fade */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(81,214,163,0.05) 340deg, transparent 360deg)",
                  animation: "radar-sweep 3s linear infinite",
                  transformOrigin: "center",
                }}
              />
              {/* Center dot */}
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
              {/* Inner ring */}
              <div className="absolute inset-3 rounded-full border border-white/12" />
              {/* Enemy dots */}
              {Object.values(pveEnemies).slice(0, 12).map((enemy) => (
                <RadarDot
                  key={enemy.id}
                  color={enemy.role === "bomber" ? "#f4c95d" : enemy.role === "fighter" ? "#f65f5f" : "#51d6a3"}
                  localPlayerPosition={localPlayerPosition}
                  position={[enemy.position[0], enemy.position[2]]}
                />
              ))}
              {/* Pickup dots */}
              {Object.values(pvePickups).slice(0, 8).map((pickup) => (
                <RadarDot
                  key={pickup.id}
                  color={pickup.kind === "repair" ? "#51d6a3" : pickup.kind === "missile" ? "#65a6ff" : "#f4c95d"}
                  localPlayerPosition={localPlayerPosition}
                  position={[pickup.position[0], pickup.position[2]]}
                  pickup
                />
              ))}
            </div>
          </div>

          {/* Kill feed */}
          {visibleKills.length > 0 && (
            <div className="hidden flex-col gap-1.5 sm:flex">
              {visibleKills.slice(0, 4).map((kill) => {
                const age = now - kill.timestamp;
                const opacity = age < 2600 ? 1 : Math.max(0, 1 - (age - 2600) / 600);
                const color =
                  kill.victim === "BOMBER"
                    ? "#f4c95d"
                    : kill.victim === "FIGHTER"
                      ? "#f65f5f"
                      : "#51d6a3";
                return (
                  <div
                    key={kill.id}
                    className="flex items-center gap-2 border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md"
                    style={{
                      opacity,
                      animation: "kill-slide-in 0.2s ease-out",
                    }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                      {kill.killer}
                    </span>
                    <span className="text-white/25 text-xs">×</span>
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.12em]"
                      style={{ color, textShadow: `0 0 10px ${color}66` }}
                    >
                      {kill.victim}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Bottom row */}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Telemetry icon={<Gauge />} label="Altitude" value={Math.round(altitude)} unit="ft" />
          <Telemetry icon={<Target />} label="Speed" value={Math.round(speed)} unit="kmh" />
          <div
            className={`min-w-64 border p-4 backdrop-blur-md transition-colors ${
              isLowHealth ? "border-[#f65f5f]/55 bg-[#f65f5f]/10" : "border-white/12 bg-black/45"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
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

        <div className="flex flex-wrap justify-end gap-3">
          <Weapon label="MG" count={ammo} low={ammo < 25} active={selectedWeapon === "mg"} shortcut="1" icon={<Shell />} />
          <Weapon label="Missile" count={missiles} low={missiles === 0} active={selectedWeapon === "missile"} shortcut="2" icon={<Rocket />} />
          <div className="flex min-w-36 items-center gap-3 border border-white/12 bg-black/45 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-md">
            <MousePointer2 className="h-4 w-4 text-[#65a6ff]" />
            {mouseControlEnabled ? "Mouse steer" : "Key steer"}
          </div>
        </div>
      </div>
    </div>
  );
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
  const bearing = Math.atan2(dx, dz);
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

function RadarDot({
  color,
  localPlayerPosition,
  position,
  pickup = false,
}: {
  color: string;
  localPlayerPosition: [number, number];
  position: [number, number];
  pickup?: boolean;
}) {
  const dx = position[0] - localPlayerPosition[0];
  const dz = position[1] - localPlayerPosition[1];
  const scale = 34 / 900;
  const x = Math.max(-34, Math.min(34, dx * scale));
  const y = Math.max(-34, Math.min(34, dz * scale));

  return (
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${pickup ? "h-2 w-2 rotate-45" : "h-2.5 w-2.5 rounded-full"}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 10px ${color}`,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ${pickup ? "rotate(45deg)" : ""}`,
      }}
    />
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-32 border border-white/12 bg-black/45 px-4 py-3 backdrop-blur-md">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/44">{label}</div>
      <div className={`mt-1 text-3xl font-black leading-none ${accent ? "text-[#f4c95d]" : "text-white"}`}>
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
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="min-w-36 border border-white/12 bg-black/45 p-4 backdrop-blur-md">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
        <span className="text-[#65a6ff] [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-black leading-none">
        {value}
        <span className="ml-1 text-[10px] uppercase text-white/35">{unit}</span>
      </div>
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
      className={`min-w-32 border p-4 backdrop-blur-md ${
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
      <div className={`text-3xl font-black leading-none ${low ? "text-[#f65f5f]" : "text-white"}`}>{count}</div>
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
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 flex-col items-center md:flex sm:top-6">
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
