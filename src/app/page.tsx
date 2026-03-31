"use client";

import { useState } from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl text-center">
          SKYBOUND BATTLE ROYALE
        </h1>
        <p className="text-xl text-muted-foreground text-center max-w-[600px]">
          High-performance multiplayer airplane combat. Last pilot flying wins.
        </p>
        
        <div className="flex flex-col items-center gap-4 p-8 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold">Select Theme</h2>
          <ThemeSwitcher />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setInGame(true)}
            className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 transition-opacity"
          >
            ENTER LOBBY
          </button>
          <button className="px-8 py-3 border border-primary text-primary font-bold rounded-md hover:bg-primary/10 transition-colors">
            LEADERBOARD
          </button>
        </div>
      </div>
    </main>
  );
}
