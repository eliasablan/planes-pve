"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { Environment } from "./Environment";
import { Airplane } from "./Airplane";
import { MultiplayerProvider } from "./MultiplayerProvider";
import { RemoteAirplane } from "./RemoteAirplane";
import { TheZone } from "./TheZone";
import { useGameStore } from "@/store/useGameStore";
import { HUD } from "../ui/HUD";
import { Lobby } from "../ui/Lobby";
import { GameOver } from "../ui/GameOver";
import { resetLocalMatch, startLocalMatch } from "@/lib/matchLifecycle";

export default function Scene({ 
  userId = "player-1", 
  username = "Pilot 1", 
  roomName = "default-room" 
}: { 
  userId?: string, 
  username?: string, 
  roomName?: string 
}) {
  const { gameStatus, players, hp } = useGameStore();

  const handleStart = () => {
    startLocalMatch();
  };

  const handleExit = () => {
    resetLocalMatch();
    // Redirect back to main page state (this is handled by parent Home component)
    window.location.reload(); 
  };

  const handleRestart = () => {
    resetLocalMatch();
    window.location.reload(); 
  };

  return (
    <MultiplayerProvider userId={userId} username={username} roomName={roomName}>
      <div className="w-full h-full absolute inset-0 bg-black overflow-hidden select-none">
        {gameStatus === "lobby" && (
          <Lobby roomName={roomName} onStart={handleStart} onExit={handleExit} />
        )}

        {(gameStatus === "playing" || gameStatus === "countdown") && (
          <>
            <Canvas
              shadows
              camera={{ position: [0, 5, 10], fov: 60 }}
            >
              <Suspense fallback={null}>
                <Physics gravity={[0, 0, 0]}>
                  <Environment />
                  <TheZone />
                  <Airplane userId={userId} username={username} roomName={roomName} />
                  
                  {Object.values(players).map((player) => (
                    player.id !== userId && (
                      <RemoteAirplane key={player.id} data={player} />
                    )
                  ))}
                </Physics>
              </Suspense>
            </Canvas>
            <HUD />
          </>
        )}

        {(hp <= 0 || gameStatus === "finished") && (
          <GameOver onRestart={handleRestart} />
        )}
      </div>
    </MultiplayerProvider>
  );
}
