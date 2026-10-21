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
import { Home, RotateCcw, Save, Skull, Target, Trophy, Waves, Zap } from "lucide-react";
import type { ReactNode } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/82 p-6 text-white backdrop-blur-xl">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
        }}
      />
      {/* Red corner vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(246,95,95,0.08) 100%)",
        }}
      />
      <div className="relative w-full max-w-4xl border border-white/14 bg-[#080b10]/92 p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center gap-4 border-b border-white/10 pb-6">
          <div
            className="flex h-16 w-16 items-center justify-center bg-[#f65f5f]/16 text-[#f65f5f]"
            style={{ boxShadow: "0 0 30px rgba(246,95,95,0.2)" }}
          >
            <Skull className="h-8 w-8" />
          </div>
          <div>
            <h2
              className="text-4xl font-black uppercase leading-none tracking-normal sm:text-6xl"
              style={{ animation: "title-flicker 5s ease-in-out infinite" }}
            >
              Run ended
            </h2>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/40">
              Aircraft destroyed
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Debrief icon={<Zap />} label="Score" value={score.toString()} />
          <Debrief icon={<Waves />} label="Wave" value={wave.toString()} />
          <Debrief icon={<Target />} label="Kills" value={localKills.toString()} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c95d]">
              <Trophy className="h-4 w-4" />
              Scoreboard local
            </div>
            <p className="mb-5 text-xs font-semibold leading-5 text-white/45">
              Saved only in this browser. Global ranking will come later.
            </p>

            {qualifies ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-white/42" htmlFor="arcade-name">
                  Arcade name
                </label>
                <div className="flex gap-2">
                  <input
                    id="arcade-name"
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    maxLength={12}
                    className="h-12 min-w-0 flex-1 border border-white/14 bg-black/40 px-4 text-lg font-black uppercase tracking-[0.16em] text-white outline-none transition placeholder:text-white/18 focus:border-[#f4c95d]"
                    placeholder="ACE"
                  />
                  <button
                    onClick={handleSaveScore}
                    disabled={!canSave}
                    className="inline-flex h-12 items-center justify-center gap-2 bg-[#f4c95d] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffe08a] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/28"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                  3-12 letters or numbers
                </p>
                {saveError && <p className="text-xs font-bold text-[#f65f5f]">{saveError}</p>}
              </div>
            ) : (
              <p className="text-sm font-bold leading-6 text-white/58">
                {savedScoreId ? "Score saved to the local top 10." : "This run did not enter the local top 10."}
              </p>
            )}
          </section>

          <section>
            <LocalScoreboardTable scores={scores} highlightId={savedScoreId} compact />
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onRestart}
            className="inline-flex h-14 flex-1 items-center justify-center gap-3 bg-[#f4c95d] px-5 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffe08a] active:scale-[0.99]"
          >
            <RotateCcw className="h-5 w-5" />
            Fly again
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex h-14 flex-1 items-center justify-center gap-3 border border-white/18 bg-white/[0.04] px-5 text-sm font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-white/35 hover:bg-white/[0.08]"
            >
              <Home className="h-5 w-5" />
              Start screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Debrief({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#51d6a3]">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="text-4xl font-black leading-none text-white">{value}</div>
    </div>
  );
}
