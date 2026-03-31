"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { Environment } from "./Environment";
import { Airplane } from "./Airplane";

export default function Scene() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, 0, 0]}> {/* No gravity for simpler airplane movement for now */}
            <Environment />
            <Airplane />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
