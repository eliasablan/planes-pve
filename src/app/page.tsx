"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/game/Scene"), { ssr: false });

export default function Home() {
  const [inGame, setInGame] = useState(false);

  if (inGame) {
    return <Scene />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground transition-colors duration-500">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl text-center text-primary">
          SKYBOUND BATTLE ROYALE
        </h1>
        <p className="text-xl text-muted-foreground text-center max-w-[600px]">
          High-performance multiplayer airplane combat. Last pilot flying wins.
        </p>
        
        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => setInGame(true)}
            className="px-12 py-4 bg-primary text-primary-foreground text-xl font-black rounded-none skew-x-[-12deg] hover:scale-105 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]"
          >
            ENTER LOBBY
          </button>
          <a 
            href="/leaderboard"
            className="px-12 py-4 border-2 border-primary text-primary text-xl font-black rounded-none skew-x-[-12deg] hover:bg-primary/10 transition-all text-center"
          >
            LEADERBOARD
          </a>
        </div>

        <div className="mt-12 text-xs text-muted-foreground/50 uppercase tracking-[0.2em]">
          Current Environment: Restricted Zone // Military Protocol Active
        </div>
      </div>
    </main>
  );
}
