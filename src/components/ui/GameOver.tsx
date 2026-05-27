"use client";

import { useGameStore } from "@/store/useGameStore";
import { Home, RotateCcw, Skull, Target, Waves, Zap } from "lucide-react";
import type { ReactNode } from "react";

export function GameOver({
  onRestart,
  onExit,
}: {
  onRestart: () => void;
  onExit?: () => void;
}) {
  const { score, localKills, wave } = useGameStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/82 p-6 text-white backdrop-blur-xl">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="relative w-full max-w-2xl border border-white/14 bg-[#080b10]/92 p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="flex h-16 w-16 items-center justify-center bg-[#f65f5f]/16 text-[#f65f5f]">
            <Skull className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-6xl">Run ended</h2>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/40">
              Aircraft destroyed
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Debrief icon={<Zap />} label="Score" value={score.toString()} />
          <Debrief icon={<Waves />} label="Wave" value={wave.toString()} />
          <Debrief icon={<Target />} label="Kills" value={localKills.toString()} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onRestart}
            className="inline-flex h-14 flex-1 items-center justify-center gap-3 bg-[#f4c95d] px-5 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffe08a] active:scale-[0.99]"
          >
            <RotateCcw className="h-5 w-5" />
            Fly again
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex h-14 flex-1 items-center justify-center gap-3 border border-white/18 bg-white/[0.04] px-5 text-sm font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-white/35 hover:bg-white/[0.08]"
            >
              <Home className="h-5 w-5" />
              Start screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Debrief({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#51d6a3]">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="text-4xl font-black leading-none text-white">{value}</div>
    </div>
  );
}
