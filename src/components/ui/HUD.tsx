"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target } from "lucide-react";
import { Minimap } from "./Minimap";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score, altitude, speed, pitch, roll, selectedWeapon } = useGameStore();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 font-mono">
      {/* Top Section: Kill Log & Score */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col gap-2">
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md">
            <div className="text-primary font-bold text-xl tracking-tighter">SCORE: {score}</div>
          </div>
          {/* Flight Instruments Mini */}
          <div className="bg-black/50 p-3 rounded border border-primary/10 backdrop-blur-md flex gap-4 text-[10px] font-bold text-white/70">
            <div className="flex flex-col">
              <span>PITCH</span>
              <span className={pitch > 0 ? "text-green-400" : "text-red-400"}>{pitch.toFixed(1)}°</span>
            </div>
            <div className="flex flex-col border-l border-white/10 pl-4">
              <span>ROLL</span>
              <span>{roll.toFixed(1)}°</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-2 items-end">
            {killLog.map((log) => (
              <div key={log.id} className="bg-black/50 px-3 py-1 rounded text-sm border-r-4 border-primary backdrop-blur-sm">
                <span className="text-primary font-bold">{log.killer}</span>
                <span className="mx-2 text-white/50">✈️</span>
                <span className="text-destructive font-bold">{log.victim}</span>
              </div>
            ))}
          </div>
          
          {/* Minimap in top right */}
          <div className="pointer-events-auto">
            <Minimap />
          </div>
        </div>
      </div>

      {/* Center: Flight Data Overlays */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl flex justify-between px-20">
        {/* Speed Tape */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-64 w-12 bg-black/20 border-y border-r border-primary/30 flex flex-col justify-center items-end pr-2 relative">
            {[200, 150, 100, 50, 0].map(v => (
              <div key={v} className="text-[10px] text-primary/50">{v}</div>
            ))}
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-16 bg-primary/80 text-black font-black text-center py-1 skew-x-[-15deg]">
              {Math.round(speed)}
            </div>
          </div>
          <span className="text-[10px] font-bold text-primary/80 uppercase">SPD km/h</span>
        </div>

        {/* Altitude Tape */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-64 w-12 bg-black/20 border-y border-l border-primary/30 flex flex-col justify-center items-start pl-2 relative">
            {[1000, 750, 500, 250, 0].map(v => (
              <div key={v} className="text-[10px] text-primary/50">{v}</div>
            ))}
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-16 bg-primary/80 text-black font-black text-center py-1 skew-x-[15deg]">
              {Math.round(altitude)}
            </div>
          </div>
          <span className="text-[10px] font-bold text-primary/80 uppercase">ALT m</span>
        </div>
      </div>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
        <Crosshair className="w-16 h-16 text-primary stroke-[1px]" />
      </div>

      {/* Bottom Section: Health & Ammo */}
      <div className="flex justify-between items-end">
        {/* Left: Health */}
        <div className="w-64 bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md">
          <div className="flex justify-between mb-2 items-center">
            <span className="text-xs font-bold flex items-center gap-1 uppercase tracking-widest"><Shield className="w-3 h-3" /> System Integrity</span>
            <span className={`text-xl font-black ${hp < 30 ? "text-destructive animate-pulse" : "text-primary"}`}>{hp}%</span>
          </div>
          <Progress value={hp} className="h-3 bg-white/10" />
        </div>

        {/* Right: Weapons */}
        <div className="flex gap-4">
          <div className={`bg-black/50 p-4 rounded border transition-all duration-300 flex flex-col items-center min-w-[100px] backdrop-blur-md ${selectedWeapon === 'mg' ? 'border-primary ring-2 ring-primary/50 scale-110 shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'border-primary/20 opacity-60'}`}>
            <Zap className={`w-4 h-4 mb-1 ${selectedWeapon === 'mg' ? 'text-primary' : 'text-primary/50'}`} />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter text-center">MG-20 [1]</span>
            <span className="text-2xl font-black">{ammo}</span>
          </div>
          <div className={`bg-black/50 p-4 rounded border transition-all duration-300 flex flex-col items-center min-w-[100px] backdrop-blur-md ${selectedWeapon === 'missile' ? 'border-destructive ring-2 ring-destructive/50 scale-110 shadow-[0_0_20px_rgba(255,0,0,0.3)]' : 'border-primary/20 opacity-60'}`}>
            <Target className={`w-4 h-4 mb-1 ${selectedWeapon === 'missile' ? 'text-destructive' : 'text-destructive/50'}`} />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter text-center">AGM-65 [2]</span>
            <span className="text-2xl font-black">{missiles}</span>
          </div>
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md flex flex-col items-center min-w-[100px] opacity-80">
            <Shield className="w-4 h-4 mb-1 text-blue-400" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter text-center">FLARE [X]</span>
            <span className="text-2xl font-black">{flares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
