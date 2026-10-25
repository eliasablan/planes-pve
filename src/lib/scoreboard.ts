export const SCOREBOARD_LIMIT = 10;
export const ARCADE_NAME_MIN_LENGTH = 3;
export const ARCADE_NAME_MAX_LENGTH = 12;

export type RunResult = {
  score: number;
  wave: number;
  kills: number;
  durationMs: number;
};

export type ScoreEntry = RunResult & {
  id: string;
  name: string;
  createdAt: string;
};

export function normalizeArcadeName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ARCADE_NAME_MAX_LENGTH);
}

export function isValidArcadeName(name: string) {
  return /^[A-Z0-9]+$/.test(name) && name.length >= ARCADE_NAME_MIN_LENGTH && name.length <= ARCADE_NAME_MAX_LENGTH;
}

export function compareScoreEntries(a: ScoreEntry, b: ScoreEntry) {
  return b.score - a.score || b.wave - a.wave || b.kills - a.kills ||
    a.durationMs - b.durationMs || Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export function qualifiesForScoreboard(run: RunResult, scores: ScoreEntry[]) {
  if (run.score <= 0 || !Number.isFinite(run.score)) return false;
  if (scores.length < SCOREBOARD_LIMIT) return true;
  // Existing entries win a complete tie: their names were saved first.
  return compareScoreEntries({ ...run, id: "candidate", name: "AAA", createdAt: new Date().toISOString() }, scores[scores.length - 1]) < 0;
}
