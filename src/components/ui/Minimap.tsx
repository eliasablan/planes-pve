"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef } from "react";

export function Minimap() {
  const { players, zoneRadius, altitude, speed } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Map settings
  const mapSize = 180;
  const viewRange = 1500; // Meters visible in the minimap
  const scale = mapSize / viewRange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, mapSize, mapSize);
      
      // We'll assume local player is at 0,0 for the visual map center (player-centric)
      // If we had local position in store, we'd offset everything by -playerPos
      const centerX = mapSize / 2;
      const centerY = mapSize / 2;

      // 1. Draw Background (Ocean)
      ctx.fillStyle = "#003049";
      ctx.fillRect(0, 0, mapSize, mapSize);

      // 2. Draw Island
      ctx.fillStyle = "#2d6a4f";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 1000 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#40916c";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Draw Zone (Safe Area)
      ctx.strokeStyle = "#ff0000";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zoneRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Outer Gas Effect
      const gradient = ctx.createRadialGradient(centerX, centerY, zoneRadius * scale, centerX, centerY, mapSize);
      gradient.addColorStop(0, "rgba(255, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(255, 0, 0, 0.4)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, mapSize, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, zoneRadius * scale, 0, Math.PI * 2, true);
      ctx.fill();

      // 4. Draw Local Player (Center Triangle)
      ctx.save();
      ctx.translate(centerX, centerY);
      // rotation would go here
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 8);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 5. Draw Remote Players
      Object.values(players).forEach(p => {
        // Position relative to local (which we assume is 0,0 for now)
        const px = centerX + p.position[0] * scale;
        const py = centerY + p.position[2] * scale;
        
        if (px > 0 && px < mapSize && py > 0 && py < mapSize) {
          ctx.fillStyle = "#ffcc00";
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          // Health bar mini
          ctx.fillStyle = "red";
          ctx.fillRect(px - 5, py + 6, 10, 2);
          ctx.fillStyle = "lime";
          ctx.fillRect(px - 5, py + 6, (p.hp / 100) * 10, 2);
        }
      });

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [players, zoneRadius, scale]);

  return (
    <div className="relative border-4 border-white/20 rounded-lg overflow-hidden shadow-2xl bg-black/60 backdrop-blur-md">
      <div className="absolute top-0 left-0 w-full bg-primary/20 text-[10px] font-bold text-center py-0.5 uppercase tracking-tighter">Tactical Map</div>
      <canvas 
        ref={canvasRef} 
        width={mapSize} 
        height={mapSize} 
      />
      <div className="absolute bottom-1 right-2 text-[10px] font-mono text-white/50">R: {Math.round(zoneRadius)}m</div>
    </div>
  );
}
