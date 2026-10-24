"use client";

import { useGameStore } from "@/store/useGameStore";
import {
  isValidArcadeName,
  loadLocalScores,
  normalizeArcadeName,
  qualifiesForLocalScoreboard,
  saveLocalScore,
  type LocalScoreEntry,
} from "@/lib/localScoreboard";
import { Home, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { LocalScoreboardTable } from "./LocalScoreboardTable";

export function GameOver({
  onRestart,
  onExit,
}: {
  onRestart: () => void;
  onExit?: () => void;
}) {
  const { score, localKills, wave, startTime, endTime } = useGameStore();
  const [scores, setScores] = useState<LocalScoreEntry[]>(() => loadLocalScores());
  const [name, setName] = useState("ACE");
  const [savedScoreId, setSavedScoreId] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const durationMs = Math.max(0, (endTime ?? startTime ?? 0) - (startTime ?? endTime ?? 0));
  const run = { score, wave, kills: localKills, durationMs };
  const qualifies = !savedScoreId && qualifiesForLocalScoreboard(run, scores);
  const normalizedName = normalizeArcadeName(name);
  const canSave = qualifies && isValidArcadeName(normalizedName);

  const handleNameChange = (value: string) => {
    setName(normalizeArcadeName(value));
    setSaveError(null);
  };

  const handleSaveScore = () => {
    try {
      const nextScores = saveLocalScore({ ...run, name });
      setScores(nextScores);
      setSavedScoreId(nextScores.find((entry) => entry.name === normalizedName && entry.score === score)?.id);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save score.");
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
              <h3 className="text-sm font-medium">LOCAL_SCOREBOARD</h3>
              <p className="mb-5 mt-1 text-xs leading-5 text-wf-dim">
                Saved only in this browser. Global ranking will come later.
              </p>

              {qualifies ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-medium text-wf-dim" htmlFor="arcade-name">
                    ARCADE_NAME
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="arcade-name"
                      value={name}
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
                      Save score
                    </button>
                  </div>
                  <p className="text-[11px] text-wf-dim">3–12 letters or numbers</p>
                  {saveError && <p className="text-xs text-wf-danger">{saveError}</p>}
                </div>
              ) : (
                <p className="text-sm leading-6 text-wf-dim">
                  {savedScoreId ? "Score saved to the local top 10." : "This run did not enter the local top 10."}
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
          <section className="min-w-0" aria-label="Local top 10">
            <h3 className="mb-4 text-sm font-medium">LOCAL_TOP_10</h3>
            <LocalScoreboardTable scores={scores} highlightId={savedScoreId} compact />
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
