import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Award, Target, Rocket, ArrowLeft } from "lucide-react";

export default async function Leaderboard() {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("ranking_points", { ascending: false })
    .limit(10);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px]" />

      <Card className="w-full max-w-4xl border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl rounded-3xl relative overflow-hidden border-t-white/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        
        <CardHeader className="text-center pt-12 pb-8 border-b border-white/5">
          <div className="flex items-center justify-center gap-3 text-primary mb-3">
            <Award className="w-6 h-6" />
            <span className="text-[10px] font-black tracking-[0.5em] uppercase">Global Combat Leaderboard</span>
          </div>
          <CardTitle className="text-5xl font-black tracking-tighter text-white">
            TOP TIER <span className="text-primary">PILOTS</span>
          </CardTitle>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
            Real-time synchronization with Central Command // All Sectors
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden shadow-inner">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[100px] text-[10px] font-black text-white/40 tracking-widest py-5 px-8">RANK</TableHead>
                  <TableHead className="text-[10px] font-black text-white/40 tracking-widest py-5">PILOT DESIGNATION</TableHead>
                  <TableHead className="text-right text-[10px] font-black text-white/40 tracking-widest py-5">
                    <div className="flex items-center justify-end gap-2"><Target className="w-3 h-3" /> UNITS DOWN</div>
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black text-white/40 tracking-widest py-5 px-8">
                    <div className="flex items-center justify-end gap-2 text-primary"><Rocket className="w-3 h-3" /> NET POINTS</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles || []).map((profile, index) => (
                  <TableRow key={profile.id} className={`border-white/5 transition-colors hover:bg-white/5 ${index === 0 ? 'bg-primary/5' : ''}`}>
                    <TableCell className="py-6 px-8">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                        index === 1 ? 'bg-gray-300 text-black' : 
                        index === 2 ? 'bg-amber-700 text-white' : 
                        'bg-white/5 text-white/60 border border-white/10'
                      }`}>
                        #{index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-white tracking-tight text-lg">
                      {profile.username.toUpperCase()}
                      {index === 0 && <span className="ml-3 text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 tracking-tighter">ELITE</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-white/60">{profile.total_kills}</TableCell>
                    <TableCell className="text-right px-8">
                      <span className="text-2xl font-black text-primary tracking-tighter">{profile.ranking_points}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {(!profiles || profiles.length === 0) && (
                  <TableRow className="border-none">
                    <TableCell colSpan={4} className="py-20 text-center text-white/20 text-[10px] font-black tracking-[0.4em] uppercase">
                      NO COMBAT DATA RECORDED IN THIS SECTOR
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-12 text-center">
            <a 
              href="/" 
              className="inline-flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-primary transition-all uppercase tracking-[0.3em] group"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Return to Command Base
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-[8px] font-black text-white/10 tracking-[0.5em] uppercase flex flex-col items-center gap-2">
        <span>Global Ranking Protocol // secure_v2.0</span>
      </div>

      {/* Fixed Signature */}
      <a 
        href="https://eliasablan.dev" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-primary transition-all uppercase flex items-center gap-2 group bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 hover:border-primary/30 pointer-events-auto whitespace-nowrap"
      >
        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
        Developed by Elias Ablan
      </a>
    </main>
  );
}
