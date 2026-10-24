"use client";

import { Maximize, Minimize, Settings2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

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
      <button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen [F]" onClick={toggleFullscreen} className="flex w-10 items-center justify-center border border-white/20 bg-[#05070a]/85 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-[#f4c95d]">
        {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>
      <button aria-label="Display settings" aria-expanded={open} aria-controls={panelId} title="Display settings" onClick={() => open ? closePanel() : setOpen(true)} className="flex w-10 items-center justify-center border border-white/20 bg-[#05070a]/85 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-[#f4c95d]"><Settings2 className="h-4 w-4" /></button>
      {open && (
        <div id={panelId} role="region" aria-label="Display settings" className="absolute bottom-full right-0 mb-2 w-64 border border-white/25 bg-[#05070a]/95 p-4 text-xs text-white shadow-xl">
          <div className="mb-4 flex items-center justify-between font-bold"><span>Display</span><button aria-label="Close display settings" onClick={closePanel} className="p-1 hover:bg-white/15 focus-visible:outline-2"><X className="h-4 w-4" /></button></div>
          <label className="block">HUD size <span className="float-right tabular-nums">{settings.hudScale}%</span>
            <input aria-label="HUD size" type="range" min={80} max={150} step={5} value={settings.hudScale} onChange={event => onChange({...settings, hudScale: Number(event.target.value)})} className="mt-3 block w-full accent-[#f4c95d]" />
          </label>
          <label className="mt-4 block">Render quality
            <select aria-label="Render quality" value={settings.quality} onChange={event => onChange({...settings, quality: event.target.value as DisplaySettings["quality"]})} className="mt-2 w-full border border-white/30 bg-[#14242f] p-2 text-white focus-visible:outline-2 focus-visible:outline-[#f4c95d]">
              <option value="native">Native resolution</option><option value="sharp">Sharp · 125%</option><option value="performance">Performance</option>
            </select>
          </label>
          <p className="mt-3 leading-5 text-white/60">Full screen: F · Exit: Esc<br />Adjust HUD size to your monitor.</p>
          {error && <p role="status" className="mt-2 text-[#f4c95d]">{error}</p>}
        </div>
      )}
    </div>
  );
}
