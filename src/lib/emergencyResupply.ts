export function tickEmergencyResupply(
  now: number,
  shortageSince: number | null,
  needsAmmo: boolean,
) {
  if (!needsAmmo) return { shortageSince: null, shouldSpawn: false };

  const since = shortageSince ?? now;
  return { shortageSince: since, shouldSpawn: now - since >= 5000 };
}
