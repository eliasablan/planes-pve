"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { Environment } from "./Environment";

export default function Scene() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Environment />
            {/* Players and other entities will go here */}
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
