"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useRef } from "react";

interface MinimapProps {
  large?: boolean;
}

export function Minimap({ large = false }: MinimapProps) {
  const { 
    players, 
    localPlayerPosition, 
    heading,
    zoneRadius, 
    zoneCenter, 
    targetZoneRadius, 
    targetZoneCenter 
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const mapSize = large ? 600 : 180;
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

      // 1. OCEAN BASE
      ctx.fillStyle = "#001d3d";
      ctx.fillRect(0, 0, mapSize, mapSize);

      // 2. GRID
      ctx.strokeStyle = "rgba(0, 53, 102, 0.4)";
      ctx.lineWidth = large ? 1 : 0.5;
      const step = large ? 40 : 20;
      for (let i = 0; i < mapSize; i += step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, mapSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(mapSize, i); ctx.stroke();
      }

      // 3. TOPOGRAPHY / COASTLINE
      // Island Base (Sandy coast)
      ctx.fillStyle = "#c2b280";
      ctx.beginPath();
      ctx.arc(cx, cy, 1050 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Grass Layer
      ctx.fillStyle = "#2d6a4f";
      ctx.beginPath();
      ctx.arc(cx, cy, 1000 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Mountains (Topography)
      ctx.fillStyle = "#1b4332";
      // Peak 1 (0, 0)
      ctx.beginPath(); ctx.arc(cx, cy, 250 * scale, 0, Math.PI * 2); ctx.fill();
      // Peak 2 (300, -200)
      ctx.beginPath(); ctx.arc(cx + 300 * scale, cy - 200 * scale, 150 * scale, 0, Math.PI * 2); ctx.fill();
      // Peak 3 (-250, 300)
      ctx.beginPath(); ctx.arc(cx - 250 * scale, cy + 300 * scale, 120 * scale, 0, Math.PI * 2); ctx.fill();

      // Coastline stroke
      ctx.strokeStyle = "#40916c";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 1000 * scale, 0, Math.PI * 2); ctx.stroke();

      // 4. NEXT SAFE AREA (WHITE DASHED)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        cx + targetZoneCenter[0] * scale, 
        cy + targetZoneCenter[1] * scale, 
        targetZoneRadius * scale, 0, Math.PI * 2
      );
      ctx.stroke();

      // 5. CURRENT GAS ZONE
      ctx.setLineDash([]);
      const gx = cx + zoneCenter[0] * scale;
      const gy = cy + zoneCenter[1] * scale;
      const gr = zoneRadius * scale;
      
      ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.rect(0, 0, mapSize, mapSize);
      ctx.arc(gx, gy, gr, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();

      // 6. PLAYERS
      Object.values(players).forEach(p => {
        const px = cx + p.position[0] * scale;
        const py = cy + p.position[2] * scale;
        if (px > 0 && px < mapSize && py > 0 && py < mapSize) {
          ctx.fillStyle = "#ffc300";
          ctx.beginPath(); ctx.arc(px, py, large ? 5 : 3, 0, Math.PI * 2); ctx.fill();
        }
      });

      // LOCAL PLAYER
      const lpx = cx + localPlayerPosition[0] * scale;
      const lpy = cy + localPlayerPosition[1] * scale;
      
      ctx.save();
      ctx.translate(lpx, lpy);
      ctx.rotate((-heading * Math.PI) / 180); // Rotate by heading
      
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -(large ? 10 : 6));
      ctx.lineTo((large ? 7 : 4), (large ? 8 : 5));
      ctx.lineTo(-(large ? 7 : 4), (large ? 8 : 5));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [players, localPlayerPosition, heading, zoneRadius, zoneCenter, targetZoneRadius, targetZoneCenter, scale, mapSize]);


  return (
    <div className={`relative border-4 border-white/20 bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden ${large ? 'rounded-2xl' : 'rounded-lg'}`}>
      <div className={`absolute top-0 left-0 w-full bg-primary/20 text-white font-black text-center uppercase tracking-widest ${large ? 'py-2 text-sm' : 'py-0.5 text-[8px]'}`}>
        {large ? 'Full Tactical Command Map' : 'GPS Link'}
      </div>
      <canvas ref={canvasRef} width={mapSize} height={mapSize} />
      {large && (
        <div className="absolute bottom-4 left-6 flex flex-col gap-2 bg-black/80 p-4 border border-white/20 text-[10px] font-bold">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white" /> LOCAL UNIT</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ffc300]" /> HOSTILE CONTACT</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-red-600" /> GAS PERIMETER</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-dashed border-white" /> NEXT SAFE ZONE</div>
        </div>
      )}
    </div>
  );
}
