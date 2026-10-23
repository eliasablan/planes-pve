import { describe, expect, test } from "bun:test";
import { tickEmergencyResupply } from "./emergencyResupply";

describe("emergency resupply", () => {
  test("requires five continuous seconds stranded before requesting an ammo crate", () => {
    const start = tickEmergencyResupply(10000, null, true);
    expect(start.shouldSpawn).toBe(false);
    expect(tickEmergencyResupply(14999, start.shortageSince, true).shouldSpawn).toBe(false);
    expect(tickEmergencyResupply(15000, start.shortageSince, true).shouldSpawn).toBe(true);
  });

  test("recovering ammo or having an available crate cancels the wait", () => {
    const cancelled = tickEmergencyResupply(14000, 10000, false);
    expect(cancelled).toEqual({ shortageSince: null, shouldSpawn: false });
    const nextShortage = tickEmergencyResupply(20000, cancelled.shortageSince, true);
    expect(nextShortage.shouldSpawn).toBe(false);
    expect(tickEmergencyResupply(24999, nextShortage.shortageSince, true).shouldSpawn).toBe(false);
    expect(tickEmergencyResupply(25000, nextShortage.shortageSince, true).shouldSpawn).toBe(true);
  });

  test("an available crate prevents repeated emergency requests", () => {
    expect(tickEmergencyResupply(15000, 10000, true).shouldSpawn).toBe(true);
    for (let now = 16000; now <= 30000; now += 1000) {
      expect(tickEmergencyResupply(now, null, false).shouldSpawn).toBe(false);
    }
  });
});
