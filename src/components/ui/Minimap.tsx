"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef } from "react";

export function Minimap() {
  const { players, zoneRadius, zoneCenter, targetZoneRadius, targetZoneCenter } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const mapSize = 160;
  const worldSize = 4000;
  const scale = mapSize / worldSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, mapSize, mapSize);
      const cx = mapSize / 2;
      const cy = mapSize / 2;

      // 1. BASE MAP (OCEAN)
      ctx.fillStyle = "#001d3d";
      ctx.fillRect(0, 0, mapSize, mapSize);

      // 2. GRID LINES
      ctx.strokeStyle = "rgba(0, 53, 102, 0.5)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < mapSize; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, mapSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(mapSize, i); ctx.stroke();
      }

      // 3. ISLAND
      ctx.fillStyle = "#1b4332";
      ctx.beginPath();
      ctx.arc(cx, cy, 1000 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2d6a4f";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. NEXT SAFE AREA (WHITE DASHED)
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(cx + targetZoneCenter[0] * scale, cy + targetZoneCenter[1] * scale, targetZoneRadius * scale, 0, Math.PI * 2);
      ctx.stroke();

      // 5. CURRENT GAS ZONE
      ctx.setLineDash([]);
      const gx = cx + zoneCenter[0] * scale;
      const gy = cy + zoneCenter[1] * scale;
      const gr = zoneRadius * scale;
      
      // Outer Gas Fill
      ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
      ctx.beginPath();
      ctx.rect(0, 0, mapSize, mapSize);
      ctx.arc(gx, gy, gr, 0, Math.PI * 2, true);
      ctx.fill();

      // Zone Border
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();

      // 6. REMOTE CONTACTS
      Object.values(players).forEach(p => {
        const px = cx + p.position[0] * scale;
        const py = cy + p.position[2] * scale;
        if (px > 0 && px < mapSize && py > 0 && py < mapSize) {
          ctx.fillStyle = "#ffc300";
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
          // Radar pulse feel
          ctx.strokeStyle = "rgba(255, 195, 0, 0.3)";
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.stroke();
        }
      });

      // 7. LOCAL PLAYER (CENTER)
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 8; ctx.shadowColor = "#fff";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 3.5, cy + 4); ctx.lineTo(cx - 3.5, cy + 4);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [players, zoneRadius, zoneCenter, targetZoneRadius, targetZoneCenter, scale]);

  return (
    <div className="relative border-2 border-primary/30 bg-black/40 backdrop-blur-md p-1 shadow-2xl">
      <div className="absolute -top-2 left-2 px-2 bg-black text-[7px] font-black text-primary tracking-widest border border-primary/20">GPS//LINK</div>
      <canvas ref={canvasRef} width={mapSize} height={mapSize} className="opacity-90" />
      <div className="absolute bottom-1 right-1 text-[7px] font-bold text-white/30">ZOOM 1.0x</div>
    </div>
  );
}
