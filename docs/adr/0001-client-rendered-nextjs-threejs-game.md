# ADR 0001: Client-render the 3D game scene inside Next.js

## Status

Accepted

## Date

2026-05-27

## Context

Skybound Battle Royale is a web game with a realtime Three.js scene, Rapier physics, browser input handling, and HUD overlays. The app also needs conventional web surfaces for authentication, profile display, and leaderboard viewing.

Next.js is already the application shell. The game runtime depends on browser-only APIs and should not run during server rendering.

## Decision

Use Next.js App Router for the web application shell and dynamically import the 3D game scene with SSR disabled. Keep Three.js, React Three Fiber, Rapier physics, controls, and per-frame simulation in client components.

The homepage owns authenticated entry into the game, while `src/components/game/Scene.tsx` owns the active game surface.

## Consequences

- The app can combine normal web pages and a browser-only 3D game without a separate frontend.
- Server rendering remains useful for non-game surfaces such as the leaderboard.
- Game code must remain careful about client/server boundaries and browser-only imports.
- Any future Next.js changes should be checked against `node_modules/next/dist/docs/` before code changes because this repo is on Next.js 16.2.1.
