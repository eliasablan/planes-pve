"use client";

import { useGameStore } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Play, Globe, XCircle, Terminal, Cpu } from "lucide-react";

export function Lobby({ roomName, onStart, onExit }: { roomName: string, onStart: () => void, onExit: () => void }) {
  const players = useGameStore((s) => s.players);

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-3xl border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl rounded-3xl relative overflow-hidden border-t-white/20 animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <CardHeader className="text-center pt-12 pb-8 border-b border-white/5">
          <div className="flex items-center justify-center gap-3 text-primary/60 mb-3">
            <Globe className="w-4 h-4 animate-spin-slow" />
            <span className="text-[10px] font-black tracking-[0.5em] uppercase">Tactical Networking Grid</span>
          </div>
          <CardTitle className="text-6xl font-black tracking-tighter text-white">
            SQUAD <span className="text-primary italic">HUB</span>
          </CardTitle>
          <CardDescription className="text-white/30 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
            Sector: {roomName.toUpperCase()} // Neural Link Established
          </CardDescription>
        </CardHeader>

        <CardContent className="p-10">
          {/* Header Info Bar */}
          <div className="flex items-center justify-between mb-10 bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-0.5">Assigned Units</div>
                <div className="text-2xl font-black text-white">{Object.keys(players).length + 1} <span className="text-sm text-white/20 font-medium">/ 12</span></div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="bg-green-500/10 border border-green-500/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-green-500 tracking-[0.2em] uppercase">Encrypted // Stable</span>
              </div>
              <span className="text-[8px] text-white/20 font-bold tracking-widest mr-2 uppercase">Latency: 12ms</span>
            </div>
          </div>

          {/* Player Table */}
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden shadow-inner mb-10">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black text-white/40 tracking-[0.3em] py-5 px-8 uppercase">Unit Designation</TableHead>
                  <TableHead className="text-[10px] font-black text-white/40 tracking-[0.3em] py-5 uppercase">Mission State</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-white/40 tracking-[0.3em] py-5 px-8 uppercase">Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <TableCell className="py-6 px-8 font-black text-white flex items-center gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                    YOU (COMMANDER)
                  </TableCell>
                  <TableCell>
                    <span className="text-primary font-black text-[10px] tracking-[0.3em] uppercase bg-primary/10 px-3 py-1 rounded border border-primary/20">Synced</span>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <span className="text-xs font-mono text-white/40">MASTER_LINK</span>
                  </TableCell>
                </TableRow>
                {Object.values(players).map((p) => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="py-6 px-8 font-bold text-white/70 pl-14 uppercase tracking-tight">{p.username.split('@')[0]}</TableCell>
                    <TableCell>
                      <span className="text-white/30 font-black text-[10px] tracking-[0.3em] uppercase border border-white/10 px-3 py-1 rounded italic">Connecting</span>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <span className="text-xs font-mono text-white/20">-- MS</span>
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(players).length === 0 && (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={3} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Terminal className="w-8 h-8" />
                        <span className="text-[10px] font-black tracking-[0.5em] uppercase">Scanning for Hostile/Friendly Signatures...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Action Footer */}
          <div className="flex gap-6">
            <Button 
              variant="outline"
              size="lg"
              className="h-20 px-8 border-white/10 bg-white/5 text-white/40 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-all rounded-2xl flex flex-col items-center justify-center gap-1 group uppercase tracking-widest"
              onClick={onExit}
            >
              <XCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black">Abort Mission</span>
            </Button>

            <Button 
              size="lg" 
              className="flex-1 h-20 text-2xl font-black rounded-2xl transition-all shadow-2xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] group relative overflow-hidden"
              onClick={onStart}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Play className="mr-3 w-6 h-6 fill-current" /> DEPLOY TO ZONE
            </Button>
          </div>
          
          <div className="mt-8 text-center flex items-center justify-center gap-4 opacity-20">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white" />
            <Cpu className="w-3 h-3" />
            <span className="text-[8px] font-black tracking-[0.4em] uppercase whitespace-nowrap">Neural Link Protocol v2.4 // Delta Node</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
