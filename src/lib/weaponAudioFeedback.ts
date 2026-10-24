type Weapon = "mg" | "missile";
type WeaponSound = { type: "machine-gun" | "missile" | "ammo-depleted" | "weapon-empty" };

/** One empty warning per weapon per trigger hold; replenishment arms it again. */
export function createWeaponAudioFeedback() {
  const warned = new Set<Weapon>();
  return {
    update(firing: boolean, weapon: Weapon, ammo: number, missiles: number): WeaponSound[] {
      if (!firing) warned.clear();
      if (ammo > 0) warned.delete("mg");
      if (missiles > 0) warned.delete("missile");
      const remaining = weapon === "mg" ? ammo : missiles;
      if (!firing || remaining > 0 || warned.has(weapon)) return [];
      warned.add(weapon);
      return [{ type: "weapon-empty" }];
    },
    confirmShot(weapon: Weapon, remaining: number): WeaponSound[] {
      const events: WeaponSound[] = [{ type: weapon === "mg" ? "machine-gun" : "missile" }];
      if (remaining === 0) {
        warned.add(weapon);
        events.push({ type: "ammo-depleted" });
      }
      return events;
    },
  };
}
