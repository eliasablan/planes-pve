# Skybound Battle Royale Context

## Project

Skybound Battle Royale is a browser-based multiplayer airplane combat game. Players authenticate as pilots, enter a realtime room, fly over an island arena, fight with limited weapons, avoid a shrinking battle royale zone, and accumulate persistent stats for the leaderboard.

The product is currently implemented as a Next.js App Router application with a client-rendered 3D game scene. The primary runtime experience lives in the browser; Supabase provides authentication, profile data, realtime room messaging, and persistence for match events and leaderboard stats.

## Domain Language

- **Pilot**: An authenticated user profile. The UI often labels pilots as units, commanders, or designations, but the persisted identity is a Supabase profile.
- **Profile**: Persistent Supabase row keyed to the Supabase auth user. Stores `username`, `total_kills`, `total_wins`, and `ranking_points`.
- **Room**: A Supabase Realtime channel topic for one multiplayer session. The current default room name is `default-room`.
- **Match**: A persisted gameplay session in Supabase. The current local game lifecycle can run without a persisted match id.
- **Local player**: The current browser's airplane, simulated by Rapier and controlled from keyboard, mouse, and weapon inputs.
- **Remote player**: Another pilot's latest broadcast snapshot, rendered as an interpolated placeholder aircraft.
- **Snapshot**: A high-frequency realtime payload containing player id, username, position, rotation, and hp.
- **Zone**: The shrinking battle royale safe area. The store exposes current and target zone radius/center for 3D rendering and minimap drawing.
- **Current zone**: The red gas perimeter currently damaging pilots outside it.
- **Target zone**: The next safe area shown on the minimap and in the world.
- **World topology**: Shared map and 3D arena constants such as map size, island radius, coastline radius, colors, and mountain positions.
- **HUD**: The in-game overlay for telemetry, weapon state, integrity, kill feed, and minimap.
- **Leaderboard**: Server-rendered page that reads Supabase profiles ordered by ranking points.

## Current Architecture

The app uses Next.js 16.2.1, React 19.2.4, Tailwind CSS v4, shadcn UI primitives, Three.js through `@react-three/fiber`, Rapier through `@react-three/rapier`, Supabase, and Zustand.

The homepage is a client component. It checks the Supabase session, loads the current profile into the Zustand store, and dynamically imports the 3D `Scene` with SSR disabled. This keeps the Three.js/Rapier experience browser-only.

The game scene switches between lobby, playing/countdown, and game-over views using `gameStatus` from the store. While playing, the scene mounts a React Three Fiber `Canvas`, Rapier `Physics`, the environment, the zone, the local airplane, remote airplanes, and the HUD.

Zustand is the shared runtime state bridge between the R3F frame loop and React UI. The flight loop writes hp, weapons, telemetry, local player position, zone data, remote players, score, and kill log state. React overlays read that state to render HUD, minimap, lobby, and results.

Supabase Realtime is used as a lightweight room transport. Movement is sent as broadcast snapshots at roughly 30Hz. Combat uses broadcast hit and kill events. Presence is used to track room joins and leaves, although the current lobby derives its player list from snapshots stored in Zustand.

Supabase Postgres stores profiles, matches, and match events. The app currently logs kills and win increments through client-side Supabase calls and RPC helpers. Match lifecycle in the browser can start locally without creating a persisted `matches` row.

## Game Loop And Controls

The local airplane is a Rapier rigid body spawned above the island. Each frame:

- input is read from `useControls`
- local position is written to the store for the minimap
- flight basis vectors are derived from the aircraft quaternion
- throttle, lift, drag, torque, and camera FOV are applied
- telemetry is written to the store
- weapon input resolves machine gun shots, missile consumption, and flare consumption
- local snapshots are broadcast to the room
- zone damage is applied when outside the current zone

Keyboard controls currently include W/S throttle, A/D roll, arrow keys pitch/yaw, Shift brake, Space or left mouse fire, 1/2 weapon selection, X flare, O mouse steering toggle, and M large map toggle.

## Combat Model

Combat is currently client-resolved. Machine gun shots consume ammo and search remote player snapshots in the shooter's reticle using distance and dot-product checks. Hits are broadcast to the room. The victim client applies local damage, ends its local match when hp reaches zero, broadcasts a kill, and logs the kill if there is a match id.

Missiles and flares currently consume inventory and have placeholder projectile support. Homing, flare disruption, and fully authoritative missile hit resolution are not complete.

Damage constants are centralized in `src/lib/combatResolution.ts`:

- machine gun: 10
- missile: 65
- zone: 15
- collision: 100

## World And Map

The world is an island arena in a large ocean. Shared world constants live in `src/lib/worldTopology.ts` and are used by both the 3D environment and canvas minimap. This keeps island radius, coast radius, mountains, colors, and world-to-map scaling consistent across views.

The minimap renders the island, mountains, current zone, target zone, remote players, and local player heading on a canvas. The large tactical map uses the same projection at a larger size.

## Persistence

The Supabase schema defines:

- `profiles`: persistent pilot stats
- `matches`: match metadata and winner
- `match_events`: persisted kills
- `increment_kills(user_id)`: increments kills and ranking points
- `increment_wins(user_id)`: increments wins and ranking points

New Supabase auth users create profiles through a database trigger using `raw_user_meta_data->>'username'`.

## Known Gaps

- The docs/spec mention deterministic zone behavior based on server timestamps, but the current `TheZone` implementation chooses future centers with `Math.random()` inside each client. That means clients can diverge unless this is centralized or made deterministic.
- The current local match lifecycle does not necessarily create a persisted match before gameplay starts, so kill logging depends on a match id being available.
- Combat is trust-based and client-resolved. It is suitable for a prototype but not for competitive integrity.
- Missiles and flares are inventory-level features with placeholder projectile behavior; homing, lock-on, and flare disruption are not yet complete.
- The lobby does not yet implement a real ready-state protocol; it mostly displays room membership and lets the local player deploy.
- Existing superpowers docs refer to Next.js 15, while the actual dependency is Next.js 16.2.1.

## Source Map

- `src/app/page.tsx`: authenticated landing page and entry into the game scene
- `src/app/leaderboard/page.tsx`: Supabase-backed leaderboard
- `src/components/game/Scene.tsx`: game scene composition and UI state switching
- `src/components/game/Airplane.tsx`: local player simulation, weapons, telemetry, broadcasting, and zone damage
- `src/components/game/Environment.tsx`: 3D island, ocean, mountains, props, lighting, and fog
- `src/components/game/TheZone.tsx`: current and target zone rendering/state
- `src/components/game/MultiplayerProvider.tsx`: room subscription and realtime event handling
- `src/components/game/RemoteAirplane.tsx`: interpolated remote player rendering
- `src/components/ui/HUD.tsx`: in-game overlay and large map
- `src/components/ui/Minimap.tsx`: canvas tactical map
- `src/store/useGameStore.ts`: shared game state
- `src/lib/realtimeRoom.ts`: Supabase Realtime room abstraction
- `src/lib/combatResolution.ts`: damage, shot, hit, kill, and scoring logic
- `src/lib/flightFrame.ts`: reusable flight physics helpers
- `src/lib/worldTopology.ts`: shared world/minimap topology
- `src/lib/matchLifecycle.ts`: local match state transitions
- `src/lib/matchLogging.ts`: Supabase kill and win persistence
- `supabase/schema.sql`: database schema, RLS, trigger, and stats RPCs
