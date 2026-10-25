"use client";

import { useGameStore } from "@/store/useGameStore";
import {
  isValidArcadeName,
  normalizeArcadeName,
  qualifiesForScoreboard,
  type ScoreEntry,
} from "@/lib/scoreboard";
import { getCurrentRunSession, getGlobalScores, type RunSnapshot } from "@/lib/scoreService";
import { Home, RotateCcw, Save } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LocalScoreboardTable } from "./LocalScoreboardTable";

const noSession: RunSnapshot = { status: "error", error: "This run was not registered. Please start a new run." };
const emptySubscribe = () => () => {};
const getNoSession = () => noSession;

export function GameOver({
  onRestart,
  onExit,
}: {
  onRestart: () => void;
  onExit?: () => void;
}) {
  const { score, localKills, wave, startTime, endTime } = useGameStore();
  const [session] = useState(getCurrentRunSession);
  const sync = useSyncExternalStore(session?.subscribe ?? emptySubscribe, session?.getSnapshot ?? getNoSession, getNoSession);
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("ACE");
  const [savedScoreId, setSavedScoreId] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [savedInTopTen, setSavedInTopTen] = useState(false);
  const durationMs = Math.max(0, (endTime ?? startTime ?? 0) - (startTime ?? endTime ?? 0));
  const run = { score, wave, kills: localKills, durationMs };
  const qualifies = !savedScoreId && scores !== null && (nameLocked || qualifiesForScoreboard(run, scores));
  const normalizedName = normalizeArcadeName(name);
  const canSave = qualifies && isValidArcadeName(normalizedName) && sync.status === "synced" && !saving;

  useEffect(() => {
    let active = true;
    getGlobalScores().then(scores => { if (active) setScores(scores); }).catch(error => {
      if (active) setScoresError(error instanceof Error ? error.message : "Scores unavailable.");
    });
    return () => { active = false; };
  }, [attempt]);

  const handleNameChange = (value: string) => {
    setName(normalizeArcadeName(value));
    setSaveError(null);
  };

  const handleSaveScore = async () => {
    if (!canSave || !session) return;
    setSaving(true);
    setNameLocked(true);
    try {
      const result = await session.saveName(normalizedName);
      setScores(result.scores);
      setSavedScoreId(result.runId);
      setSavedInTopTen(result.inTopTen);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save score.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-4 text-wf-ink sm:p-6">
      <div className="wf-frame relative my-auto w-full max-w-[1600px] shrink-0 bg-black/90 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <div className="mb-7 border-b border-wf-hair pb-6">
              <h2 className="text-5xl font-light leading-none sm:text-7xl">
                Run ended <span className="text-[0.4em] font-normal text-wf-danger">{"// Aircraft destroyed"}</span>
              </h2>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <Debrief label="SCORE" value={score.toString().padStart(6, "0")} />
              <Debrief label="WAVE_REACHED" value={wave.toString().padStart(2, "0")} />
              <Debrief label="KILLS" value={localKills.toString().padStart(2, "0")} />
            </dl>

            <section className="wf-frame mt-6 p-4">
              <h3 className="text-sm font-medium">GLOBAL_SCOREBOARD</h3>
              <p className="mb-5 mt-1 text-xs leading-5 text-wf-dim">
                Save your arcade name to share this run across devices.
              </p>

              {sync.status === "error" ? <div role="alert" className="mb-4 space-y-2 text-xs text-wf-danger">
                <p>{sync.error}</p>
                {session && <button className="wf-button px-3 py-2" onClick={() => { void session.sync().catch(() => {}); }}>Retry run sync</button>}
              </div> : sync.status !== "synced" ? <p role="status" className="mb-4 text-xs text-wf-dim">Recording run… You can keep playing.</p> : null}

              {qualifies ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-medium text-wf-dim" htmlFor="arcade-name">
                    ARCADE_NAME
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="arcade-name"
                      value={name}
                      disabled={nameLocked}
                      onChange={(event) => handleNameChange(event.target.value)}
                      maxLength={12}
                      className="h-12 min-w-0 flex-1 border border-wf-line bg-black px-4 text-lg uppercase tracking-[0.12em] text-wf-ink outline-none placeholder:text-wf-hair focus:border-wf-ink"
                      placeholder="ACE"
                    />
                    <button
                      onClick={handleSaveScore}
                      disabled={!canSave}
                      className="wf-button inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-medium"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving…" : nameLocked ? "Retry save" : "Save score"}
                    </button>
                  </div>
                  <p className="text-[11px] text-wf-dim">3–12 letters or numbers</p>
                  {saveError && <p role="alert" className="text-xs text-wf-danger">{saveError}</p>}
                </div>
              ) : (
                <p className="text-sm leading-6 text-wf-dim">
                  {savedScoreId ? (savedInTopTen ? "Score saved to the global top 10." : "Score saved. Other runs have moved ahead in the top 10.") :
                    scores === null ? "Waiting for the global ranking…" : "This run did not enter the global top 10."}
                </p>
              )}
            </section>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onRestart}
                className="inline-flex h-14 flex-1 items-center justify-center gap-3 bg-wf-ink px-5 text-base font-semibold text-black transition hover:bg-white"
              >
                <RotateCcw className="h-5 w-5" />
                Fly again
              </button>
              {onExit && (
                <button onClick={onExit} className="wf-button inline-flex h-14 flex-1 items-center justify-center gap-3 px-5 text-base font-medium">
                  <Home className="h-5 w-5" />
                  Start screen
                </button>
              )}
            </div>
          </div>
          <section className="min-w-0" aria-label="Global top 10">
            <h3 className="mb-4 text-sm font-medium">GLOBAL_TOP_10</h3>
            {scoresError ? <div role="alert" className="space-y-3 text-sm text-wf-dim">
              <p>{scoresError}</p>
              <button className="wf-button px-4 py-2" onClick={() => { setScoresError(null); setAttempt(value => value + 1); }}>Retry ranking</button>
            </div> : scores === null ? <p role="status" className="text-sm text-wf-dim">Loading global scores…</p> :
              <LocalScoreboardTable scores={scores} highlightId={savedScoreId} compact />}
          </section>
        </div>
      </div>
    </div>
  );
}

function Debrief({ label, value }: { label: string; value: string }) {
  return (
    <div className="wf-frame p-4">
      <dt className="text-[11px] font-medium text-wf-dim">{label}</dt>
      <dd className="mt-1 text-4xl font-light leading-none">{value}</dd>
    </div>
  );
}
