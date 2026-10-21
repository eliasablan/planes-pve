export const WORLD_TOPOLOGY = {
  mapWorldSize: 4000,
  islandRadius: 1000,
  coastRadius: 1050,
  oceanColor: "#1d6f9f",
  mapOceanColor: "#001d3d",
  sandColor: "#c2b280",
  grassColor: "#2d6a4f",
  mountainColor: "#1b4332",
  coastlineColor: "#40916c",
  mountains: [
    { x: 0, z: 0, radius: 250, height: 80, segments: 8 },
    { x: 300, z: -200, radius: 150, height: 40, segments: 6 },
    { x: -250, z: 300, radius: 120, height: 30, segments: 5 },
  ],
} as const;

export function worldToMapPoint(x: number, z: number, mapSize: number) {
  const scale = mapSize / WORLD_TOPOLOGY.mapWorldSize;
  return {
    x: mapSize / 2 + x * scale,
    y: mapSize / 2 + z * scale,
    scale,
  };
}
