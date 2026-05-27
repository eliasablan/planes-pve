# ADR 0003: Use Zustand as the bridge between the frame loop and React UI

## Status

Accepted

## Date

2026-05-27

## Context

The game has two different state consumers:

- A React Three Fiber frame loop that updates flight telemetry, player position, weapons, hp, zone damage, and realtime snapshots.
- React UI components that render the HUD, minimap, lobby, game-over screen, and profile state.

Passing all of this through component props would couple the scene tree to every overlay and make per-frame updates harder to coordinate.

## Decision

Use a single Zustand store in `src/store/useGameStore.ts` for shared runtime game state. The simulation writes state from the frame loop, Supabase event handlers update remote player and kill log state, and UI components subscribe to the slices they render.

## Consequences

- R3F components and DOM overlays can coordinate without deep prop threading.
- The minimap and HUD can react to live telemetry and local player position.
- Shared mutable state must stay small and intentional; not every transient Three.js object belongs in the store.
- Per-frame store writes should be monitored for render cost as the game grows.
