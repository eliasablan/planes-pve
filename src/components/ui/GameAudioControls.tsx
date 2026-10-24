"use client";

import { useSyncExternalStore } from "react";
import { getAudioPreferences, getServerAudioPreferences, setAudioPreferences, subscribeAudioPreferences, unlockGameAudio } from "@/lib/gameAudio";

export function GameAudioControls() {
  const { volume, muted } = useSyncExternalStore(subscribeAudioPreferences, getAudioPreferences, getServerAudioPreferences);

  return (
    <fieldset className="min-w-0 text-xs font-medium text-white" aria-label="Sound effects">
      <legend className="sr-only">Sound effects</legend>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-bold">Sound effects</span>
        <button
          type="button"
          aria-label="Mute sound effects"
          aria-pressed={muted}
          onClick={() => { unlockGameAudio(); setAudioPreferences({ muted: !muted }); }}
          className="border border-white/30 px-3 py-1.5 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#f4c95d]"
        >
          {muted ? "Muted" : "Sound on"}
        </button>
      </div>
      <label className="block">
        Effects volume <span className="float-right tabular-nums">{Math.round(volume * 100)}%</span>
        <input
          aria-label="Effects volume"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          onChange={event => { unlockGameAudio(); setAudioPreferences({ volume: Number(event.target.value) / 100 }); }}
          className="mt-3 block w-full accent-[#f4c95d] focus-visible:outline-2 focus-visible:outline-[#f4c95d]"
        />
      </label>
    </fieldset>
  );
}
