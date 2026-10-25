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
import { PauseMenu } from "../ui/PauseMenu";
import { pauseRun, resetRun, resumeRun, startRun } from "@/lib/runLifecycle";
import { stopGameAudio, unlockGameAudio } from "@/lib/gameAudio";

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
  const paused = useGameStore(state => state.paused);
  const isFinished = hp <= 0 || gameStatus === "finished";

  useEffect(() => {
    startRun();
    return stopGameAudio;
  }, []);

  useEffect(() => {
    const togglePause = (event: KeyboardEvent) => {
      if ((event.code !== "KeyP" && event.key !== "Escape") || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.matches("input,select,textarea,[contenteditable]"))) return;
      if (useGameStore.getState().paused) {
        resumeRun();
        document.querySelector<HTMLElement>("[data-game-shell]")?.focus({ preventScroll: true });
      } else {
        pauseRun();
      }
    };
    window.addEventListener("keydown", togglePause);
    return () => window.removeEventListener("keydown", togglePause);
  }, []);

  const handleRestart = () => {
    resetRun();
    unlockGameAudio();
    startRun();
  };

  const handleExit = () => {
    resetRun();
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
              <Physics gravity={[0, 0, 0]} paused={paused}>
                <Environment />
                <Airplane />
                <PveDirector />
              </Physics>
            </Suspense>
          </Canvas>
          <HUD display={settings} onDisplayChange={update} />
        </>
      )}

      {paused && !isFinished && <PauseMenu onExit={handleExit} />}
      {isFinished && <GameOver onRestart={handleRestart} onExit={handleExit} />}
    </div>
  );
}
