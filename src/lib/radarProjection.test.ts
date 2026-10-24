import { describe, expect, test } from "bun:test";
import { aircraftRelativeOffset, projectRadarContact } from "./radarProjection";

describe("nose-up radar", () => {
  test("contacts ahead stay above and contacts behind stay below at all headings", () => {
    for (const heading of [0, 45, 90, 180, 270, -90, -450]) {
      const a = heading * Math.PI / 180;
      const front = aircraftRelativeOffset(-Math.sin(a) * 400, -Math.cos(a) * 400, heading);
      const tail = aircraftRelativeOffset(Math.sin(a) * 400, Math.cos(a) * 400, heading);
      expect(front.x).toBeCloseTo(0);
      expect(front.y).toBeCloseTo(-400);
      expect(tail.y).toBeCloseTo(400);
      const right = aircraftRelativeOffset(Math.cos(a) * 400, -Math.sin(a) * 400, heading);
      expect(right.x).toBeCloseTo(400);
      expect(right.y).toBeCloseTo(0);
    }
  });
  test("rotation preserves range and out-of-range contacts stay on the circular rim", () => {
    expect(projectRadarContact(300, -400, 90).distance).toBe(500);
    const far = projectRadarContact(900, 1200, -35);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(92);
    expect(far.outside).toBe(true);
    expect(projectRadarContact(0, 0, 270)).toEqual({x: 0, y: 0, distance: 0, outside: false});
  });
});
