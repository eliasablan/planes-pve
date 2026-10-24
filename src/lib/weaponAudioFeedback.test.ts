import { describe, expect, test } from "bun:test";
import { createWeaponAudioFeedback } from "./weaponAudioFeedback";

describe("weapon audio feedback", () => {
  test("confirmed shots sound regardless of a target and the final round adds depletion", () => {
    const feedback = createWeaponAudioFeedback();
    expect(feedback.confirmShot("mg", 1)).toEqual([{ type: "machine-gun" }]);
    expect(feedback.confirmShot("mg", 0)).toEqual([{ type: "machine-gun" }, { type: "ammo-depleted" }]);
    expect(feedback.update(true, "mg", 0, 0)).toEqual([]);
    expect(feedback.confirmShot("missile", 0)).toEqual([{ type: "missile" }, { type: "ammo-depleted" }]);
  });

  test("held empty weapons warn once per weapon, including switching back", () => {
    const feedback = createWeaponAudioFeedback();
    expect(feedback.update(true, "mg", 0, 0)).toEqual([{ type: "weapon-empty" }]);
    for (let frame = 0; frame < 1000; frame++) expect(feedback.update(true, "mg", 0, 0)).toEqual([]);
    expect(feedback.update(true, "missile", 0, 0)).toEqual([{ type: "weapon-empty" }]);
    expect(feedback.update(true, "mg", 0, 0)).toEqual([]);
    expect(feedback.update(false, "mg", 0, 0)).toEqual([]);
    expect(feedback.update(true, "mg", 0, 0)).toEqual([{ type: "weapon-empty" }]);
  });

  test("resupply re-arms feedback without forcing release or altering resources", () => {
    const feedback = createWeaponAudioFeedback();
    feedback.update(true, "mg", 0, 0);
    expect(feedback.update(true, "mg", 1, 0)).toEqual([]);
    expect(feedback.confirmShot("mg", 0)).toEqual([{ type: "machine-gun" }, { type: "ammo-depleted" }]);
    expect(feedback.update(true, "mg", 0, 0)).toEqual([]);
  });
});
