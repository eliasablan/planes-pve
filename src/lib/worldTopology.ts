// Scale reference: the GLB player biplane spans 2.6 units (≈7 m at the HUD's speed scale, 1 u ≈ 2.8 m).
// Trees, rocks and relief are sized against that span; see docs/plans/2026-10-24-relieve-continuidad.md.
export const WORLD_TOPOLOGY = {
  // Mean radius where grass gives way to the beach, and mean shoreline radius (terrain meets the sea).
  islandRadius: 1000,
  coastRadius: 1050,
  // Ocean surface height. Telemetry altitude is measured from here (physical y + 5).
  seaLevel: -5,
  oceanColor: "#1d6f9f",
  sandColor: "#c2b280",
  grassColor: "#2d6a4f",
  // Relief control points: each is the crest of a massif with its footprint radius and crest height.
  // `ridges` joins them into connected crests; the height query in terrainHeight.ts reads both.
  mountains: [
    { x: 330, z: -600, radius: 200, height: 115 },
    { x: 520, z: -260, radius: 280, height: 160 },
    { x: 560, z: 60, radius: 220, height: 110 },
    { x: 470, z: 330, radius: 240, height: 150 },
    { x: -560, z: -380, radius: 260, height: 160 },
    { x: -600, z: 0, radius: 260, height: 135 },
    { x: -420, z: 330, radius: 200, height: 90 },
    { x: 80, z: 640, radius: 200, height: 68 },
    { x: -160, z: 560, radius: 160, height: 52 },
    { x: -160, z: -700, radius: 170, height: 58 },
  ],
  ridges: [
    [0, 1, 2, 3],
    [4, 5, 6],
    [7, 8],
    [9],
  ],
  // Fixed combat airspace limits (warning, then damage), unchanged by the relief work.
  combatBoundary: { warningRadius: 3800, damageRadius: 4600 },
} as const;
