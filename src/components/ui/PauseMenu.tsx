"use client";

import { useEffect, useRef } from "react";
import { Home, Play } from "lucide-react";
import { FLIGHT_CONTROLS } from "@/lib/flightControls";
import { resumeLocalMatch } from "@/lib/matchLifecycle";
import { PICKUP_PRESENTATION } from "@/lib/pickupPresentation";
import { ROLE_STATS } from "@/lib/pveRules";
import { useGameStore, type EnemyRole, type PickupKind } from "@/store/useGameStore";
import { PickupIcon } from "./PickupIcon";

// Mirrors the rules documented in /docs; the flight is frozen while this is open.
const GUN_DAMAGE = 12;
const MISSILE_DAMAGE = 80;
const ROLE_POINTS: Record<EnemyRole, number> = { scout: 100, fighter: 160, bomber: 260 };
const SUPPLIES: { kind: PickupKind; restores: string; when: string }[] = [
  { kind: "ammo", restores: "+60 rounds", when: "Every wave" },
  { kind: "repair", restores: "+50 health", when: "Every even wave" },
  { kind: "missile", restores: "+1 missile", when: "Every fifth wave" },
];

export function PauseMenu({ onExit }: { onExit?: () => void }) {
  const { score, wave, enemiesRemaining } = useGameStore();
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus({ preventScroll: true });
  }, []);

  const resume = () => {
    resumeLocalMatch();
    document.querySelector<HTMLElement>("[data-game-shell]")?.focus({ preventScroll: true });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      // Keep clicks here from reaching the flight controls' window listeners (fire, steer).
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 text-wf-ink sm:p-6"
    >
      <div className="wf-frame my-auto w-full max-w-6xl bg-black/90 p-5 sm:p-7">
        <header className="flex flex-col gap-5 border-b border-wf-hair pb-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="pause-title" className="text-5xl font-light leading-none sm:text-6xl">
            Paused <span className="text-[0.4em] font-normal text-wf-dim">{`// Wave ${wave.toString().padStart(2, "0")}`}</span>
          </h2>
          <dl className="flex gap-6 text-sm">
            <Readout label="SCORE" value={score.toString().padStart(6, "0")} />
            <Readout label="ENEMIES_LEFT" value={enemiesRemaining.toString().padStart(2, "0")} />
          </dl>
        </header>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid content-start gap-4">
            <section className="wf-frame p-4">
              <h3 className="text-sm font-medium">OBJECTIVE</h3>
              <p className="mt-2 max-w-[68ch] text-sm leading-6 text-wf-dim">
                Destroy every aircraft in the wave to bring the next one; waves never stop, so the goal is to last.
                Each kill and each cleared wave adds to your score. The run ends when health reaches zero. Ground,
                sea and the airspace boundary all damage the airframe.
              </p>
            </section>

            <section className="wf-frame overflow-x-auto p-4">
              <h3 className="text-sm font-medium">ENEMY_CLASSES</h3>
              <table className="mt-2 w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-wf-line text-[11px] text-wf-dim">
                  <tr>
                    {["CLASS", "HP", "DMG_HIT", "BURST", "GUN_HITS", "MISSILES", "POINTS"].map((header, index) => (
                      <th key={header} scope="col" className={`py-2 font-medium ${index > 0 ? "text-right" : ""}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-wf-hair tabular-nums">
                  {(Object.keys(ROLE_STATS) as EnemyRole[]).map((role) => {
                    const stats = ROLE_STATS[role];
                    return (
                      <tr key={role} className="[&>td]:py-2 [&>td:not(:first-child)]:text-right">
                        <td>
                          <span className="inline-flex items-center gap-2">
                            <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
                              <path d="M0 -5L5 4H-5Z" fill="none" stroke={stats.color} strokeWidth="1.5" />
                            </svg>
                            {role.toUpperCase()}
                          </span>
                        </td>
                        <td>{stats.hp}</td>
                        <td>{stats.damage}</td>
                        <td>{stats.burst}</td>
                        <td>{Math.ceil(stats.hp / GUN_DAMAGE)}</td>
                        <td>{Math.ceil(stats.hp / MISSILE_DAMAGE)}</td>
                        <td>{ROLE_POINTS[role]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="wf-frame p-4">
              <h3 className="text-sm font-medium">SUPPLIES</h3>
              <p className="mt-1 text-xs text-wf-dim">Drop ahead of you after a wave clears. Fly through a box to collect it.</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {SUPPLIES.map((supply) => {
                  const presentation = PICKUP_PRESENTATION[supply.kind];
                  return (
                    <li key={supply.kind} className="flex items-start gap-3 border-l pl-3" style={{ borderColor: presentation.color }}>
                      <PickupIcon kind={supply.kind} className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="text-sm">
                        <div>{presentation.label.toUpperCase()} <span className="text-wf-dim">{supply.restores}</span></div>
                        <div className="text-xs text-wf-dim">{supply.when}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="wf-frame self-start p-4">
            <h3 className="text-sm font-medium">FLIGHT_CONTROLS</h3>
            <ul className="mt-2 divide-y divide-wf-hair">
              {FLIGHT_CONTROLS.map((control) => (
                <li key={control.label} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-wf-dim">{control.label}</span>
                  <span className="flex gap-1">
                    {control.keys.map((key) => <kbd key={key} className="border border-wf-line px-1.5 text-xs">{key}</kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-wf-hair pt-5 sm:flex-row">
          <button
            ref={resumeRef}
            onClick={resume}
            className="inline-flex h-12 flex-1 items-center justify-center gap-3 bg-wf-ink px-5 text-base font-semibold text-black transition hover:bg-white"
          >
            <Play className="h-4 w-4" />
            Resume flight
          </button>
          {onExit && (
            <button onClick={onExit} className="wf-button inline-flex h-12 flex-1 items-center justify-center gap-3 px-5 text-base font-medium">
              <Home className="h-4 w-4" />
              Abandon run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-wf-dim">{label}</dt>
      <dd className="text-2xl font-light tabular-nums">{value}</dd>
    </div>
  );
}
