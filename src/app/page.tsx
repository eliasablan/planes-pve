"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/store/useGameStore";
import { AuthForm } from "@/components/ui/AuthForm";
import { supabase } from "@/lib/supabase";
import { LogOut, User as UserIcon, Trophy, Rocket, ChevronRight, Activity, ShieldCheck } from "lucide-react";

const Scene = dynamic(() => import("@/components/game/Scene"), { ssr: false });

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const { user, setUser } = useGameStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch full profile data
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUser(data);
          });
      }
    });
  }, [setUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setInGame(false);
  };

  if (inGame && user) {
    return <Scene userId={user.id} username={user.username} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground overflow-hidden relative">
      
      {/* Sleek Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,119,182,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(0,180,216,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />

      <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-12 sm:gap-20">
        
        {/* Hierarchical Header */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3 px-4 py-1 border border-primary/20 bg-primary/5 rounded-full text-[10px] font-black tracking-[0.4em] text-primary/80 uppercase animate-in fade-in duration-1000">
            <Activity className="w-3 h-3" /> Digital Signal Synchronized
          </div>
          <div className="relative">
            <h1 className="text-7xl sm:text-9xl font-black tracking-tighter text-white flex items-center justify-center animate-in zoom-in-95 duration-700">
              SKYBOUND<span className="text-primary italic">BR</span>
            </h1>
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent blur-sm" />
          </div>
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.5em] max-w-[600px]">
            Atmospheric Combat Simulation // Neural Link v1.2
          </p>
        </div>

        {!user ? (
          <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <AuthForm />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-12 animate-in fade-in zoom-in-95 duration-700 w-full max-w-3xl">
            
            {/* Standardized Pilot Identity Card */}
            <div className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-3xl shadow-2xl relative group border-t-white/20">
              {/* Card Decoration */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              <div className="flex flex-col md:flex-row items-center gap-10">
                {/* Avatar Section */}
                <div className="relative">
                  <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 shadow-[0_0_40px_rgba(var(--primary),0.15)] group-hover:scale-105 transition-transform duration-500">
                    <UserIcon className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-background border border-primary/30 p-1.5 rounded-lg shadow-xl">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {/* Pilot Info Section */}
                <div className="flex-1 text-center md:text-left space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest">Active Connection</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-white">{user.username.toUpperCase()}</h2>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Uplink ID: {user.id.slice(0, 8)}</p>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden md:block w-px h-20 bg-white/10" />

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Combat Wins</span>
                    <span className="text-2xl font-black text-white">{user.total_wins}</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Total Kills</span>
                    <span className="text-2xl font-black text-primary">{user.total_kills}</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Neural Rank</span>
                    <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20 uppercase">Class-A</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Exp. Level</span>
                    <span className="text-xs font-black text-white italic">{Math.floor(user.ranking_points / 100)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-white/20">
                <span className="uppercase tracking-[0.2em]">Pilot Protocol // Secure v2.4</span>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 hover:text-destructive transition-colors uppercase tracking-widest group/out"
                >
                  Terminate Link
                  <LogOut className="w-3 h-3 group-hover/out:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Standardized Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
              <button 
                onClick={() => setInGame(true)}
                className="flex-[2] h-20 bg-primary text-primary-foreground text-2xl font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-4 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                DEPLOY TO ZONE
                <Rocket className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
              
              <a 
                href="/leaderboard"
                className="flex-1 h-20 border border-white/10 bg-white/5 rounded-2xl text-white text-lg font-black hover:bg-white/10 hover:border-primary/40 transition-all flex items-center justify-center gap-3 group"
              >
                <Trophy className="w-5 h-5 text-yellow-500/60" />
                PILOTS
                <ChevronRight className="w-4 h-4 opacity-30 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        )}

        {/* Global Footer info */}
        <div className="mt-12 flex flex-col items-center gap-4 opacity-30">
          <div className="flex gap-10 text-[9px] font-black tracking-[0.4em] text-primary/80 uppercase">
            <span>Encrypted Datafeed</span>
            <span>Realtime Sync: OK</span>
            <span>All Sectors Online</span>
          </div>
          <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </main>
  );
}
