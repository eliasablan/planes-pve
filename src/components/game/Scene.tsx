"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { Environment } from "./Environment";
import { Airplane } from "./Airplane";
import { MultiplayerProvider } from "./MultiplayerProvider";
import { RemoteAirplane } from "./RemoteAirplane";
import { useGameStore } from "@/store/useGameStore";

export default function Scene({ 
  userId = "player-1", 
  username = "Pilot 1", 
  roomName = "default-room" 
}: { 
  userId?: string, 
  username?: string, 
  roomName?: string 
}) {
  const players = useGameStore((state) => state.players);

  return (
    <MultiplayerProvider userId={userId} username={username} roomName={roomName}>
      <div className="w-full h-full absolute inset-0 bg-black">
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 60 }}
        >
          <Suspense fallback={null}>
            <Physics gravity={[0, 0, 0]}>
              <Environment />
              <Airplane userId={userId} username={username} roomName={roomName} />
              
              {Object.values(players).map((player) => (
                player.id !== userId && (
                  <RemoteAirplane key={player.id} data={player} />
                )
              ))}
            </Physics>
          </Suspense>
        </Canvas>
      </div>
    </MultiplayerProvider>
  );
}
