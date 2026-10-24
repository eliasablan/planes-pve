import { hash2, sampleTerrainHeight, sampleTerrainSlope } from "./terrainHeight";
import { WORLD_TOPOLOGY } from "./worldTopology";

export type ScatterKind = "tree" | "pine" | "bush" | "rock";

export interface ScatterItem {
  kind: ScatterKind;
  /** Base of the object, already sunk below the lowest ground point of its footprint. */
  position: [number, number, number];
  /** Overall height in world units (rocks: largest extent). */
  size: number;
  /** Ground radius used to seat the object. */
  footprint: number;
  rotation: number;
}

// Sizes in world units against the 2.6 u player wingspan: broadleaf trees ≈2–3 spans tall, pines ≈2.5–4,
// bushes about half a span, rocks from cockpit-sized stones to boulders on mountain slopes.
export const SCATTER_SIZES: Record<ScatterKind, { min: number; max: number; footprint: number; sink: number }> = {
  tree: { min: 5, max: 8, footprint: 0.12, sink: 0.04 },
  pine: { min: 6.5, max: 11, footprint: 0.1, sink: 0.04 },
  bush: { min: 1.2, max: 2.4, footprint: 0.45, sink: 0.1 },
  rock: { min: 1.2, max: 6.5, footprint: 0.42, sink: 0.18 },
};

// Vegetation stays above the beach and below the bare rock and snow of the crests.
const LAND_MIN = 3.5;
const TREE_LINE = 150;
const MAX_TREE_SLOPE = 0.6;

export function generateScatter(): ScatterItem[] {
  const items: ScatterItem[] = [];
  const reach = WORLD_TOPOLOGY.islandRadius - 60;

  // Forest clusters: denser groups with a mixed edge, pines taking over with altitude.
  for (let c = 0; c < 110; c++) {
    const [cx, cz] = polar(hash2(c, 1, 101), hash2(c, 2, 101), reach);
    const ch = sampleTerrainHeight(cx, cz);
    if (ch < LAND_MIN + 2 || ch > TREE_LINE - 10 || sampleTerrainSlope(cx, cz) > 0.45) continue;
    const spread = 22 + hash2(c, 3, 101) * 48;
    const count = 8 + Math.floor(hash2(c, 4, 101) * 16);
    for (let i = 0; i < count; i++) {
      const seed = c * 64 + i;
      const angle = hash2(seed, 5, 103) * Math.PI * 2;
      const distance = Math.sqrt(hash2(seed, 6, 103)) * spread;
      const x = cx + Math.cos(angle) * distance;
      const z = cz + Math.sin(angle) * distance;
      const h = sampleTerrainHeight(x, z);
      const pineChance = 0.2 + Math.min(0.7, Math.max(0, (h - 40) / 90));
      const kind: ScatterKind = hash2(seed, 7, 103) < pineChance ? "pine" : "tree";
      pushItem(items, kind, x, z, seed);
      // Undergrowth along the cluster edge.
      if (distance > spread * 0.7 && hash2(seed, 8, 103) < 0.45) {
        pushItem(items, "bush", x + Math.cos(angle) * 6, z + Math.sin(angle) * 6, seed + 50000);
      }
    }
  }

  // Lone trees and bushes across the lowlands.
  for (let i = 0; i < 260; i++) {
    const [x, z] = polar(hash2(i, 1, 107), hash2(i, 2, 107), reach);
    const roll = hash2(i, 3, 107);
    pushItem(items, roll < 0.35 ? "tree" : roll < 0.5 ? "pine" : "bush", x, z, 100000 + i);
  }

  // Rocks favour slopes and high ground; a few sit on the beach above the waterline.
  for (let i = 0; i < 700; i++) {
    const [x, z] = polar(hash2(i, 1, 109), hash2(i, 2, 109), WORLD_TOPOLOGY.islandRadius + 20);
    const h = sampleTerrainHeight(x, z);
    const slope = sampleTerrainSlope(x, z);
    const keep = h > 70 || slope > 0.3 ? 0.9 : h < LAND_MIN ? 0.25 : 0.12;
    if (hash2(i, 3, 109) < keep) pushItem(items, "rock", x, z, 200000 + i);
  }

  return items;
}

function pushItem(items: ScatterItem[], kind: ScatterKind, x: number, z: number, seed: number) {
  const spec = SCATTER_SIZES[kind];
  const centre = sampleTerrainHeight(x, z);
  const slope = sampleTerrainSlope(x, z);
  const minGround = WORLD_TOPOLOGY.seaLevel + 2.5;

  if (kind === "rock") {
    if (centre < minGround || slope > 1.4) return;
  } else if (centre < LAND_MIN || centre > TREE_LINE || slope > (kind === "bush" ? 0.75 : MAX_TREE_SLOPE)) {
    return;
  }

  const highRock = kind === "rock" && (centre > 70 || slope > 0.35);
  const t = hash2(seed, 11, 113);
  const size = kind === "rock" && !highRock ? spec.min + t * 2.2 : spec.min + t * (spec.max - spec.min);
  const footprint = size * spec.footprint;

  // Seat on the lowest point under the footprint so no edge floats on a slope, and skip spots so
  // steep that the uphill side would bury much of the object.
  let ground = centre;
  let highest = centre;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const h = sampleTerrainHeight(x + Math.cos(a) * footprint, z + Math.sin(a) * footprint);
    ground = Math.min(ground, h);
    highest = Math.max(highest, h);
  }
  if (ground < minGround || highest - ground > size * (kind === "rock" ? 0.38 : 0.3)) return;

  items.push({
    kind,
    position: [x, ground - size * spec.sink, z],
    size,
    footprint,
    rotation: hash2(seed, 12, 113) * Math.PI * 2,
  });
}

function polar(u: number, v: number, radius: number): [number, number] {
  const angle = u * Math.PI * 2;
  const distance = Math.sqrt(v) * radius;
  return [Math.cos(angle) * distance, Math.sin(angle) * distance];
}
