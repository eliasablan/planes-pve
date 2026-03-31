"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target, MousePointer2, Keyboard, AlertTriangle, Radio } from "lucide-react";
import { Minimap } from "./Minimap";
import { useControls } from "@/hooks/useControls";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score, altitude, speed, pitch, roll, selectedWeapon } = useGameStore();
  const { mouseControlEnabled } = useControls();

  const isLowHealth = hp < 30;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 font-mono select-none overflow-hidden text-primary uppercase">
      
      {/* IMMERSIVE GAS VIGNETTE */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(circle,transparent_40%,rgba(255,0,0,0.3)_100%)]"
        style={{ opacity: Math.max(0, (100 - hp) / 100) }}
      />

      {/* HEADER: COMMS & LOGS */}
      <div className="flex justify-between items-start w-full relative z-20">
        <div className="flex flex-col gap-3">
          {/* Main Status Bar */}
          <div className="flex items-center gap-4 bg-black/80 border-l-4 border-primary px-4 py-2 backdrop-blur-md shadow-lg">
            <Radio className="w-4 h-4 animate-pulse text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary/60 leading-none">Pilot Tag</span>
              <span className="text-sm font-black tracking-tight">ACE-01</span>
            </div>
            <div className="h-8 w-px bg-primary/20 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary/60 leading-none">Net Score</span>
              <span className="text-sm font-black tracking-tight">{score.toString().padStart(6, '0')}</span>
            </div>
          </div>

          {/* Control Mode */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-black/60 border border-primary/20 self-start transition-colors ${mouseControlEnabled ? 'text-primary' : 'text-white/40'}`}>
            {mouseControlEnabled ? <MousePointer2 className="w-3 h-3" /> : <Keyboard className="w-3 h-3" />}
            <span className="text-[9px] font-bold">Steering: {mouseControlEnabled ? 'Direct Link' : 'Manual Keys'} [M]</span>
          </div>
        </div>

        {/* KILL FEED & MAP */}
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-1 items-end">
            {killLog.slice(0, 3).map((log) => (
              <div key={log.id} className="bg-black/80 px-3 py-1 border-r-2 border-primary text-[10px] animate-in fade-in slide-in-from-right duration-500">
                <span className="font-bold">{log.killer}</span>
                <span className="mx-2 text-white/30">»</span>
                <span className="text-destructive font-bold">{log.victim}</span>
              </div>
            ))}
          </div>
          <Minimap />
        </div>
      </div>

      {/* CENTRAL CROSSHAIR AREA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full max-w-2xl h-64">
        {/* Dynamic Artificial Horizon / Crosshair */}
        <div className="relative w-32 h-32 opacity-40">
          <div 
            className="absolute inset-0 border-x-2 border-primary/50 transition-transform duration-100"
            style={{ transform: `rotate(${-roll}deg) translateY(${pitch * 2}px)` }}
          />
          <Crosshair className="absolute inset-0 w-full h-full text-primary stroke-[0.5px]" />
        </div>

        {/* Alarms */}
        {isLowHealth && (
          <div className="absolute top-[-80px] flex flex-col items-center gap-1 animate-pulse">
            <div className="bg-destructive text-white px-4 py-1 text-xs font-black tracking-widest shadow-2xl">WARNING: HULL INTEGRITY</div>
            <div className="text-[8px] text-destructive font-bold">CRITICAL DAMAGE SUSTAINED</div>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: TELEMETRY & WEAPONS */}
      <div className="flex justify-between items-end w-full relative z-20">
        
        {/* FLIGHT DATA GROUP */}
        <div className="flex gap-4 items-end">
          {/* SPEED TAPE */}
          <div className="flex flex-col gap-1">
            <div className="h-40 w-14 bg-black/60 border border-primary/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-center items-end pr-2 text-[8px] text-primary/40 leading-none gap-4">
                <span>200</span><span>150</span><span>100</span><span>050</span><span>000</span>
              </div>
              <div className="absolute inset-y-0 right-0 w-1 bg-primary/20" />
              <div className="absolute top-1/2 -translate-y-1/2 right-0 left-0 bg-primary/90 text-black text-center py-1 font-black text-sm skew-x-[-10deg]">
                {Math.round(speed)}
              </div>
            </div>
            <span className="text-[8px] font-bold text-center">IAS / KTS</span>
          </div>

          {/* ALTITUDE TAPE */}
          <div className="flex flex-col gap-1">
            <div className="h-40 w-14 bg-black/60 border border-primary/20 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-center items-start pl-2 text-[8px] text-primary/40 leading-none gap-4">
                <span>999</span><span>750</span><span>500</span><span>250</span><span>000</span>
              </div>
              <div className="absolute inset-y-0 left-0 w-1 bg-primary/20" />
              <div className="absolute top-1/2 -translate-y-1/2 right-0 left-0 bg-primary/90 text-black text-center py-1 font-black text-sm skew-x-[10deg]">
                {Math.round(altitude)}
              </div>
            </div>
            <span className="text-[8px] font-bold text-center">ALT / FT</span>
          </div>

          {/* Integrity Bar */}
          <div className="w-48 mb-1">
            <div className="flex justify-between items-center mb-1 text-[9px] font-bold tracking-widest">
              <span>HULL STATUS</span>
              <span className={isLowHealth ? "text-destructive" : "text-primary"}>{hp}%</span>
            </div>
            <Progress value={hp} className={`h-1.5 bg-white/5 ${isLowHealth ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
          </div>
        </div>

        {/* WEAPONS SYSTEM */}
        <div className="flex gap-3">
          <WeaponBox 
            label="MG-20" 
            count={ammo} 
            active={selectedWeapon === 'mg'} 
            shortcut="1" 
            icon={<Zap className="w-3 h-3" />}
          />
          <WeaponBox 
            label="AGM-65" 
            count={missiles} 
            active={selectedWeapon === 'missile'} 
            shortcut="2" 
            color="destructive"
            icon={<Target className="w-3 h-3" />}
          />
          <div className="bg-black/60 border border-primary/10 p-3 flex flex-col items-center min-w-[70px] opacity-60">
            <Shield className="w-3 h-3 mb-1 text-blue-400" />
            <span className="text-[8px] font-bold text-white/40">CM-FLR [X]</span>
            <span className="text-xl font-black text-blue-400">{flares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeaponBox({ label, count, active, shortcut, color = "primary", icon }: any) {
  const colorClass = color === "destructive" ? "text-destructive" : "text-primary";
  const borderColor = active ? (color === "destructive" ? "border-destructive" : "border-primary") : "border-primary/10";
  const bgColor = active ? (color === "destructive" ? "bg-destructive/10" : "bg-primary/10") : "bg-black/60";

  return (
    <div className={`p-3 border transition-all duration-300 flex flex-col items-center min-w-[85px] backdrop-blur-md ${borderColor} ${bgColor} ${active ? 'scale-110 shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 'opacity-40'}`}>
      <div className={`flex items-center gap-1 mb-1 ${active ? colorClass : 'text-white/40'}`}>
        {icon}
        <span className="text-[8px] font-black tracking-tighter">{label} [{shortcut}]</span>
      </div>
      <span className={`text-2xl font-black ${active ? colorClass : 'text-white/60'}`}>{count}</span>
    </div>
  );
}
