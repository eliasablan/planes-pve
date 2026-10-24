import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { beginGameAudio, finishGameAudio, getAudioPreferences, getServerAudioPreferences, playGameSound, setAudioPreferences, stopGameAudio, subscribeAudioPreferences, unlockGameAudio } from './gameAudio';

class Parameter {
  value = 0;
  cancelScheduledValues() {}
  setTargetAtTime(value: number) { this.value = value; }
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Node {
  disconnected = false;
  connect() {}
  disconnect() { this.disconnected = true; }
}
class Source extends Node {
  onended: (() => void) | null = null;
  frequency = new Parameter();
  type = 'sine';
  started = false;
  stopped = false;
  start() { this.started = true; }
  stop(time?: number) { if (time === undefined) this.stopped = true; }
}
class FakeContext {
  static instances: FakeContext[] = [];
  static blocked = false;
  static failBuffer = false;
  state = FakeContext.blocked ? 'suspended' : 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new Node();
  sources: Source[] = [];
  gains: Array<Node & { gain: Parameter }> = [];
  buffers = 0;
  resumeCalls = 0;
  failSource = false;
  constructor() { FakeContext.instances.push(this); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  resume() { this.resumeCalls++; return Promise.reject(new Error('Autoplay denied')); }
  createGain() { const node = Object.assign(new Node(), { gain: new Parameter() }); this.gains.push(node); return node; }
  createDynamicsCompressor() { return Object.assign(new Node(), { threshold: new Parameter(), knee: new Parameter(), ratio: new Parameter(), attack: new Parameter(), release: new Parameter() }); }
  createBuffer(_channels: number, size: number) { if (FakeContext.failBuffer) throw new Error('No buffer'); this.buffers++; return { getChannelData: () => new Float32Array(size) }; }
  createOscillator() { if (this.failSource) throw new Error('Device lost'); const source = new Source(); this.sources.push(source); return source; }
  createBufferSource() { return Object.assign(this.createOscillator(), { buffer: null }); }
  createBiquadFilter() { return Object.assign(new Node(), { frequency: new Parameter(), type: 'lowpass' }); }
}
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const stored = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  AudioContext: FakeContext,
  localStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
} });
let ctx: FakeContext;
beforeEach(() => {
  stopGameAudio();
  for (const instance of FakeContext.instances) instance.state = 'closed';
  FakeContext.blocked = false;
  setAudioPreferences({ volume: 0.65, muted: false });
  unlockGameAudio();
  ctx = FakeContext.instances.at(-1)!;
  beginGameAudio();
});
afterAll(() => {
  stopGameAudio();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
const activeSources = () => ctx.sources.filter(source => !source.disconnected);

describe('procedural game audio', () => {
  test('reuses the context and noise buffer between sessions', () => {
    const count = FakeContext.instances.length;
    playGameSound({ type: 'missile' });
    stopGameAudio();
    unlockGameAudio();
    beginGameAudio();
    expect(FakeContext.instances.length).toBe(count);
    expect(ctx.buffers).toBe(1);
    expect(activeSources()).toHaveLength(0);
  });
  test('bounds rapid fire and gives depletion alerts priority', () => {
    for (let i = 0; i < 30; i++) {
      ctx.currentTime += 0.04;
      playGameSound({ type: 'machine-gun' });
    }
    expect(activeSources()).toHaveLength(6); // Three two-layer shots.
    playGameSound({ type: 'ammo-depleted' });
    expect(activeSources()).toHaveLength(9);
    // Distinct weapons can exhaust in the same frame; deduplication belongs to confirmed actions.
    playGameSound({ type: 'ammo-depleted' });
    expect(activeSources()).toHaveLength(12);
    playGameSound({ type: 'ammo-depleted' });
    expect(activeSources()).toHaveLength(12);
  });
  test('the last machine-gun round remains audible alongside its depletion alert', () => {
    playGameSound({ type: 'machine-gun' });
    const shot = [...activeSources()];
    playGameSound({ type: 'ammo-depleted' });
    expect(activeSources()).toHaveLength(5);
    expect(shot.every(source => source.started && !source.stopped && !source.disconnected)).toBe(true);
    expect(ctx.gains.some(node => node.gain.value === 0.35)).toBe(true);
  });
  test('caps aggregate voices and allows important alerts through a full mix', () => {
    for (let i = 0; i < 3; i++) {
      ctx.currentTime += 1;
      for (const type of ['machine-gun', 'missile', 'enemy-hit', 'enemy-fatal', 'pickup-ammo', 'pickup-missile', 'pickup-repair'] as const) playGameSound({ type });
    }
    // Every event has at least two layers, at most four: 12 events cannot exceed 48 sources.
    expect(activeSources().length).toBeLessThanOrEqual(48);
    playGameSound({ type: 'ammo-depleted' });
    expect(ctx.sources.slice(-3).every(source => source.started && !source.disconnected)).toBe(true);
    stopGameAudio();
    expect(activeSources()).toHaveLength(0);
  });
  test('finish preserves destruction tails, refuses later events, reset stops every node', () => {
    playGameSound({ type: 'machine-gun' });
    playGameSound({ type: 'enemy-fatal' });
    finishGameAudio();
    expect(activeSources()).toHaveLength(3);
    const count = ctx.sources.length;
    playGameSound({ type: 'pickup-repair' });
    expect(ctx.sources).toHaveLength(count);
    stopGameAudio();
    expect(activeSources()).toHaveLength(0);
    expect(ctx.sources.every(source => source.stopped)).toBe(true);
  });
  test('natural endings disconnect the entire voice', () => {
    playGameSound({ type: 'enemy-fatal' });
    const sources = [...activeSources()];
    sources.forEach(source => source.onended?.());
    expect(activeSources()).toHaveLength(0);
  });
  test('autoplay failures are handled and suspended events are never queued', async () => {
    ctx.state = 'suspended';
    unlockGameAudio();
    playGameSound({ type: 'missile' });
    expect(ctx.resumeCalls).toBe(1);
    expect(ctx.sources).toHaveLength(0);
    await Promise.resolve();
    ctx.state = 'running';
    expect(ctx.sources).toHaveLength(0);
    playGameSound({ type: 'missile' });
    expect(activeSources()).toHaveLength(2);
  });
  test('retries a partially failed initialization on the next gesture', () => {
    ctx.state = 'closed';
    FakeContext.failBuffer = true;
    unlockGameAudio();
    expect(FakeContext.instances.at(-1)!.state).toBe('closed');
    FakeContext.failBuffer = false;
    unlockGameAudio();
    ctx = FakeContext.instances.at(-1)!;
    playGameSound({ type: 'enemy-hit' });
    expect(activeSources()).toHaveLength(2);
  });
  test('simultaneous confirmed hits and pickups are not rate limited', () => {
    playGameSound({ type: 'enemy-hit' });
    playGameSound({ type: 'enemy-hit' });
    playGameSound({ type: 'pickup-ammo' });
    playGameSound({ type: 'pickup-ammo' });
    expect(activeSources()).toHaveLength(10);
  });
  test('device errors do not escape into gameplay', () => {
    ctx.failSource = true;
    expect(() => playGameSound({ type: 'enemy-fatal' })).not.toThrow();
    expect(activeSources()).toHaveLength(0);
  });
  test('preferences clamp, persist, notify, and mute existing and future sounds', () => {
    let notifications = 0;
    const unsubscribe = subscribeAudioPreferences(() => notifications++);
    playGameSound({ type: 'enemy-fatal' });
    setAudioPreferences({ volume: 9, muted: true });
    expect(getAudioPreferences()).toEqual({ volume: 1, muted: true });
    expect(JSON.parse(stored.get('planes-pve:audio:v1')!)).toEqual(getAudioPreferences());
    expect(activeSources()).toHaveLength(0);
    playGameSound({ type: 'missile' });
    expect(activeSources()).toHaveLength(0);
    setAudioPreferences({ volume: NaN });
    expect(notifications).toBe(1);
    expect(getAudioPreferences()).toBe(getAudioPreferences());
    expect(getServerAudioPreferences()).toBe(getServerAudioPreferences());
    unsubscribe();
  });
});
