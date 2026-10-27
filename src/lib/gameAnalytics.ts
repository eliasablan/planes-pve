// Shared response contract. No credentials or raw IP addresses enter the dashboard.
export type AnalyticsStatus = "active" | "completed" | "abandoned";
export type AnalyticsFilters = {
  from: string;
  to: string;
  country: string;
  status: string;
  version: string;
  q: string;
};
export type AnalyticsSummary = {
  runs: number; completed: number; abandoned: number; unfinished: number;
  devices: number; networks: number; names: number; trackedRuns: number; networkRuns: number;
  countries: number; durationMs: number; avgDurationMs: number | null;
  avgScore: number | null; bestScore: number | null; avgWave: number | null; bestWave: number | null;
};
export type AnalyticsCountry = {
  country: string | null; runs: number; devices: number; completed: number; unfinished: number;
};
export type AnalyticsBucket = { period: string; runs: number; completed: number; abandoned: number; unfinished: number };
export type AnalyticsIdentity = { identity: string; runs: number; completed: number; lastPlayed: string; bestScore: number | null };
export type AnalyticsRun = {
  id: string; startedAt: string; finishedAt: string | null; country: string | null;
  status: AnalyticsStatus; name: string | null; browserId: string | null; networkId: string | null;
  gameVersion: string; score: number | null; wave: number | null; kills: number | null; durationMs: number | null;
};
export type GameAnalytics = {
  generatedAt: string;
  summary: AnalyticsSummary;
  countries: AnalyticsCountry[];
  activity: AnalyticsBucket[];
  interval: "day" | "month";
  identities: { devices: AnalyticsIdentity[]; networks: AnalyticsIdentity[]; names: AnalyticsIdentity[] };
  runs: AnalyticsRun[];
  page: number;
  pageSize: number;
  options: { countries: (string | null)[]; versions: string[] };
};

export function countryName(code: string | null) {
  if (!code || code === "unknown") return "Sin ubicación";
  return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
}

export function analyticsDuration(ms: number | null) {
  if (ms === null) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
