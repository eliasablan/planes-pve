/** Heading is the aircraft's Y Euler angle: 0 faces -Z, +90 faces -X. */
export function aircraftRelativeOffset(dx: number, dz: number, heading: number) {
  const angle = heading * Math.PI / 180;
  return {
    x: dx * Math.cos(angle) - dz * Math.sin(angle),
    y: dx * Math.sin(angle) + dz * Math.cos(angle),
  };
}

export function projectRadarContact(dx: number, dz: number, heading: number, range = 900) {
  const relative = aircraftRelativeOffset(dx, dz, heading);
  const distance = Math.hypot(dx, dz);
  if (distance === 0) return { x: 0, y: 0, distance: 0, outside: false };
  const scale = 92 / Math.max(range, distance);
  return { x: relative.x * scale, y: relative.y * scale, distance, outside: distance > range };
}
