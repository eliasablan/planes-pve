"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target, MousePointer2, Keyboard, AlertTriangle } from "lucide-react";
import { Minimap } from "./Minimap";
import { useControls } from "@/hooks/useControls";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score, altitude, speed, pitch, roll, selectedWeapon } = useGameStore();
  const { mouseControlEnabled } = useControls();

  const isLowHealth = hp < 30;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 font-mono select-none overflow-hidden text-white uppercase">
      
      {/* IMMERSIVE GAS VIGNETTE */}
      <div 
        className="absolute inset-0 transition-opacity duration-500 bg-[radial-gradient(circle,transparent_50%,rgba(255,0,0,0.4)_100%)]"
        style={{ opacity: Math.max(0, (100 - hp) / 100) }}
      />

      {/* TOP HEADER */}
      <div className="flex justify-between items-start w-full relative z-20">
        <div className="flex flex-col gap-2">
          <div className="bg-black p-4 border border-white/40 flex items-center gap-6 shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/60">PILOT</span>
              <span className="text-xl font-black text-primary">ACE-01</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/60">SCORE</span>
              <span className="text-xl font-black">{score.toString().padStart(6, '0')}</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-black border border-white/20 self-start ${mouseControlEnabled ? 'text-primary' : 'text-white/40'}`}>
            {mouseControlEnabled ? <MousePointer2 className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
            <span className="text-[10px] font-bold">STEERING: {mouseControlEnabled ? 'MOUSE' : 'KEYS'} [M]</span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="flex flex-col gap-1 items-end">
            {killLog.slice(0, 3).map((log) => (
              <div key={log.id} className="bg-black px-3 py-1 border-r-4 border-primary text-[11px]">
                <span className="font-bold">{log.killer}</span>
                <span className="mx-2 text-white/40">»</span>
                <span className="text-destructive font-bold">{log.victim}</span>
              </div>
            ))}
          </div>
          <Minimap />
        </div>
      </div>

      {/* CENTRAL AREA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12 pointer-events-none">
        {/* SMALL RETICLE */}
        <div className="relative w-16 h-16 opacity-80">
          <Crosshair className="w-full h-full text-primary stroke-[2px]" />
        </div>

        {isLowHealth && (
          <div className="bg-destructive text-white px-6 py-2 text-xl font-black tracking-widest animate-pulse border-4 border-white">
            CRITICAL DAMAGE
          </div>
        )}
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex justify-between items-end w-full relative z-20">
        
        {/* TELEMETRY */}
        <div className="flex gap-4 items-end">
          <div className="bg-black p-4 border border-white/40 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] text-white/60 mb-1">ALTITUDE</span>
            <span className="text-3xl font-black tracking-tighter">{Math.round(altitude)}<span className="text-xs ml-1 text-white/40">FT</span></span>
          </div>
          
          <div className="bg-black p-4 border border-white/40 flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] text-white/60 mb-1">VELOCITY</span>
            <span className="text-3xl font-black tracking-tighter">{Math.round(speed)}<span className="text-xs ml-1 text-white/40">KM/H</span></span>
          </div>

          <div className="w-64 bg-black p-4 border border-white/40 mb-0.5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black tracking-widest">HULL INTEGRITY</span>
              <span className={`font-black ${isLowHealth ? 'text-destructive' : 'text-primary'}`}>{hp}%</span>
            </div>
            <Progress value={hp} className="h-3 bg-white/10" />
          </div>
        </div>

        {/* WEAPONS */}
        <div className="flex gap-2">
          <div className={`bg-black p-4 border-2 transition-all min-w-[110px] flex flex-col items-center ${selectedWeapon === 'mg' ? 'border-primary scale-110' : 'border-white/10 opacity-40'}`}>
            <span className="text-[10px] font-black mb-1">MG-20 [1]</span>
            <span className="text-3xl font-black">{ammo}</span>
          </div>
          <div className={`bg-black p-4 border-2 transition-all min-w-[110px] flex flex-col items-center ${selectedWeapon === 'missile' ? 'border-destructive scale-110' : 'border-white/10 opacity-40'}`}>
            <span className="text-[10px] font-black mb-1">AGM-65 [2]</span>
            <span className="text-3xl font-black">{missiles}</span>
          </div>
          <div className="bg-black p-4 border border-white/10 min-w-[110px] flex flex-col items-center opacity-60">
            <span className="text-[10px] font-black mb-1 text-blue-400">FLARE [X]</span>
            <span className="text-3xl font-black text-blue-400">{flares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
