"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef } from "react";

export function Minimap() {
  const { players, zoneRadius, zoneCenter, targetZoneRadius, targetZoneCenter } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Map settings
  const mapSize = 180;
  const worldSize = 4000; // Visible world diameter in minimap
  const scale = mapSize / worldSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, mapSize, mapSize);
      
      const centerX = mapSize / 2;
      const centerY = mapSize / 2;

      // 1. Draw Background (Ocean)
      ctx.fillStyle = "#003049";
      ctx.fillRect(0, 0, mapSize, mapSize);

      // 2. Draw Island (Fixed at 0,0)
      ctx.fillStyle = "#2d6a4f";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 1000 * scale, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw NEXT Safe Area (White dashed line)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        centerX + targetZoneCenter[0] * scale, 
        centerY + targetZoneCenter[1] * scale, 
        targetZoneRadius * scale, 0, Math.PI * 2
      );
      ctx.stroke();

      // 4. Draw CURRENT Gas Zone (Red line + shade)
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      const zX = centerX + zoneCenter[0] * scale;
      const zY = centerY + zoneCenter[1] * scale;
      const zR = zoneRadius * scale;
      
      ctx.beginPath();
      ctx.arc(zX, zY, zR, 0, Math.PI * 2);
      ctx.stroke();
      
      // Outside shade
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.rect(0, 0, mapSize, mapSize);
      ctx.arc(zX, zY, zR, 0, Math.PI * 2, true);
      ctx.fill();

      // 5. Draw Local Player (Center Triangle - assuming 0,0 for now or add localPos)
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 6);
      ctx.lineTo(centerX + 4, centerY + 6);
      ctx.lineTo(centerX - 4, centerY + 6);
      ctx.closePath();
      ctx.fill();

      // 6. Draw Remote Players
      Object.values(players).forEach(p => {
        const px = centerX + p.position[0] * scale;
        const py = centerY + p.position[2] * scale;
        
        if (px > 0 && px < mapSize && py > 0 && py < mapSize) {
          ctx.fillStyle = "#ffcc00";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [players, zoneRadius, zoneCenter, targetZoneRadius, targetZoneCenter, scale]);

  return (
    <div className="relative border-4 border-white/20 rounded-lg overflow-hidden shadow-2xl bg-black/60 backdrop-blur-md">
      <div className="absolute top-0 left-0 w-full bg-destructive/40 text-[8px] font-black text-center py-0.5 uppercase tracking-widest text-white">Gas Warning</div>
      <canvas 
        ref={canvasRef} 
        width={mapSize} 
        height={mapSize} 
      />
    </div>
  );
}
