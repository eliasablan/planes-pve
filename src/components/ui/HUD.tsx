"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Crosshair, Gauge, HeartPulse, MousePointer2, Radar, Rocket, Shell, Target } from "lucide-react";
import { useControls } from "@/hooks/useControls";
import type { ReactNode } from "react";

export function HUD() {
  const {
    hp,
    ammo,
    missiles,
    score,
    altitude,
    speed,
    selectedWeapon,
    wave,
    enemiesRemaining,
    boundaryWarning,
  } = useGameStore();
  const { mouseControlEnabled } = useControls();
  const isLowHealth = hp < 30;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-4 font-mono text-white sm:p-6">
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: Math.max(0, (100 - hp) / 100),
          background: "radial-gradient(circle, transparent 42%, rgba(246,95,95,0.24) 100%)",
        }}
      />

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
            <div className="absolute left-[66%] top-[30%] h-2 w-2 bg-[#f65f5f]" />
            <div className="absolute bottom-3 left-5 h-2 w-2 bg-[#f4c95d]" />
            <div className="absolute inset-3 rounded-full border border-white/12" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6">
        <div className="relative h-20 w-20 opacity-75">
          <Crosshair className="h-full w-full text-[#f4c95d] stroke-[1.5px]" />
          <div className="absolute inset-[-18%] rounded-full border border-[#f4c95d]/25" />
        </div>

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
