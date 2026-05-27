import { beforeEach, describe, expect, test } from "bun:test";
import {
  LOCAL_SCOREBOARD_KEY,
  LOCAL_SCOREBOARD_LIMIT,
  loadLocalScores,
  normalizeArcadeName,
  qualifiesForLocalScoreboard,
  saveLocalScore,
} from "./localScoreboard";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe("localScoreboard", () => {
  test("normalizes arcade names to uppercase alphanumeric names capped at 12 characters", () => {
    expect(normalizeArcadeName(" ace-42!!!long ")).toBe("ACE42LONG");
    expect(normalizeArcadeName("abcdefghijklmnop")).toBe("ABCDEFGHIJKL");
  });

  test("keeps the top 10 scores ordered by score, wave, kills, and shortest duration", () => {
    for (let index = 0; index < 12; index++) {
      saveLocalScore(
        {
          name: `P${index.toString().padStart(2, "0")}`,
          score: 100 + index,
          wave: 1,
          kills: index,
          durationMs: 20000,
        },
        storage,
      );
    }

    const scores = loadLocalScores(storage);
    expect(scores).toHaveLength(LOCAL_SCOREBOARD_LIMIT);
    expect(scores[0]?.score).toBe(111);
    expect(scores.at(-1)?.score).toBe(102);
  });

  test("uses tie breakers when scores match", () => {
    saveLocalScore({ name: "LOW", score: 500, wave: 2, kills: 8, durationMs: 20000 }, storage);
    saveLocalScore({ name: "WAV", score: 500, wave: 3, kills: 1, durationMs: 20000 }, storage);
    saveLocalScore({ name: "KIL", score: 500, wave: 2, kills: 9, durationMs: 20000 }, storage);
    saveLocalScore({ name: "FST", score: 500, wave: 2, kills: 9, durationMs: 10000 }, storage);

    const scores = loadLocalScores(storage);
    expect(scores.map((score) => score.name)).toEqual(["WAV", "FST", "KIL", "LOW"]);
  });

  test("qualifies only positive runs that can enter the local top 10", () => {
    expect(qualifiesForLocalScoreboard({ score: 0, wave: 1, kills: 0, durationMs: 1000 }, [])).toBe(false);
    expect(qualifiesForLocalScoreboard({ score: 1, wave: 1, kills: 0, durationMs: 1000 }, [])).toBe(true);

    for (let index = 0; index < 10; index++) {
      saveLocalScore({ name: `P${index.toString().padStart(2, "0")}`, score: 1000 + index, wave: 1, kills: 0, durationMs: 1000 }, storage);
    }

    const scores = loadLocalScores(storage);
    expect(qualifiesForLocalScoreboard({ score: 999, wave: 9, kills: 9, durationMs: 1000 }, scores)).toBe(false);
    expect(qualifiesForLocalScoreboard({ score: 1010, wave: 1, kills: 0, durationMs: 1000 }, scores)).toBe(true);
  });

  test("recovers from corrupt localStorage data", () => {
    storage.setItem(LOCAL_SCOREBOARD_KEY, "{bad json");

    expect(loadLocalScores(storage)).toEqual([]);
    expect(storage.getItem(LOCAL_SCOREBOARD_KEY)).toBeNull();
  });
});
