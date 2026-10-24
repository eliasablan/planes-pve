import { WORLD_TOPOLOGY } from "./worldTopology";

// The island is one deterministic heightfield. `terrainElevation` is the analytic shape used to fill the
// grid; everything that must agree with the visible surface (mesh, collider, placement, spawns) uses
// `sampleTerrainHeight`, which interpolates the grid with the mesh's own triangle split.

export const TERRAIN_GRID = {
  halfExtent: 1250,
  segments: 200,
} as const;

const CELL = (TERRAIN_GRID.halfExtent * 2) / TERRAIN_GRID.segments;
const VERTS_PER_SIDE = TERRAIN_GRID.segments + 1;
const DEEP_WATER = -40;

export function terrainElevation(x: number, z: number) {
  const { seaLevel, islandRadius, coastRadius } = WORLD_TOPOLOGY;
  const relief = mountainRelief(x, z);
  const lowland = 6 + fbm(x / 320, z / 320, 3, 11) * 12;
  const detail = (fbm(x / 70, z / 70, 2, 23) - 0.5) * (3 + relief * 0.09);
  const land = lowland + relief + detail;

  const r = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const shoreline = coastRadius + Math.sin(angle * 3 + 1) * 22 + Math.sin(angle * 7 + 2) * 12;
  const shoreBlend = smoothstep(islandRadius - 160, shoreline, r);
  const seabed = Math.max(DEEP_WATER, seaLevel - Math.max(0, r - shoreline) * 0.14);
  return land * (1 - shoreBlend) + seabed * shoreBlend;
}

/** Height of the rendered and collidable surface at a horizontal position. */
export function sampleTerrainHeight(x: number, z: number) {
  const heights = getTerrainHeights();
  const gx = clamp((x + TERRAIN_GRID.halfExtent) / CELL, 0, TERRAIN_GRID.segments - 1e-6);
  const gz = clamp((z + TERRAIN_GRID.halfExtent) / CELL, 0, TERRAIN_GRID.segments - 1e-6);
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const h00 = heights[iz * VERTS_PER_SIDE + ix];
  const h10 = heights[iz * VERTS_PER_SIDE + ix + 1];
  const h01 = heights[(iz + 1) * VERTS_PER_SIDE + ix];
  const h11 = heights[(iz + 1) * VERTS_PER_SIDE + ix + 1];
  // Each cell is split along the (ix+1, iz)–(ix, iz+1) diagonal, matching buildTerrainMesh's indices.
  if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
  return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
}

/** Checks every triangle boundary along a shot, so even a whole ridge between endpoints blocks it. */
export function hasTerrainLineOfSight(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
) {
  const cuts = [0, 1];
  // Grid edges and the mesh's x+z diagonals divide the ray into linear surface intervals.
  for (const [start, end] of [[from[0], to[0]], [from[2], to[2]], [from[0] + from[2], to[0] + to[2]]]) {
    if (start === end) continue;
    const low = Math.ceil(Math.min(start, end) / CELL);
    const high = Math.floor(Math.max(start, end) / CELL);
    for (let edge = low; edge <= high; edge++) {
      const t = (edge * CELL - start) / (end - start);
      if (t > 0 && t < 1) cuts.push(t);
    }
  }
  // The surface and shot are linear within each interval: clear endpoints imply a clear interval.
  for (const t of cuts) {
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    if (y <= Math.max(WORLD_TOPOLOGY.seaLevel, sampleTerrainHeight(x, z))) return false;
  }
  return true;
}

/** Rise per unit of horizontal distance (0 = flat, 1 = 45°). */
export function sampleTerrainSlope(x: number, z: number) {
  const step = CELL * 0.5;
  const dx = sampleTerrainHeight(x + step, z) - sampleTerrainHeight(x - step, z);
  const dz = sampleTerrainHeight(x, z + step) - sampleTerrainHeight(x, z - step);
  return Math.hypot(dx, dz) / (step * 2);
}

/** Highest surface point within `radius` of (x, z), sampled at the centre and eight points around it. */
export function maxTerrainHeightNear(x: number, z: number, radius: number) {
  let highest = sampleTerrainHeight(x, z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    highest = Math.max(highest, sampleTerrainHeight(x + Math.cos(a) * radius, z + Math.sin(a) * radius));
  }
  return highest;
}

/** Lowest physical y an airborne object may take at (x, z) while staying `clearance` above the ground. */
export function minimumAirborneY(x: number, z: number, clearance: number) {
  return Math.max(WORLD_TOPOLOGY.seaLevel, maxTerrainHeightNear(x, z, CELL * 3)) + clearance;
}

let cachedHeights: Float32Array | null = null;

export function getTerrainHeights() {
  if (cachedHeights) return cachedHeights;
  const heights = new Float32Array(VERTS_PER_SIDE * VERTS_PER_SIDE);
  for (let iz = 0; iz < VERTS_PER_SIDE; iz++) {
    for (let ix = 0; ix < VERTS_PER_SIDE; ix++) {
      heights[iz * VERTS_PER_SIDE + ix] = terrainElevation(ix * CELL - TERRAIN_GRID.halfExtent, iz * CELL - TERRAIN_GRID.halfExtent);
    }
  }
  cachedHeights = heights;
  return heights;
}

/** Shared vertex/index buffers for the terrain mesh and its trimesh collider. */
export function buildTerrainMesh() {
  const heights = getTerrainHeights();
  const positions = new Float32Array(VERTS_PER_SIDE * VERTS_PER_SIDE * 3);
  for (let iz = 0; iz < VERTS_PER_SIDE; iz++) {
    for (let ix = 0; ix < VERTS_PER_SIDE; ix++) {
      const i = iz * VERTS_PER_SIDE + ix;
      positions[i * 3] = ix * CELL - TERRAIN_GRID.halfExtent;
      positions[i * 3 + 1] = heights[i];
      positions[i * 3 + 2] = iz * CELL - TERRAIN_GRID.halfExtent;
    }
  }

  const indices = new Uint32Array(TERRAIN_GRID.segments * TERRAIN_GRID.segments * 6);
  let k = 0;
  for (let iz = 0; iz < TERRAIN_GRID.segments; iz++) {
    for (let ix = 0; ix < TERRAIN_GRID.segments; ix++) {
      const a = iz * VERTS_PER_SIDE + ix;
      const b = a + 1;
      const c = a + VERTS_PER_SIDE;
      const d = c + 1;
      // Counter-clockwise seen from above (+Y), so normals face up.
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { positions, indices };
}

function mountainRelief(x: number, z: number) {
  const { mountains, ridges } = WORLD_TOPOLOGY;
  // A p-norm union keeps overlapping crests continuous and slightly rounded where ridges meet.
  let sum = 0;
  for (const ridge of ridges) {
    for (let i = 0; i < ridge.length; i++) {
      const a = mountains[ridge[i]];
      const b = mountains[ridge[Math.min(i + 1, ridge.length - 1)]];
      if (i > 0 && i === ridge.length - 1) break;
      const sx = b.x - a.x;
      const sz = b.z - a.z;
      const lengthSq = sx * sx + sz * sz;
      const t = lengthSq > 0 ? clamp(((x - a.x) * sx + (z - a.z) * sz) / lengthSq, 0, 1) : 0;
      const d = Math.hypot(x - (a.x + sx * t), z - (a.z + sz * t));
      const radius = a.radius + (b.radius - a.radius) * t;
      // Crest height dips between control points so connected peaks read as separate summits with saddles.
      const crest = (a.height + (b.height - a.height) * t) * (1 - Math.sin(t * Math.PI) * 0.32);
      const falloff = Math.max(0, 1 - (d / radius) ** 2) ** 2;
      sum += (crest * falloff) ** 4;
    }
  }
  return sum ** 0.25;
}

function fbm(x: number, z: number, octaves: number, seed: number) {
  let total = 0;
  let amplitude = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    total += valueNoise(x, z, seed + o * 31) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    x *= 2.03;
    z *= 2.03;
  }
  return total / norm;
}

function valueNoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Deterministic integer hash mapped to [0, 1). */
export function hash2(x: number, z: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
