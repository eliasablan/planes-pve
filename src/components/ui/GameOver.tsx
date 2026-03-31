"use client";

import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Skull, RefreshCw, Zap, Target } from "lucide-react";

export function GameOver({ winner, onRestart }: { winner?: string, onRestart: () => void }) {
  const { score, hp } = useGameStore();
  const isWinner = hp > 0;

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-black/80 backdrop-blur-2xl z-50 fixed inset-0 overflow-hidden">
      {/* Background Decorative Pulses */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full blur-[150px] opacity-20 animate-pulse ${isWinner ? 'bg-primary' : 'bg-destructive'}`} />

      <Card className={`w-full max-w-lg border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl relative overflow-hidden border-t-white/20 animate-in zoom-in-95 duration-500`}>
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent ${isWinner ? 'via-primary' : 'via-destructive'} to-transparent`} />
        
        <CardHeader className="text-center pt-12 pb-6">
          <div className="mb-6 relative">
            {isWinner ? (
              <div className="relative inline-block">
                <Trophy className="w-24 h-24 text-primary mx-auto relative z-10 drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              </div>
            ) : (
              <div className="relative inline-block">
                <Skull className="w-24 h-24 text-destructive mx-auto relative z-10 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]" />
                <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full scale-150 animate-pulse" />
              </div>
            )}
          </div>
          
          <CardTitle className={`text-6xl font-black tracking-tighter mb-2 ${isWinner ? 'text-white' : 'text-white'}`}>
            {isWinner ? "MISSION COMPLETE" : "UNIT OFFLINE"}
          </CardTitle>
          <p className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase">
            Post-Combat Debriefing // Sector Delta
          </p>
        </CardHeader>

        <CardContent className="p-8 pt-4">
          <div className="text-center mb-10">
            <p className="text-lg font-medium text-white/60 italic leading-relaxed">
              {isWinner 
                ? "Tactical supremacy achieved. You are the designated ACE pilot of this engagement." 
                : `Your unit was neutralized by ${winner || "Atmospheric Instability"}. Signal lost.`
              }
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-black/40 border border-white/5 p-6 rounded-2xl flex flex-col items-center gap-1 backdrop-blur-md">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Zap className="w-3 h-3" />
                <span className="text-[9px] font-black tracking-widest uppercase">Performance</span>
              </div>
              <div className="text-4xl font-black text-white">{score}</div>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Net Points</span>
            </div>
            <div className="bg-black/40 border border-white/5 p-6 rounded-2xl flex flex-col items-center gap-1 backdrop-blur-md">
              <div className="flex items-center gap-2 text-accent mb-1">
                <Target className="w-3 h-3" />
                <span className="text-[9px] font-black tracking-widest uppercase">Kills</span>
              </div>
              <div className="text-4xl font-black text-white">--</div>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Units Down</span>
            </div>
          </div>

          <Button 
            size="lg" 
            className={`w-full h-20 text-xl font-black rounded-2xl transition-all shadow-2xl ${isWinner ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white border border-white/10'} hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] group`}
            onClick={onRestart}
          >
            <RefreshCw className="mr-3 w-6 h-6 group-hover:rotate-180 transition-transform duration-700" /> 
            INITIALIZE RE-DEPLOYMENT
          </Button>
          
          <div className="mt-6 text-center">
            <span className="text-[8px] font-black text-white/20 tracking-[0.3em] uppercase">Uplink Encryption Active // 256-BIT AES</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
