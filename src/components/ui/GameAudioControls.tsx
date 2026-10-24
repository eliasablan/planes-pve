"use client";

import { useSyncExternalStore } from "react";
import { getAudioPreferences, getServerAudioPreferences, setAudioPreferences, subscribeAudioPreferences, unlockGameAudio } from "@/lib/gameAudio";

export function GameAudioControls() {
  const { volume, muted } = useSyncExternalStore(subscribeAudioPreferences, getAudioPreferences, getServerAudioPreferences);

  return (
    <fieldset className="min-w-0 text-xs text-wf-ink" aria-label="Sound effects">
      <legend className="sr-only">Sound effects</legend>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-medium">SOUND_EFFECTS</span>
        <button
          type="button"
          aria-label="Mute sound effects"
          aria-pressed={muted}
          onClick={() => { unlockGameAudio(); setAudioPreferences({ muted: !muted }); }}
          className="wf-button px-3 py-1.5"
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
          className="mt-3 block w-full accent-wf-ink"
        />
      </label>
    </fieldset>
  );
}
