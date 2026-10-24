import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as audio from "./gameAudio";
import { applyLocalDamage, eliminateLocalPlayer } from "./combatResolution";
import { useGameStore } from "../store/useGameStore";

describe("audio follows committed gameplay events", () => {
  let play: ReturnType<typeof spyOn<typeof audio, "playGameSound">>;
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setGameStatus("playing");
    play = spyOn(audio, "playGameSound").mockImplementation(() => {});
  });
  afterEach(() => play.mockRestore());

  test("each enemy hit uses fresh health; fatal event precedes run finish and occurs once", () => {
    const statuses: string[] = [];
    play.mockImplementation(() => { statuses.push(useGameStore.getState().gameStatus); });
    useGameStore.getState().setHp(12);
    applyLocalDamage(5, "enemy");
    applyLocalDamage(5, "enemy");
    applyLocalDamage(5, "enemy");
    applyLocalDamage(5, "enemy");
    expect(play.mock.calls.map(([event]: Parameters<typeof audio.playGameSound>) => event.type)).toEqual(["enemy-hit", "enemy-hit", "enemy-fatal"]);
    expect(statuses).toEqual(["playing", "playing", "playing"]);
    expect(useGameStore.getState().hp).toBe(0);
    expect(useGameStore.getState().gameStatus).toBe("finished");
  });

  test("environmental damage, zero damage and collision do not impersonate enemy hits", () => {
    applyLocalDamage(20);
    applyLocalDamage(0, "enemy");
    eliminateLocalPlayer();
    expect(play).not.toHaveBeenCalled();
  });

  test("pickup feedback follows actual gains and ignores duplicate collection", () => {
    const state = useGameStore.getState();
    state.setAmmo(179);
    state.setMissiles(4);
    state.setHp(99);
    state.spawnPvePickups([
      { id: "ammo", kind: "ammo", position: [0, 0, 0] },
      { id: "missile", kind: "missile", position: [0, 0, 0] },
      { id: "repair", kind: "repair", position: [0, 0, 0] },
      { id: "full", kind: "repair", position: [0, 0, 0] },
    ]);
    for (const id of ["ammo", "missile", "repair", "full", "full"]) state.collectPvePickup(id);
    expect(play.mock.calls.map(([event]: Parameters<typeof audio.playGameSound>) => event.type)).toEqual(["pickup-ammo", "pickup-missile", "pickup-repair", "pickup-full"]);
    expect(useGameStore.getState().pvePickupReceipts.map(({ amount }) => amount)).toEqual([1, 1, 1, 0]);
  });
});
