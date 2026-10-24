"use client";

import { useEffect, useRef } from "react";
import { terrainElevation } from "@/lib/terrainHeight";
import { WORLD_TOPOLOGY } from "@/lib/worldTopology";

// The game's own island heightfield drawn as a dot cloud, seen from above at an angle, with a
// simulated dogfight: the pilot (blue) flies a figure-eight while enemies (red) circle around it.

type Point = { x: number; z: number; h: number; land: boolean };
type Craft = { x: number; z: number; y: number };

const PILOT_COLOR = "#3d8bff";
const ENEMY_COLOR = "#ff4d3d";
const ENEMY_COUNT = 5;
const TRAIL_LENGTH = 26;

let cachedPoints: Point[] | null = null;
function islandPoints() {
  if (cachedPoints) return cachedPoints;
  const step = 21;
  const extent = 1240;
  const points: Point[] = [];
  for (let x = -extent; x <= extent; x += step) {
    for (let z = -extent; z <= extent; z += step) {
      if (Math.hypot(x, z) > extent) continue;
      const h = terrainElevation(x, z);
      const land = h > WORLD_TOPOLOGY.seaLevel + 1;
      // Sea stays as a sparse lattice so the coastline reads.
      if (!land && (Math.round(x / step) + Math.round(z / step)) % 3 !== 0) continue;
      points.push({ x, z, h: Math.max(h, WORLD_TOPOLOGY.seaLevel), land });
    }
  }
  cachedPoints = points;
  return points;
}

function pilotAt(t: number): Craft {
  return { x: Math.sin(t * 0.13) * 560, z: Math.sin(t * 0.26) * 380, y: 230 + Math.sin(t * 0.21) * 40 };
}

function enemyAt(t: number, index: number, pilot: Craft): Craft {
  const phase = (index / ENEMY_COUNT) * Math.PI * 2;
  const angle = t * (0.32 + index * 0.04) + phase;
  const radius = 190 + Math.sin(t * 0.3 + index) * 90;
  return {
    x: pilot.x + Math.cos(angle) * radius,
    z: pilot.z + Math.sin(angle) * radius * 0.8,
    y: 200 + Math.sin(t * 0.5 + phase) * 60,
  };
}

export function IslandBackdrop({ className, aircraft = true }: { className?: string; aircraft?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const points = islandPoints();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trails: Craft[][] = Array.from({ length: ENEMY_COUNT + 1 }, () => []);
    let frame = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const t = still ? 12 : 12 + (now - start) / 1000;
      const yaw = 0.5 + t * 0.03;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      // Camera above the island looking down ~43°: far ground rises on screen, height lifts toward the viewer.
      const pitch = 0.75;
      const sp = Math.sin(pitch);
      const cp = Math.cos(pitch);
      const scale = Math.max(w, h * 1.2) / 3000;
      const relief = 3;

      const project = (x: number, z: number, y: number) => {
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        const depth = rz * cp - y * relief * sp;
        const persp = 2600 / (2600 + depth);
        return {
          x: w / 2 + rx * scale * persp,
          y: h * 0.52 - (rz * sp + y * relief * cp) * scale * persp,
          persp,
          near: Math.min(1, Math.max(0, 0.5 - depth / 2600)),
        };
      };

      ctx.fillStyle = "#f2f2f0";
      for (const p of points) {
        const s = project(p.x, p.z, p.h);
        ctx.globalAlpha = p.land ? 0.22 + s.near * 0.5 + Math.min(0.3, p.h / 450) : 0.12 + s.near * 0.12;
        const r = (p.land ? 1.4 : 0.9) * s.persp;
        ctx.fillRect(s.x, s.y, r, r);
      }

      if (aircraft) {
        const pilot = pilotAt(t);
        const craft = [pilot, ...Array.from({ length: ENEMY_COUNT }, (_, i) => enemyAt(t, i, pilot))];
        craft.forEach((c, i) => {
          const trail = trails[i];
          trail.push(c);
          if (trail.length > TRAIL_LENGTH) trail.shift();
          const color = i === 0 ? PILOT_COLOR : ENEMY_COLOR;
          const head = project(c.x, c.z, c.y);
          const ground = project(c.x, c.z, Math.max(WORLD_TOPOLOGY.seaLevel, terrainElevation(c.x, c.z)));

          // Altitude drop line, then the fading trail, then the aircraft itself.
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(ground.x, ground.y); ctx.stroke();
          ctx.setLineDash([]);

          trail.forEach((p, j) => {
            const s = project(p.x, p.z, p.y);
            ctx.globalAlpha = (j / trail.length) * 0.5;
            ctx.fillStyle = color;
            ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
          });

          const size = (i === 0 ? 4 : 3) * head.persp;
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(head.x, head.y, size, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          if (i === 0) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(head.x, head.y, size + 6, 0, Math.PI * 2); ctx.stroke();
          }
        });
      }

      ctx.globalAlpha = 1;
      if (!still) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [aircraft]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
