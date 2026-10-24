"use client";

import { Maximize, Minimize, Pause, Settings2, X } from "lucide-react";
import { pauseLocalMatch } from "@/lib/matchLifecycle";
import { useEffect, useId, useState } from "react";
import { GameAudioControls } from "./GameAudioControls";

export type DisplaySettings = { hudScale: number; quality: "native" | "sharp" | "performance" };
const DEFAULT_SETTINGS: DisplaySettings = { hudScale: 100, quality: "native" };
const STORAGE_KEY = "planes-pve:display:v1";

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Number.isFinite(saved.hudScale) && ["native", "sharp", "performance"].includes(saved.quality)) {
        return { hudScale: Math.max(80, Math.min(150, saved.hudScale)), quality: saved.quality };
      }
    } catch { /* Local preferences are optional. */ }
    return { ...DEFAULT_SETTINGS, hudScale: window.innerWidth >= 3000 && window.innerHeight >= 1600 ? 150 : window.innerWidth >= 1900 && window.innerHeight >= 1200 ? 125 : 100 };
  });
  const [deviceRatio, setDeviceRatio] = useState(() => typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  useEffect(() => {
    const resize = () => setDeviceRatio(window.devicePixelRatio || 1);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const update = (next: DisplaySettings) => {
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep playing without storage. */ }
  };
  const dpr = settings.quality === "performance" ? Math.min(deviceRatio, 1)
    : Math.min(2, deviceRatio * (settings.quality === "sharp" ? 1.25 : 1));
  return { settings, update, dpr };
}

export function GameDisplayControls({ settings, onChange }: {
  settings: DisplaySettings;
  onChange: (settings: DisplaySettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));
  const [error, setError] = useState("");
  const panelId = useId();
  const closePanel = () => {
    setOpen(false);
    document.querySelector<HTMLElement>("[data-game-shell]")?.focus({ preventScroll: true });
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setError("");
      document.querySelector<HTMLElement>("[data-game-shell]")?.focus({ preventScroll: true });
    } catch { setError("Use your browser's fullscreen command."); setOpen(true); }
  };
  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.code !== "KeyF" || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.matches("input,select,textarea,[contenteditable]"))) return;
      event.preventDefault();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else void document.documentElement.requestFullscreen().catch(() => {});
    };
    document.addEventListener("fullscreenchange", changed);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", changed); window.removeEventListener("keydown", key); };
  }, []);
  return (
    <div data-display-controls className="pointer-events-auto relative flex items-stretch gap-1.5" onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); closePanel(); }
      else if (event.target instanceof HTMLElement && (event.target.matches("input,select,textarea") || event.key === " ")) event.stopPropagation();
    }} onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onMouseMove={event => event.stopPropagation()}>
      <button aria-label="Pause" title="Pause [P]" onClick={pauseLocalMatch} className="wf-frame flex w-10 items-center justify-center text-wf-ink hover:border-wf-ink">
        <Pause className="h-4 w-4" />
      </button>
      <button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen [F]" onClick={toggleFullscreen} className="wf-frame flex w-10 items-center justify-center text-wf-ink hover:border-wf-ink">
        {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>
      <button aria-label="Display settings" aria-expanded={open} aria-controls={panelId} title="Display settings" onClick={() => open ? closePanel() : setOpen(true)} className="wf-frame flex w-10 items-center justify-center text-wf-ink hover:border-wf-ink"><Settings2 className="h-4 w-4" /></button>
      {open && (
        <div id={panelId} role="region" aria-label="Display settings" className="wf-frame absolute bottom-full right-0 mb-2 w-64 bg-black/95 p-4 text-xs text-wf-ink">
          <div className="mb-4 flex items-center justify-between font-bold"><span>DISPLAY_SETTINGS</span><button aria-label="Close display settings" onClick={closePanel} className="p-1 hover:bg-wf-ink hover:text-black"><X className="h-4 w-4" /></button></div>
          <label className="block">HUD size <span className="float-right tabular-nums">{settings.hudScale}%</span>
            <input aria-label="HUD size" type="range" min={80} max={150} step={5} value={settings.hudScale} onChange={event => onChange({...settings, hudScale: Number(event.target.value)})} className="mt-3 block w-full accent-wf-ink" />
          </label>
          <label className="mt-4 block">Render quality
            <select aria-label="Render quality" value={settings.quality} onChange={event => onChange({...settings, quality: event.target.value as DisplaySettings["quality"]})} className="mt-2 w-full border border-wf-line bg-black p-2 text-wf-ink">
              <option value="native">Native resolution</option><option value="sharp">Sharp · 125%</option><option value="performance">Performance</option>
            </select>
          </label>
          <div className="mt-4 border-t border-wf-hair pt-4"><GameAudioControls /></div>
          <p className="mt-3 leading-5 text-wf-dim">Full screen: F · Pause: P<br />Adjust HUD size to your monitor.</p>
          {error && <p role="status" className="mt-2 text-wf-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
