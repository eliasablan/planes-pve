"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { Environment } from "./Environment";
import { Airplane } from "./Airplane";
import { useGameStore } from "@/store/useGameStore";
import { HUD } from "../ui/HUD";
import { GameOver } from "../ui/GameOver";
import { resetLocalMatch, startLocalMatch } from "@/lib/matchLifecycle";

export default function Scene({ onExit }: { onExit?: () => void }) {
  const { gameStatus, hp } = useGameStore();
  const isFinished = hp <= 0 || gameStatus === "finished";

  useEffect(() => {
    startLocalMatch();
  }, []);

  const handleRestart = () => {
    resetLocalMatch();
    startLocalMatch();
  };

  const handleExit = () => {
    resetLocalMatch();
    onExit?.();
  };

  return (
    <div className="absolute inset-0 h-screen w-screen overflow-hidden bg-black select-none">
      {gameStatus === "playing" && (
        <>
          <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
            <Suspense fallback={null}>
              <Physics gravity={[0, 0, 0]}>
                <Environment />
                <Airplane userId="solo-pilot" username="Solo Pilot" />
              </Physics>
            </Suspense>
          </Canvas>
          <HUD />
        </>
      )}

      {isFinished && <GameOver onRestart={handleRestart} onExit={handleExit} />}
    </div>
  );
}
