"use client";

import { Canvas, type RootState } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Environment } from "./Environment";
import { Airplane } from "./Airplane";
import { PveDirector } from "./PveDirector";
import { useGameStore } from "@/store/useGameStore";
import { HUD } from "../ui/HUD";
import { useDisplaySettings } from "../ui/GameDisplayControls";
import { GameOver } from "../ui/GameOver";
import { resetLocalMatch, startLocalMatch } from "@/lib/matchLifecycle";

function configureRenderer(state: RootState) {
  const { gl } = state;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.06;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFShadowMap;
}

export default function Scene({ onExit }: { onExit?: () => void }) {
  const { settings, update, dpr } = useDisplaySettings();
  const gameStatus = useGameStore(state => state.gameStatus);
  const hp = useGameStore(state => state.hp);
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
    <div data-game-shell tabIndex={-1} className="outline-none absolute inset-0 h-screen w-screen overflow-hidden bg-black select-none">
      {gameStatus === "playing" && (
        <>
          <Canvas
            shadows="percentage"
            dpr={dpr}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
            }}
            onCreated={configureRenderer}
            camera={{ position: [0, 5, 10], fov: 60 }}
          >
            <Suspense fallback={null}>
              <Physics gravity={[0, 0, 0]}>
                <Environment />
                <Airplane userId="solo-pilot" username="Solo Pilot" />
                <PveDirector />
              </Physics>
            </Suspense>
          </Canvas>
          <HUD display={settings} onDisplayChange={update} />
        </>
      )}

      {isFinished && <GameOver onRestart={handleRestart} onExit={handleExit} />}
    </div>
  );
}
