import { describe, expect, test } from "bun:test";
import {
  TERRAIN_GRID,
  buildTerrainMesh,
  getTerrainHeights,
  hasTerrainLineOfSight,
  maxTerrainHeightNear,
  minimumAirborneY,
  sampleTerrainHeight,
  sampleTerrainSlope,
  terrainElevation,
} from "./terrainHeight";
import { WORLD_TOPOLOGY } from "./worldTopology";

const CELL = (TERRAIN_GRID.halfExtent * 2) / TERRAIN_GRID.segments;
const SPAWN = { x: 0, y: 250, z: 0 };

describe("terrain heightfield", () => {
  test("line of sight checks the whole path, in both directions, and blocks the sea", () => {
    expect(hasTerrainLineOfSight([200, 100, -260], [850, 100, -260])).toBe(false);
    expect(hasTerrainLineOfSight([850, 100, -260], [200, 100, -260])).toBe(false);
    expect(hasTerrainLineOfSight([200, 260, -260], [850, 260, -260])).toBe(true);
    expect(hasTerrainLineOfSight([1500, 20, 1500], [1500, -10, 1500])).toBe(false);
    expect(hasTerrainLineOfSight([1500, 20, 1500], [1500, 10, 1500])).toBe(true);
  });

  test("diagonal shots detect a mesh vertex that clears both endpoints within one cell", () => {
    // Pick a convex vertex on a ridge. A long fixed-step sample could skip this narrow obstruction.
    const x = 525;
    const z = -262.5;
    const y = sampleTerrainHeight(x, z) - 0.001;
    expect(sampleTerrainHeight(x - 0.5, z - 0.5)).toBeLessThan(y);
    expect(sampleTerrainHeight(x + 0.5, z + 0.5)).toBeLessThan(y);
    expect(hasTerrainLineOfSight([x - 0.5, y, z - 0.5], [x + 0.5, y, z + 0.5])).toBe(false);
  });

  test("is deterministic and matches the analytic shape at every grid vertex", () => {
    const heights = getTerrainHeights();
    for (let i = 0; i < heights.length; i += 97) {
      const ix = i % (TERRAIN_GRID.segments + 1);
      const iz = Math.floor(i / (TERRAIN_GRID.segments + 1));
      const x = ix * CELL - TERRAIN_GRID.halfExtent;
      const z = iz * CELL - TERRAIN_GRID.halfExtent;
      expect(heights[i]).toBeCloseTo(terrainElevation(x, z), 3);
      expect(sampleTerrainHeight(x, z)).toBeCloseTo(heights[i], 3);
    }
  });

  test("sampling follows the mesh triangles, so placement and the trimesh collider agree inside cells", () => {
    const { positions, indices } = buildTerrainMesh();
    const vertex = (i: number) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    for (let t = 0; t < indices.length / 3; t += 7919) {
      const [a, b, c] = [vertex(indices[t * 3]), vertex(indices[t * 3 + 1]), vertex(indices[t * 3 + 2])];
      // Centroid of the triangle lies on its plane.
      const x = (a[0] + b[0] + c[0]) / 3;
      const z = (a[2] + b[2] + c[2]) / 3;
      expect(sampleTerrainHeight(x, z)).toBeCloseTo((a[1] + b[1] + c[1]) / 3, 3);
    }
  });

  test("mesh triangles face up", () => {
    const { positions, indices } = buildTerrainMesh();
    for (let t = 0; t < indices.length / 3; t += 5003) {
      const [a, b, c] = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
      const ux = positions[b * 3] - positions[a * 3];
      const uz = positions[b * 3 + 2] - positions[a * 3 + 2];
      const vx = positions[c * 3] - positions[a * 3];
      const vz = positions[c * 3 + 2] - positions[a * 3 + 2];
      expect(uz * vx - ux * vz).toBeGreaterThan(0);
    }
  });

  test("land meets the sea at the shoreline and falls below it offshore", () => {
    const { seaLevel, coastRadius, islandRadius } = WORLD_TOPOLOGY;
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      const at = (r: number) => sampleTerrainHeight(Math.cos(a) * r, Math.sin(a) * r);
      expect(at(islandRadius - 250)).toBeGreaterThan(seaLevel + 3);
      expect(at(coastRadius + 60)).toBeLessThan(seaLevel);
      expect(at(TERRAIN_GRID.halfExtent - 1)).toBeLessThan(seaLevel - 10);
      // Gentle beach: no cliff where the land meets the water.
      expect(Math.abs(at(coastRadius) - at(coastRadius - 40))).toBeLessThan(12);
    }
  });

  test("relief is continuous, with connected crests, saddles and bounded slopes", () => {
    let highest = -Infinity;
    let steepest = 0;
    for (let x = -1000; x <= 1000; x += 10) {
      for (let z = -1000; z <= 1000; z += 10) {
        highest = Math.max(highest, sampleTerrainHeight(x, z));
        steepest = Math.max(steepest, sampleTerrainSlope(x, z));
      }
    }
    expect(highest).toBeGreaterThan(150);
    expect(highest).toBeLessThan(230);
    expect(steepest).toBeLessThan(2);

    // Walking each ridge between its control points never drops to the lowlands.
    for (const ridge of WORLD_TOPOLOGY.ridges) {
      for (let i = 0; i < ridge.length - 1; i++) {
        const a = WORLD_TOPOLOGY.mountains[ridge[i]];
        const b = WORLD_TOPOLOGY.mountains[ridge[i + 1]];
        let lowest = Infinity;
        for (let t = 0; t <= 1; t += 0.05) lowest = Math.min(lowest, sampleTerrainHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
        expect(lowest).toBeGreaterThan(Math.min(a.height, b.height) * 0.5);
      }
    }
  });

  test("the central valley floor stays wider than the aircraft's turn diameter from z −800 to 500", () => {
    // Measured unbanked yaw turn: about 90 u radius at cruise speed.
    for (let z = -800; z <= 500; z += 25) {
      let floorWidth = 0;
      for (let x = -400; x <= 400; x += 10) if (sampleTerrainHeight(x, z) < 45) floorWidth += 10;
      expect(floorWidth).toBeGreaterThan(250);
    }
  });

  test("the spawn point and its initial heading (-Z) have ample clearance", () => {
    for (let z = SPAWN.z; z >= -TERRAIN_GRID.halfExtent; z -= 10) {
      expect(maxTerrainHeightNear(SPAWN.x, z, 40)).toBeLessThan(SPAWN.y - 150);
    }
  });

  test("airborne clamp keeps objects above every surface point around them", () => {
    for (let i = 0; i < 400; i++) {
      const x = Math.sin(i * 12.9898) * 1100;
      const z = Math.cos(i * 78.233) * 1100;
      const floor = minimumAirborneY(x, z, 30);
      expect(floor).toBeGreaterThanOrEqual(Math.max(WORLD_TOPOLOGY.seaLevel, sampleTerrainHeight(x, z)) + 30);
      expect(floor).toBeGreaterThanOrEqual(maxTerrainHeightNear(x, z, CELL * 3) + 30 - 1e-9);
    }
  });

  test("combat boundary lies beyond the island", () => {
    const { warningRadius, damageRadius } = WORLD_TOPOLOGY.combatBoundary;
    expect(warningRadius).toBeGreaterThan(WORLD_TOPOLOGY.coastRadius);
    expect(damageRadius).toBeGreaterThan(warningRadius);
  });
});
