"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target, MousePointer2, Keyboard, AlertTriangle } from "lucide-react";
import { Minimap } from "./Minimap";
import { useControls } from "@/hooks/useControls";
import { useMemo } from "react";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score, altitude, speed, pitch, roll, selectedWeapon, zoneRadius, zoneCenter } = useGameStore();
  const { mouseControlEnabled } = useControls();

  // Check if player is currently in gas for visual effect
  // For a real check we'd need player position, but we can approximate or wait for it
  // Let's assume we have it or just show logic
  const isInGas = useMemo(() => {
    // This is a placeholder since HUD doesn't easily have player pos without extra store field
    // But we'll add the UI layer anyway
    return false; 
  }, [zoneRadius, zoneCenter]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 font-mono">
      {/* GAS VIGNETTE EFFECT */}
      {hp < 100 && (
        <div 
          className="absolute inset-0 transition-opacity duration-500 bg-[radial-gradient(circle,transparent_50%,rgba(255,0,0,0.2)_100%)]"
          style={{ opacity: (1 - hp/100) }}
        />
      )}

      {/* Top Section: Kill Log & Score */}
      <div className="flex justify-between items-start w-full relative z-10">
        <div className="flex flex-col gap-2">
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md flex justify-between items-center gap-8">
            <div className="text-primary font-bold text-xl tracking-tighter">SCORE: {score}</div>
            
            <div className={`flex items-center gap-2 px-3 py-1 rounded border ${mouseControlEnabled ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/20 text-white/40'}`}>
              {mouseControlEnabled ? <MousePointer2 className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
              <span className="text-[10px] font-black uppercase tracking-widest">Mouse {mouseControlEnabled ? 'ON' : 'OFF'} [M]</span>
            </div>
          </div>
          
          <div className="bg-black/50 p-3 rounded border border-primary/10 backdrop-blur-md flex gap-4 text-[10px] font-bold text-white/70">
            <div className="flex flex-col">
              <span>PITCH</span>
              <span className={Math.abs(pitch) < 5 ? "text-primary" : "text-destructive"}>{pitch.toFixed(1)}°</span>
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
          <Minimap />
        </div>
      </div>

      {/* Center Warning */}
      {hp < 40 && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <span className="text-destructive font-black text-2xl tracking-[0.3em] bg-black/80 px-6 py-2 border-2 border-destructive">CRITICAL DAMAGE</span>
        </div>
      )}

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
        <Crosshair className="w-16 h-16 text-primary stroke-[1px]" />
      </div>

      {/* Bottom Section */}
      <div className="flex justify-between items-end w-full relative z-10">
        {/* Speed & Alt Tapes integrated here or kept as separate overlays */}
        <div className="flex gap-12 items-end">
          <div className="w-64 bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md">
            <div className="flex justify-between mb-2 items-center">
              <span className="text-xs font-bold flex items-center gap-1 uppercase tracking-widest"><Shield className="w-3 h-3" /> System Integrity</span>
              <span className={`text-xl font-black ${hp < 30 ? "text-destructive animate-pulse" : "text-primary"}`}>{hp}%</span>
            </div>
            <Progress value={hp} className="h-3 bg-white/10" />
          </div>
          
          {/* Velocity Vector (Simple representation) */}
          <div className="bg-black/50 p-4 rounded border border-primary/20 backdrop-blur-md flex flex-col items-center">
            <span className="text-[10px] font-bold text-white/50 mb-1">VELOCITY</span>
            <div className="text-2xl font-black text-primary">{Math.round(speed)} <span className="text-xs">km/h</span></div>
          </div>
        </div>

        {/* Weapons */}
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
