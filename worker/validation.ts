import type { RunResult } from "../src/lib/scoreboard";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new ApiError(415, "Use application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) {
        await reader.cancel();
        throw new ApiError(413, "Request body is too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Invalid JSON body.");
  } finally {
    reader.releaseLock();
  }
}

export function onlyKeys(body: Record<string, unknown>, keys: string[]) {
  if (Object.keys(body).some(key => !keys.includes(key))) throw new ApiError(400, "Unexpected request fields.");
}

export function validateResult(body: Record<string, unknown>, elapsedMs: number): RunResult & { status: "completed" | "abandoned" } {
  onlyKeys(body, ["score", "wave", "kills", "durationMs", "status"]);
  const bounds = { score: [0, 100_000_000], wave: [1, 10_000], kills: [0, 80_000], durationMs: [0, 604_800_000] };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const value = body[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new ApiError(400, `Invalid ${key}.`);
    }
  }
  if (body.status !== "completed" && body.status !== "abandoned") throw new ApiError(400, "Invalid run status.");
  const result = body as RunResult & { status: "completed" | "abandoned" };
  if (result.durationMs > elapsedMs + 15_000) throw new ApiError(400, "Run duration exceeds server elapsed time.");
  let previousKills = 0;
  for (let wave = 1; wave < result.wave; wave++) previousKills += 3 + Math.min(5, Math.floor((wave - 1) / 2));
  const currentEnemies = 3 + Math.min(5, Math.floor((result.wave - 1) / 2));
  const previousBonus = 180 * (result.wave - 1) + 25 * result.wave * (result.wave - 1) / 2;
  const maxBonus = previousBonus + (result.kills === previousKills + currentEnemies ? 180 + 25 * result.wave : 0);
  if (result.kills < previousKills || result.kills > previousKills + currentEnemies ||
    result.score < result.kills * 100 + previousBonus || result.score > result.kills * 260 + maxBonus ||
    result.durationMs < Math.max(0, result.wave - 2) * 2400 || result.kills > 12 + result.durationMs / 100) {
    throw new ApiError(400, "Run metrics are inconsistent with survival rules.");
  }
  return result;
}

export async function hashToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, "Invalid run credential.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
