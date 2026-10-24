"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { resetLocalMatch } from "@/lib/matchLifecycle";
import { unlockGameAudio } from "@/lib/gameAudio";
import { IslandBackdrop } from "@/components/ui/IslandBackdrop";
import { SiteNav } from "@/components/ui/SiteNav";

const Scene = dynamic(() => import("@/components/game/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-black text-sm text-wf-dim">
      LOADING_FLIGHT_DECK
    </div>
  ),
});

const CONTROLS: { keys: string[]; label: string }[] = [
  { keys: ["Mouse"], label: "Steer" },
  { keys: ["W", "S"], label: "Throttle" },
  { keys: ["A", "D"], label: "Roll" },
  { keys: ["↑", "↓", "←", "→"], label: "Pitch / yaw" },
  { keys: ["Click", "Space"], label: "Fire" },
  { keys: ["1", "2"], label: "Gun / missile" },
  { keys: ["Shift"], label: "Air brake" },
  { keys: ["O"], label: "Mouse steering" },
  { keys: ["M"], label: "Radar size" },
];

export default function Home() {
  const [inRun, setInRun] = useState(false);

  const startRun = () => {
    resetLocalMatch();
    unlockGameAudio();
    setInRun(true);
  };

  if (inRun) {
    return <Scene onExit={() => setInRun(false)} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-wf-ink">
      <IslandBackdrop className="absolute inset-0 h-full w-full" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col justify-between gap-4 p-4 sm:p-6">
        <SiteNav />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <section className="wf-frame max-w-xl p-6">
            <h1 className="text-5xl font-light leading-none sm:text-7xl">
              Skybound <span className="text-[0.4em] font-normal text-wf-dim">{"// Survival"}</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-7 text-wf-dim">
              Hold the sky over the island against endless enemy waves. Grab supplies between waves. The run ends when the airframe does.
            </p>
            <button onClick={startRun} className="wf-button mt-7 px-10 py-3 text-lg font-semibold">
              Take off
            </button>
          </section>

          <aside className="wf-frame p-5">
            <h2 className="text-center text-lg font-medium">FLIGHT_CONTROLS</h2>
            <ul className="mt-4 divide-y divide-wf-hair">
              {CONTROLS.map((control) => (
                <li key={control.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-wf-dim">{control.label}</span>
                  <span className="flex gap-1">
                    {control.keys.map((key) => (
                      <kbd key={key} className="border border-wf-line px-1.5 text-xs">{key}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
