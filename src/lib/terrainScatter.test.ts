import { describe, expect, test } from "bun:test";
import { SCATTER_SIZES, generateScatter } from "./terrainScatter";
import { sampleTerrainHeight, sampleTerrainSlope } from "./terrainHeight";
import { WORLD_TOPOLOGY } from "./worldTopology";

const items = generateScatter();

function groundUnder(x: number, z: number, radius: number) {
  let lowest = sampleTerrainHeight(x, z);
  let highest = lowest;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const h = sampleTerrainHeight(x + Math.cos(a) * radius, z + Math.sin(a) * radius);
    lowest = Math.min(lowest, h);
    highest = Math.max(highest, h);
  }
  return { lowest, highest };
}

describe("terrain scatter", () => {
  test("is deterministic", () => {
    expect(generateScatter()).toEqual(items);
  });

  test("has a controlled mix of kinds and sizes", () => {
    const count = (kind: string) => items.filter((item) => item.kind === kind).length;
    expect(count("tree")).toBeGreaterThan(400);
    expect(count("pine")).toBeGreaterThan(150);
    expect(count("bush")).toBeGreaterThan(150);
    expect(count("rock")).toBeGreaterThan(100);
    for (const item of items) {
      const spec = SCATTER_SIZES[item.kind];
      expect(item.size).toBeGreaterThanOrEqual(spec.min);
      expect(item.size).toBeLessThanOrEqual(spec.max);
    }
  });

  test("every object sits on land above the waterline", () => {
    for (const item of items) {
      const [x, , z] = item.position;
      expect(groundUnder(x, z, item.footprint).lowest).toBeGreaterThan(WORLD_TOPOLOGY.seaLevel + 2);
      expect(Math.hypot(x, z)).toBeLessThan(WORLD_TOPOLOGY.coastRadius + 40);
    }
  });

  test("bases never float above the ground and objects are only slightly sunk", () => {
    for (const item of items) {
      const [x, y, z] = item.position;
      const { lowest, highest } = groundUnder(x, z, item.footprint * 0.95);
      expect(y).toBeLessThanOrEqual(lowest + 0.05);
      // Most of the object stays above the highest ground point under it.
      expect(y + item.size * 0.6).toBeGreaterThan(highest);
    }
  });

  test("vegetation avoids beaches, steep faces and the bare crests", () => {
    for (const item of items) {
      if (item.kind === "rock") continue;
      const [x, , z] = item.position;
      const h = sampleTerrainHeight(x, z);
      expect(h).toBeGreaterThan(3);
      expect(h).toBeLessThanOrEqual(150);
      expect(sampleTerrainSlope(x, z)).toBeLessThanOrEqual(0.75);
    }
  });

  test("trees grow in groups rather than a uniform sprinkle", () => {
    const trees = items.filter((item) => item.kind === "tree" || item.kind === "pine");
    let total = 0;
    for (const tree of trees) {
      let nearest = Infinity;
      for (const other of trees) {
        if (other === tree) continue;
        nearest = Math.min(nearest, Math.hypot(other.position[0] - tree.position[0], other.position[2] - tree.position[2]));
      }
      total += nearest;
    }
    // A uniform scatter of this many trees over the island would average ~0.5 / sqrt(density) ≈ 27 u.
    expect(total / trees.length).toBeLessThan(15);
  });
});
