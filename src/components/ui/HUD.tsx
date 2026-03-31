"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target } from "lucide-react";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score } = useGameStore();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 font-mono">
      {/* Top Section: Kill Log & Score */}
      <div className="flex justify-between items-start">
        <div className="bg-black/50 p-4 rounded border border-primary/20">
          <div className="text-primary font-bold text-xl">SCORE: {score}</div>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          {killLog.map((log) => (
            <div key={log.id} className="bg-black/50 px-3 py-1 rounded text-sm border-r-4 border-primary">
              <span className="text-primary font-bold">{log.killer}</span>
              <span className="mx-2 text-white/50">✈️</span>
              <span className="text-destructive font-bold">{log.victim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Reticle Placeholder (Actual reticle is in 3D but this helps) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
        <Crosshair className="w-12 h-12 text-primary" />
      </div>

      {/* Bottom Section: Health & Ammo */}
      <div className="flex justify-between items-end">
        {/* Left: Health */}
        <div className="w-64 bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-sm">
          <div className="flex justify-between mb-2 items-center">
            <span className="text-xs font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> INTEGRITY</span>
            <span className="text-xl font-black text-primary">{hp}%</span>
          </div>
          <Progress value={hp} className="h-3 bg-white/10" />
        </div>

        {/* Right: Weapons */}
        <div className="flex gap-4">
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-sm flex flex-col items-center min-w-[80px]">
            <Zap className="w-4 h-4 mb-1 text-primary" />
            <span className="text-xs font-bold text-white/50">MG</span>
            <span className="text-2xl font-black">{ammo}</span>
          </div>
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-sm flex flex-col items-center min-w-[80px]">
            <Target className="w-4 h-4 mb-1 text-destructive" />
            <span className="text-xs font-bold text-white/50">MISSILE</span>
            <span className="text-2xl font-black">{missiles}</span>
          </div>
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-sm flex flex-col items-center min-w-[80px]">
            <Shield className="w-4 h-4 mb-1 text-blue-400" />
            <span className="text-xs font-bold text-white/50">FLARE</span>
            <span className="text-2xl font-black">{flares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
