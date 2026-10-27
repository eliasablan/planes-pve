import type { D1Database } from "@cloudflare/workers-types";
import type { AnalyticsBucket, AnalyticsCountry, AnalyticsIdentity, AnalyticsRun, AnalyticsSummary, GameAnalytics } from "../src/lib/gameAnalytics";
import { ApiError } from "./validation";

const PAGE_SIZE = 25;
const dayMs = 86_400_000;

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function analyticsFilter(params: URLSearchParams) {
  const allowed = ["from", "to", "country", "status", "version", "q", "page"];
  if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length > 1)) throw new ApiError(400, "Filtros desconocidos.");
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const country = params.get("country") ?? "";
  const status = params.get("status") ?? "";
  const version = params.get("version") ?? "";
  const q = (params.get("q") ?? "").trim();
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) ||
    (country && country !== "unknown" && !/^[A-Z]{2}$/.test(country)) ||
    (status && !["active", "completed", "abandoned"].includes(status)) ||
    (version && !/^[a-zA-Z0-9-]{1,40}$/.test(version)) || q.length > 64 ||
    !/^[1-9]\d{0,5}$/.test(rawPage)) throw new ApiError(400, "Revisa las fechas y los filtros.");
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (from) { clauses.push("started_at >= ?"); values.push(`${from}T00:00:00.000Z`); }
  if (to) { clauses.push("started_at < ?"); values.push(new Date(Date.parse(to) + dayMs).toISOString()); }
  if (country === "unknown") clauses.push("country IS NULL");
  else if (country) { clauses.push("country = ?"); values.push(country); }
  if (status) { clauses.push("status = ?"); values.push(status); }
  if (version) { clauses.push("game_version = ?"); values.push(version); }
  if (q) {
    clauses.push("(name = ? COLLATE NOCASE OR browser_id LIKE ? ESCAPE '\\' OR network_id LIKE ? ESCAPE '\\')");
    const escaped = q.replace(/[\\%_]/g, "\\$&");
    values.push(q, `${escaped}%`, `${escaped}%`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values, page, from, to };
}

export async function getAnalytics(db: D1Database, params: URLSearchParams): Promise<GameAnalytics> {
  const { where, values, page, from, to } = analyticsFilter(params);
  const interval = from && (Date.parse(to || new Date().toISOString().slice(0, 10)) - Date.parse(from)) / dayMs <= 90 ? "day" : "month";
  const periodFormat = interval === "day" ? "%Y-%m-%d" : "%Y-%m";
  const statement = (sql: string, extra: (string | number)[] = []) => db.prepare(sql).bind(...values, ...extra);
  const identities = (column: "browser_id" | "network_id" | "name") => statement(`SELECT ${column} AS identity, COUNT(*) AS runs,
    SUM(status = 'completed') AS completed, MAX(started_at) AS lastPlayed, MAX(score) AS bestScore
    FROM runs ${where} ${where ? "AND" : "WHERE"} ${column} IS NOT NULL GROUP BY ${column}
    ORDER BY runs DESC, lastPlayed DESC, identity ASC LIMIT 12`);
  // One D1 batch gives all panels the same database snapshot. Only the history table is paginated.
  const batch = await db.batch([
    statement(`SELECT COUNT(*) AS runs, COALESCE(SUM(status = 'completed'), 0) AS completed,
      COALESCE(SUM(status = 'abandoned'), 0) AS abandoned, COALESCE(SUM(status = 'active'), 0) AS unfinished,
      COUNT(DISTINCT browser_id) AS devices, COUNT(DISTINCT network_id) AS networks, COUNT(DISTINCT name) AS names,
      COUNT(browser_id) AS trackedRuns, COUNT(network_id) AS networkRuns, COUNT(DISTINCT country) AS countries,
      COALESCE(SUM(duration_ms), 0) AS durationMs, AVG(duration_ms) AS avgDurationMs, AVG(score) AS avgScore,
      MAX(score) AS bestScore, AVG(wave) AS avgWave, MAX(wave) AS bestWave FROM runs ${where}`),
    statement(`SELECT country, COUNT(*) AS runs, COUNT(DISTINCT browser_id) AS devices,
      SUM(status = 'completed') AS completed, SUM(status = 'active') AS unfinished
      FROM runs ${where} GROUP BY country ORDER BY runs DESC, country ASC`),
    statement(`SELECT strftime('${periodFormat}', started_at) AS period, COUNT(*) AS runs,
      SUM(status = 'completed') AS completed, SUM(status = 'abandoned') AS abandoned,
      SUM(status = 'active') AS unfinished FROM runs ${where} GROUP BY period ORDER BY period ASC`),
    identities("browser_id"), identities("network_id"), identities("name"),
    statement(`SELECT id, started_at AS startedAt, finished_at AS finishedAt, country, status, name,
      browser_id AS browserId, network_id AS networkId, game_version AS gameVersion, score, wave, kills,
      duration_ms AS durationMs FROM runs ${where} ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?`, [PAGE_SIZE, (page - 1) * PAGE_SIZE]),
    db.prepare("SELECT DISTINCT country FROM runs ORDER BY country"),
    db.prepare("SELECT DISTINCT game_version AS version FROM runs ORDER BY game_version"),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    summary: batch[0].results[0] as AnalyticsSummary,
    countries: batch[1].results as AnalyticsCountry[],
    activity: batch[2].results as AnalyticsBucket[],
    interval,
    identities: { devices: batch[3].results as AnalyticsIdentity[], networks: batch[4].results as AnalyticsIdentity[], names: batch[5].results as AnalyticsIdentity[] },
    runs: batch[6].results as AnalyticsRun[],
    page, pageSize: PAGE_SIZE,
    options: {
      countries: (batch[7].results as { country: string | null }[]).map(row => row.country),
      versions: (batch[8].results as { version: string }[]).map(row => row.version),
    },
  };
}
