export const LOCAL_SCOREBOARD_KEY = "planes-pve:scoreboard:v1";
export const LOCAL_SCOREBOARD_LIMIT = 10;
export const ARCADE_NAME_MIN_LENGTH = 3;
export const ARCADE_NAME_MAX_LENGTH = 12;

export type LocalScoreEntry = {
  id: string;
  name: string;
  score: number;
  wave: number;
  kills: number;
  durationMs: number;
  createdAt: string;
};

export type LocalScoreRun = {
  score: number;
  wave: number;
  kills: number;
  durationMs: number;
};

type ScoreboardStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadLocalScores(storage: ScoreboardStorage | null = getBrowserStorage()): LocalScoreEntry[] {
  if (!storage) return [];

  const rawScores = storage.getItem(LOCAL_SCOREBOARD_KEY);
  const scores = parseLocalScores(rawScores);
  if (rawScores && scores.length === 0) {
    try {
      JSON.parse(rawScores);
    } catch {
      storage.removeItem(LOCAL_SCOREBOARD_KEY);
    }
  }
  return scores;
}

export function getLocalScoreSnapshot(storage: ScoreboardStorage | null = getBrowserStorage()) {
  return storage?.getItem(LOCAL_SCOREBOARD_KEY) ?? "[]";
}

export function parseLocalScores(rawScores: string | null): LocalScoreEntry[] {
  if (!rawScores) return [];

  try {
    const parsed = JSON.parse(rawScores);
    if (!Array.isArray(parsed)) return [];
    return normalizeScores(parsed);
  } catch {
    return [];
  }
}

export function qualifiesForLocalScoreboard(
  run: LocalScoreRun,
  scores: LocalScoreEntry[] = loadLocalScores(),
) {
  if (!isFinitePositiveNumber(run.score)) return false;
  if (scores.length < LOCAL_SCOREBOARD_LIMIT) return true;

  const candidate = toComparableEntry(run);
  const lowest = sortLocalScores(scores).at(-1);
  return lowest ? compareScoreEntries(candidate, lowest) < 0 : true;
}

export function saveLocalScore(
  entry: LocalScoreRun & { name: string },
  storage: ScoreboardStorage | null = getBrowserStorage(),
): LocalScoreEntry[] {
  if (!storage) return [];

  const normalizedName = normalizeArcadeName(entry.name);
  if (!isValidArcadeName(normalizedName)) {
    throw new Error("Arcade name must be 3-12 alphanumeric characters.");
  }

  const nextEntry: LocalScoreEntry = {
    id: createScoreId(),
    name: normalizedName,
    score: Math.max(0, Math.floor(entry.score)),
    wave: Math.max(1, Math.floor(entry.wave)),
    kills: Math.max(0, Math.floor(entry.kills)),
    durationMs: Math.max(0, Math.floor(entry.durationMs)),
    createdAt: new Date().toISOString(),
  };

  const scores = sortLocalScores([...loadLocalScores(storage), nextEntry]).slice(0, LOCAL_SCOREBOARD_LIMIT);
  storage.setItem(LOCAL_SCOREBOARD_KEY, JSON.stringify(scores));
  notifyLocalScoreboardChanged();
  return scores;
}

export function normalizeArcadeName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ARCADE_NAME_MAX_LENGTH);
}

export function isValidArcadeName(name: string) {
  return /^[A-Z0-9]+$/.test(name) && name.length >= ARCADE_NAME_MIN_LENGTH && name.length <= ARCADE_NAME_MAX_LENGTH;
}

export function sortLocalScores(scores: LocalScoreEntry[]) {
  return [...scores].sort(compareScoreEntries).slice(0, LOCAL_SCOREBOARD_LIMIT);
}

function normalizeScores(scores: unknown[]) {
  return sortLocalScores(scores.filter(isLocalScoreEntry));
}

function compareScoreEntries(a: LocalScoreEntry, b: LocalScoreEntry) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.wave !== a.wave) return b.wave - a.wave;
  if (b.kills !== a.kills) return b.kills - a.kills;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

function toComparableEntry(run: LocalScoreRun): LocalScoreEntry {
  return {
    id: "candidate",
    name: "AAA",
    score: Math.max(0, Math.floor(run.score)),
    wave: Math.max(1, Math.floor(run.wave)),
    kills: Math.max(0, Math.floor(run.kills)),
    durationMs: Math.max(0, Math.floor(run.durationMs)),
    createdAt: new Date(0).toISOString(),
  };
}

function isLocalScoreEntry(entry: unknown): entry is LocalScoreEntry {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<LocalScoreEntry>;
  return (
    typeof candidate.id === "string" &&
    isValidArcadeName(candidate.name ?? "") &&
    isFinitePositiveNumber(candidate.score) &&
    isFiniteNonNegativeNumber(candidate.wave) &&
    isFiniteNonNegativeNumber(candidate.kills) &&
    isFiniteNonNegativeNumber(candidate.durationMs) &&
    typeof candidate.createdAt === "string" &&
    Number.isFinite(Date.parse(candidate.createdAt))
  );
}

function isFinitePositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function createScoreId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getBrowserStorage(): ScoreboardStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function notifyLocalScoreboardChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("local-scoreboard:update"));
}
