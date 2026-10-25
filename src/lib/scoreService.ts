import type { RunResult, ScoreEntry } from "./scoreboard";

export class ScoreServiceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function scoreRequest<T>(path: string, body?: unknown, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    throw new ScoreServiceError(503, "Could not reach the score service. Check your connection and retry.");
  }
  let data;
  try { data = await response.json(); } catch {
    throw new ScoreServiceError(503, "The score service is unavailable. Please retry.");
  }
  if (!response.ok) throw new ScoreServiceError(response.status, data.error ?? "Could not save this run. Please retry.");
  return data as T;
}

export const getGlobalScores = () => scoreRequest<{ scores: ScoreEntry[] }>("/api/leaderboard").then(data => data.scores);
export type RunRegistration = { runId: string; startedAt: string };
export type SaveScoreResponse = { runId: string; scores: ScoreEntry[]; inTopTen: boolean };
type RunStatus = "starting" | "ready" | "syncing" | "synced" | "error";
export type RunSnapshot = { status: RunStatus; error: string | null; runId?: string };

export class RunSession {
  private token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  private registration: RunRegistration | null = null;
  private startPromise: Promise<void>;
  private result?: RunResult & { status: "completed" | "abandoned" };
  private completion?: Promise<void>;
  private listeners = new Set<() => void>();
  private snapshot: RunSnapshot = { status: "starting", error: null };

  constructor() {
    this.startPromise = this.register().catch(error => { this.update("error", error); });
  }

  readonly getSnapshot = () => this.snapshot;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(status: RunStatus, error?: unknown) {
    this.snapshot = { status, error: error instanceof Error ? error.message : null, runId: this.registration?.runId };
    for (const listener of this.listeners) listener();
  }

  private async register() {
    for (let attempt = 0; ; attempt++) {
      try {
        this.registration = await scoreRequest<RunRegistration>("/api/runs", { requestId: this.token });
        this.update("ready");
        return;
      } catch (error) {
        if (attempt >= 2 || (error instanceof ScoreServiceError && error.status < 500)) throw error;
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }

  finish(result: RunResult, status: "completed" | "abandoned" = "completed") {
    this.result ??= { ...result, status };
    return this.sync();
  }

  sync(): Promise<void> {
    if (this.snapshot.status === "synced") return Promise.resolve();
    if (this.completion) return this.completion;
    if (!this.result) return Promise.reject(new Error("The run has not ended yet."));
    this.completion = this.persist().catch(error => {
      this.update("error", error);
      throw error;
    }).finally(() => { this.completion = undefined; });
    return this.completion;
  }

  private async persist() {
    await this.startPromise;
    this.update("syncing");
    // A lost registration response can be recovered; a run is never created retroactively at game over.
    this.registration ??= await scoreRequest<RunRegistration>("/api/runs", { requestId: this.token, recoverOnly: true });
    await scoreRequest(`/api/runs/${this.registration.runId}/finish`, this.result, this.token);
    this.update("synced");
  }

  async saveName(name: string) {
    await this.sync();
    return scoreRequest<SaveScoreResponse>(`/api/runs/${this.registration!.runId}/name`, { name }, this.token);
  }
}

let currentSession: RunSession | null = null;
export const getCurrentRunSession = () => currentSession;
export function startRunTracking() {
  currentSession = new RunSession();
}
export function clearRunTracking() { currentSession = null; }
