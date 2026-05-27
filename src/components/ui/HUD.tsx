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
  } = useGameStore();
  const { mouseControlEnabled } = useControls();
  const isLowHealth = hp < 30;
  const [now, setNow] = useState(0);
  const hitAge = damageIndicator ? now - damageIndicator.timestamp : Number.POSITIVE_INFINITY;
  const hitOpacity = damageIndicator ? Math.max(0, 1 - hitAge / 850) * damageIndicator.intensity : 0;

  useEffect(() => {
    if (!damageIndicator) return;
    const interval = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(interval);
  }, [damageIndicator]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-4 font-mono text-white sm:p-6">
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: Math.max(0, (100 - hp) / 100),
          background: "radial-gradient(circle, transparent 42%, rgba(246,95,95,0.24) 100%)",
        }}
      />

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

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Score" value={score.toString().padStart(6, "0")} />
          <Metric label="Wave" value={wave.toString().padStart(2, "0")} />
          <Metric label="Enemies" value={enemiesRemaining.toString().padStart(2, "0")} accent />
        </div>

        <div className="hidden items-center gap-4 border border-white/12 bg-black/45 px-4 py-3 backdrop-blur-md sm:flex">
          <Radar className="h-5 w-5 text-[#51d6a3]" />
          <div className="relative h-20 w-20 rounded-full border border-[#51d6a3]/45 bg-[#51d6a3]/8">
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-white" />
            {Object.values(pveEnemies).slice(0, 12).map((enemy) => (
              <RadarDot
                key={enemy.id}
                color={enemy.role === "bomber" ? "#f4c95d" : enemy.role === "fighter" ? "#f65f5f" : "#51d6a3"}
                localPlayerPosition={localPlayerPosition}
                position={[enemy.position[0], enemy.position[2]]}
              />
            ))}
            {Object.values(pvePickups).slice(0, 8).map((pickup) => (
              <RadarDot
                key={pickup.id}
                color={pickup.kind === "repair" ? "#51d6a3" : pickup.kind === "missile" ? "#65a6ff" : "#f4c95d"}
                localPlayerPosition={localPlayerPosition}
                position={[pickup.position[0], pickup.position[2]]}
                pickup
              />
            ))}
            <div className="absolute inset-3 rounded-full border border-white/12" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6">
        <div className="relative h-20 w-20 opacity-75">
          <Crosshair className="h-full w-full text-[#f4c95d] stroke-[1.5px]" />
          <div className="absolute inset-[-18%] rounded-full border border-[#f4c95d]/25" />
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
          <div className="border border-[#f65f5f]/70 bg-[#f65f5f]/80 px-6 py-3 text-sm font-black uppercase tracking-[0.24em] text-white">
            Airframe critical
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Telemetry icon={<Gauge />} label="Altitude" value={Math.round(altitude)} unit="ft" />
          <Telemetry icon={<Target />} label="Speed" value={Math.round(speed)} unit="kmh" />
          <div className="min-w-64 border border-white/12 bg-black/45 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
                <HeartPulse className={`h-4 w-4 ${isLowHealth ? "text-[#f65f5f]" : "text-[#51d6a3]"}`} />
                Health
              </span>
              <span className={`text-2xl font-black ${isLowHealth ? "text-[#f65f5f]" : "text-[#51d6a3]"}`}>{hp}%</span>
            </div>
            <Progress value={hp} className={`h-2 bg-white/10 ${isLowHealth ? "[&>div]:bg-[#f65f5f]" : "[&>div]:bg-[#51d6a3]"}`} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Weapon label="MG" count={ammo} active={selectedWeapon === "mg"} shortcut="1" icon={<Shell />} />
          <Weapon label="Missile" count={missiles} active={selectedWeapon === "missile"} shortcut="2" icon={<Rocket />} />
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
      <div className={`mt-1 text-3xl font-black leading-none ${accent ? "text-[#f4c95d]" : "text-white"}`}>{value}</div>
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
  active,
  shortcut,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  shortcut: string;
  icon: ReactNode;
}) {
  return (
    <div className={`min-w-32 border p-4 backdrop-blur-md ${active ? "border-[#f4c95d]/65 bg-[#f4c95d]/12" : "border-white/10 bg-black/40 opacity-65"}`}>
      <div className={`mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] ${active ? "text-[#f4c95d]" : "text-white/42"}`}>
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label} [{shortcut}]
      </div>
      <div className="text-3xl font-black leading-none text-white">{count}</div>
    </div>
  );
}
