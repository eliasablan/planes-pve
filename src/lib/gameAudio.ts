/** Procedural, event-driven game audio. Browser APIs are touched only on demand. */
export type GameSoundEvent = {
  type: 'machine-gun' | 'missile' | 'ammo-depleted' | 'weapon-empty'
    | 'enemy-hit' | 'enemy-fatal' | 'pickup-ammo' | 'pickup-missile'
    | 'pickup-repair' | 'pickup-full';
};
export type AudioPreferences = { volume: number; muted: boolean };
const STORAGE_KEY = 'planes-pve:audio:v1';
const DEFAULTS: AudioPreferences = Object.freeze({ volume: 0.65, muted: false });
let preferences = DEFAULTS;
let preferencesLoaded = false;
const listeners = new Set<() => void>();
let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;
type Sound = GameSoundEvent['type'];
type Voice = { type: Sound; priority: number; nodes: AudioNode[]; sources: AudioScheduledSourceNode[]; gain: GainNode | null };
const voices: Voice[] = [];
const lastPlayed = new Map<Sound, number>();
const policies: Record<Sound, { priority: number; limit: number; interval: number }> = {
  'machine-gun': { priority: 0, limit: 3, interval: 0.035 },
  missile: { priority: 1, limit: 2, interval: 0.1 },
  'enemy-hit': { priority: 1, limit: 4, interval: 0 },
  'enemy-fatal': { priority: 5, limit: 3, interval: 0 },
  'ammo-depleted': { priority: 4, limit: 2, interval: 0 },
  'weapon-empty': { priority: 2, limit: 1, interval: 0.35 },
  'pickup-ammo': { priority: 2, limit: 2, interval: 0 },
  'pickup-missile': { priority: 2, limit: 2, interval: 0 },
  'pickup-repair': { priority: 2, limit: 2, interval: 0 },
  'pickup-full': { priority: 2, limit: 2, interval: 0 },
};
function normalize(value: Partial<AudioPreferences>): AudioPreferences {
  return {
    volume: typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? Math.max(0, Math.min(1, value.volume)) : preferences.volume,
    muted: typeof value.muted === 'boolean' ? value.muted : preferences.muted,
  };
}
export function getServerAudioPreferences(): AudioPreferences { return DEFAULTS; }
export function getAudioPreferences(): AudioPreferences {
  if (!preferencesLoaded && typeof window !== 'undefined') {
    preferencesLoaded = true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (stored && typeof stored === 'object') preferences = normalize(stored);
    } catch { /* Storage is optional, including in privacy modes. */ }
  }
  return preferences;
}
function applyVolume() {
  if (!master || !context) return;
  try {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(preferences.muted ? 0 : preferences.volume * 0.65, context.currentTime, 0.015);
  } catch { /* A device can disappear at any time. */ }
}
export function setAudioPreferences(value: Partial<AudioPreferences>): void {
  getAudioPreferences();
  const next = normalize(value);
  if (next.volume === preferences.volume && next.muted === preferences.muted) return;
  preferences = next;
  applyVolume();
  if (next.muted || next.volume === 0) voices.slice().forEach(disposeVoice);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Optional persistence. */ }
  listeners.forEach(listener => listener());
}
export function subscribeAudioPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function disposeVoice(voice: Voice) {
  const index = voices.indexOf(voice);
  if (index >= 0) voices.splice(index, 1);
  for (const source of voice.sources) {
    source.onended = null;
    try { source.stop(); } catch { /* Already ended. */ }
  }
  for (const node of voice.nodes) {
    try { node.disconnect(); } catch { /* Already disconnected. */ }
  }
}
/** Call directly from the start/replay/settings gesture, before awaiting anything. */
export function unlockGameAudio(): void {
  if (typeof window === 'undefined') return;
  getAudioPreferences();
  try {
    if (!context || context.state === 'closed') {
      voices.slice().forEach(disposeVoice);
      const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      master = null;
      noise = null;
      context = new Constructor();
      master = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 12;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.12;
      master.connect(limiter);
      limiter.connect(context.destination);
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 1.5), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      applyVolume();
    }
    // Never retain events while autoplay is blocked, and never reject into gameplay.
    if (context.state !== 'running') void context.resume().catch(() => {});
  } catch {
    // A partially initialized graph must not prevent the next gesture from retrying.
    if (context) {
      try { void context.close().catch(() => {}); } catch { /* Device already gone. */ }
    }
    context = null;
    master = null;
    noise = null;
  }
}
export function beginGameAudio(): void {
  stopGameAudio();
  enabled = true;
}
export function stopGameAudio(): void {
  enabled = false;
  voices.slice().forEach(disposeVoice);
  lastPlayed.clear();
}
export function finishGameAudio(): void {
  enabled = false;
  voices.filter(voice => voice.type !== 'enemy-fatal').forEach(disposeVoice);
}

export function playGameSound(event: GameSoundEvent): void {
  const ctx = context;
  const output = master;
  const prefs = getAudioPreferences();
  if (!enabled || !ctx || !output || !noise || ctx.state !== 'running' || prefs.muted || prefs.volume === 0) return;
  const policy = policies[event.type];
  if (!policy) return;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(event.type) ?? -Infinity) < policy.interval) return;
  const same = voices.filter(voice => voice.type === event.type);
  if (same.length >= policy.limit) disposeVoice(same[0]);
  if (voices.length >= 12) {
    const victim = voices.reduce((lowest, voice) => voice.priority < lowest.priority ? voice : lowest);
    if (victim.priority > policy.priority) return;
    disposeVoice(victim);
  }
  const voice: Voice = { type: event.type, priority: policy.priority, nodes: [], sources: [], gain: null };
  voices.push(voice);
  let remaining = 0;
  function layer(frequency: number, endFrequency: number, duration: number, level: number, delay = 0, wave: OscillatorType | 'noise' = 'sine') {
    const start = now + delay;
    const source = wave === 'noise' ? ctx!.createBufferSource() : ctx!.createOscillator();
    voice.sources.push(source);
    voice.nodes.push(source);
    const envelope = ctx!.createGain();
    voice.nodes.push(envelope);
    if ('buffer' in source) {
      source.buffer = noise;
      const filter = ctx!.createBiquadFilter();
      voice.nodes.push(filter);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(frequency, start);
      filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      source.connect(filter);
      filter.connect(envelope);
    } else {
      source.type = wave as OscillatorType;
      source.frequency.setValueAtTime(frequency, start);
      source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      source.connect(envelope);
    }
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(level, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    envelope.connect(voice.gain!);
    remaining++;
    source.onended = () => { if (--remaining === 0) disposeVoice(voice); };
    source.start(start);
    source.stop(start + duration + 0.015);
  }
  try {
    // Lower weapon tails without cancelling the confirmed shot, including the last round.
    if (policy.priority >= 2) {
      for (const active of voices) {
        if (active.priority === 0) active.gain?.gain.setTargetAtTime(0.35, now, 0.008);
      }
    }
    voice.gain = ctx.createGain();
    voice.nodes.push(voice.gain);
    voice.gain.connect(output);
    switch (event.type) {
      case 'machine-gun':
        layer(4200, 500, 0.095, 0.23, 0, 'noise');
        layer(145, 55, 0.08, 0.25, 0, 'triangle');
        break;
      case 'missile':
        layer(650, 3300, 0.48, 0.33, 0, 'noise');
        layer(180, 42, 0.3, 0.32);
        break;
      case 'enemy-hit':
        layer(2200, 400, 0.12, 0.17, 0, 'noise');
        layer(690, 240, 0.095, 0.18, 0, 'triangle');
        break;
      case 'enemy-fatal':
        layer(4400, 100, 0.9, 0.46, 0, 'noise');
        layer(110, 28, 0.75, 0.48);
        layer(1800, 80, 0.65, 0.19, 0.07, 'noise');
        break;
      case 'ammo-depleted':
        [0, 0.16, 0.32].forEach(delay => layer(660, 440, 0.12, 0.23, delay, 'square'));
        break;
      case 'weapon-empty':
        layer(1100, 450, 0.035, 0.14, 0, 'noise');
        layer(190, 130, 0.075, 0.14, 0, 'triangle');
        break;
      case 'pickup-ammo':
        [660, 880, 1100].forEach((pitch, i) => layer(pitch, pitch, 0.17, 0.23, i * 0.065, 'triangle'));
        break;
      case 'pickup-missile':
        [330, 660, 990].forEach((pitch, i) => layer(pitch, pitch * 1.03, 0.25, 0.24, i * 0.09, 'triangle'));
        break;
      case 'pickup-repair':
        [523, 659, 784, 1046].forEach((pitch, i) => layer(pitch, pitch, 0.4, 0.18, i * 0.07));
        break;
      case 'pickup-full':
        layer(440, 440, 0.12, 0.16, 0, 'triangle');
        layer(330, 330, 0.18, 0.1, 0.1, 'triangle');
        break;
    }
    lastPlayed.set(event.type, now);
  } catch {
    disposeVoice(voice);
  }
}
