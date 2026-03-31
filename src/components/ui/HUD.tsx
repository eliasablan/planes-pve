"use client";

import { useGameStore } from "@/store/useGameStore";
import { Progress } from "@/components/ui/progress";
import { Crosshair, Shield, Zap, Target, MousePointer2, Keyboard, AlertTriangle, Radio, Map as MapIcon } from "lucide-react";
import { Minimap } from "./Minimap";
import { useControls } from "@/hooks/useControls";

export function HUD() {
  const { hp, ammo, missiles, flares, killLog, score, altitude, speed, pitch, roll, selectedWeapon, showLargeMap } = useGameStore();
  const { mouseControlEnabled } = useControls();

  const isLowHealth = hp < 30;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 font-mono select-none overflow-hidden text-white uppercase">
      
      {/* IMMERSIVE GAS VIGNETTE */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(circle,transparent_40%,rgba(0,180,216,0.2)_100%)]"
        style={{ opacity: Math.max(0, (100 - hp) / 100) }}
      />

      {/* LARGE COMMAND MAP OVERLAY */}
      {showLargeMap && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl pointer-events-auto">
          <div className="animate-in zoom-in-95 duration-300 relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 text-primary">
              <MapIcon className="w-5 h-5" />
              <span className="text-xl font-black tracking-[0.4em]">TACTICAL DISPLAY</span>
            </div>
            <Minimap large />
            <div className="text-center mt-6 text-[10px] font-black tracking-[0.5em] text-white/40">
              PRESS [M] TO DISCONNECT UPLINK
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex justify-between items-start w-full relative z-20">
        <div className="flex flex-col gap-3">
          {/* Main Status Bar */}
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-5 py-3 backdrop-blur-xl rounded-xl shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[9px] text-primary font-black tracking-widest leading-none mb-1">UNIT ID</span>
              <span className="text-lg font-black text-white tracking-tighter">ACE-01</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] text-primary font-black tracking-widest leading-none mb-1">MISSION SCORE</span>
              <span className="text-lg font-black text-white tracking-tighter">{score.toString().padStart(6, '0')}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg transition-all ${mouseControlEnabled ? 'text-primary border-primary/30' : 'text-white/30'}`}>
              {mouseControlEnabled ? <MousePointer2 className="w-3.5 h-3.5" /> : <Keyboard className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-black tracking-wider">Steer: {mouseControlEnabled ? 'Direct' : 'Keys'} [O]</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white/60">
              <MapIcon className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black tracking-wider text-accent">Map [M]</span>
            </div>
          </div>
        </div>

        {/* KILL FEED */}
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-1.5 items-end">
            {killLog.slice(0, 3).map((log) => (
              <div key={log.id} className="bg-black/60 border-r-4 border-primary px-4 py-1.5 rounded-l-md text-[11px] backdrop-blur-md animate-in slide-in-from-right fade-in">
                <span className="font-bold text-white/90">{log.killer}</span>
                <span className="mx-2 text-primary/40 font-black">»</span>
                <span className="text-destructive font-black underline underline-offset-4">{log.victim}</span>
              </div>
            ))}
          </div>
          {!showLargeMap && <Minimap />}
        </div>
      </div>

      {/* CENTRAL AREA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12 pointer-events-none">
        <div className="relative w-20 h-20 opacity-60">
          <Crosshair className="w-full h-full text-primary stroke-[1.5px]" />
          <div className="absolute inset-[-20%] border-primary/20 border-2 rounded-full animate-pulse" />
        </div>
        {isLowHealth && (
          <div className="bg-destructive/90 text-white px-8 py-3 text-xl font-black tracking-[0.2em] animate-pulse rounded-lg shadow-[0_0_40px_rgba(255,0,0,0.4)] border-2 border-white/20">
            SYSTEM CRITICAL
          </div>
        )}
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex justify-between items-end w-full relative z-20">
        <div className="flex gap-4 items-end">
          {/* Telemetry Boxes */}
          <TelemetryBox label="Altitude" value={Math.round(altitude)} unit="FT" />
          <TelemetryBox label="Velocity" value={Math.round(speed)} unit="KM/H" color="text-accent" />

          {/* Integrity Bar */}
          <div className="w-72 bg-black/40 border border-white/10 p-4 rounded-xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <Shield className={`w-3.5 h-3.5 ${isLowHealth ? 'text-destructive' : 'text-primary'}`} />
                <span className="text-[10px] font-black tracking-[0.2em] text-white/60">Integrity</span>
              </div>
              <span className={`text-lg font-black ${isLowHealth ? 'text-destructive' : 'text-primary'}`}>{hp}%</span>
            </div>
            <Progress value={hp} className={`h-2 bg-white/5 ${isLowHealth ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
          </div>
        </div>

        {/* WEAPONS */}
        <div className="flex gap-3">
          <WeaponBox 
            label="MG-20" 
            count={ammo} 
            active={selectedWeapon === 'mg'} 
            shortcut="1" 
            icon={<Zap className="w-4 h-4" />}
          />
          <WeaponBox 
            label="AGM-65" 
            count={missiles} 
            active={selectedWeapon === 'missile'} 
            shortcut="2" 
            color="accent"
            icon={<Target className="w-4 h-4" />}
          />
          <div className="bg-black/40 border border-white/10 p-4 flex flex-col items-center min-w-[90px] rounded-xl backdrop-blur-md opacity-60">
            <span className="text-[9px] font-black mb-1.5 text-blue-400/60 tracking-widest text-center">Flare [X]</span>
            <span className="text-3xl font-black text-blue-400/80">{flares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelemetryBox({ label, value, unit, color = "text-white" }: any) {
  return (
    <div className="bg-black/40 border border-white/10 p-4 flex flex-col items-center min-w-[110px] rounded-xl backdrop-blur-xl">
      <span className="text-[9px] font-black text-white/40 mb-1 tracking-widest">{label}</span>
      <span className={`text-3xl font-black tracking-tighter ${color}`}>
        {value}<span className="text-[10px] ml-1 opacity-30">{unit}</span>
      </span>
    </div>
  );
}

function WeaponBox({ label, count, active, shortcut, color = "primary", icon }: any) {
  const activeColor = color === "primary" ? "text-primary" : "text-accent";
  const activeBorder = color === "primary" ? "border-primary/50" : "border-accent/50";
  const activeBg = color === "primary" ? "bg-primary/10" : "bg-accent/10";

  return (
    <div className={`p-4 border-2 transition-all duration-500 min-w-[110px] flex flex-col items-center rounded-xl backdrop-blur-md ${active ? `${activeBorder} ${activeBg} scale-110 shadow-2xl` : 'border-white/5 opacity-30'}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${active ? activeColor : 'text-white/40'}`}>
        {icon}
        <span className="text-[9px] font-black tracking-tighter uppercase">{label} [{shortcut}]</span>
      </div>
      <span className={`text-3xl font-black ${active ? 'text-white' : 'text-white/60'}`}>{count}</span>
    </div>
  );
}
