"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/store/useGameStore";
import { AuthForm } from "@/components/ui/AuthForm";
import { supabase } from "@/lib/supabase";
import { LogOut, User as UserIcon } from "lucide-react";

const Scene = dynamic(() => import("@/components/game/Scene"), { ssr: false });

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const { user, setUser } = useGameStore();

  // Check for existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          username: session.user.user_metadata.username || session.user.email?.split('@')[0] || "Pilot" 
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
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground transition-colors duration-500 overflow-hidden relative">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-12">
        
        {/* Header Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 border border-primary/30 bg-primary/5 rounded-full text-[10px] font-black tracking-[0.3em] text-primary animate-pulse uppercase">
            Combat Protocol Active
          </div>
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]">
            SKYBOUND<span className="text-primary italic">BR</span>
          </h1>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest max-w-[500px] leading-relaxed">
            Multiplayer Tactical Flight Combat // High-Altitude Battle Royale // Survive the Zone
          </p>
        </div>

        {!user ? (
          <AuthForm />
        ) : (
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* User Profile Card */}
            <div className="bg-black/60 border border-primary/20 p-6 backdrop-blur-xl flex flex-col items-center gap-4 min-w-[320px] shadow-2xl relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-[8px] font-black px-3 py-0.5 tracking-tighter">AUTHENTICATED PILOT</div>
              
              <div className="flex items-center gap-4 w-full">
                <div className="bg-primary/20 p-3 rounded border border-primary/30">
                  <UserIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase leading-none mb-1">Active Unit</span>
                  <span className="text-xl font-black tracking-tight text-white">{user.username.toUpperCase()}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 hover:bg-destructive/20 hover:text-destructive text-white/20 transition-colors rounded"
                  title="Disconnect Unit"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[8px] text-white/40 font-bold uppercase">Rank</div>
                  <div className="text-xs font-black text-primary">ENSI-01</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2 text-center">
                  <div className="text-[8px] text-white/40 font-bold uppercase">Status</div>
                  <div className="text-xs font-black text-green-500 italic">READY</div>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setInGame(true)}
                className="px-16 py-5 bg-primary text-black text-2xl font-black rounded-none skew-x-[-12deg] hover:scale-105 transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)] border-2 border-white/10 hover:brightness-110 active:translate-y-1 active:shadow-none"
              >
                DEPLOY TO ZONE
              </button>
              <a 
                href="/leaderboard"
                className="px-12 py-5 border-2 border-white/20 text-white text-xl font-black rounded-none skew-x-[-12deg] hover:bg-white/5 hover:border-primary/50 transition-all text-center flex items-center justify-center uppercase tracking-widest"
              >
                Pilot Rankings
              </a>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="text-[9px] text-muted-foreground/40 uppercase font-bold tracking-[0.4em]">
            Global Servers // Sync Stable // v1.0.4-Alpha
          </div>
        </div>
      </div>
    </main>
  );
}
