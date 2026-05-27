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
- **PvE spin-off**: A separate single-player version of the airplane combat game where the pilot fights system-controlled enemies instead of other pilots. Avoid treating it as a multiplayer room variant.
- **High score**: The best score achieved in a single PvE run. Avoid using PvP ranking points as the primary PvE score term.
- **Local scoreboard**: The initial PvE top-score table stored in browser `localStorage`. It is scoped to one browser/device and is safe for a Vercel deployment with no configured database.
- **Global ranking**: A future top-score table for the PvE spin-off ordered by high score and attributed to player-entered arcade names, not authenticated profiles.
- **Arcade score entry**: A saved PvE ranking record created at the end of a run when the score qualifies for the top 10. It records arcade name, score, wave reached, kills, and creation time.
- **PvE score store**: The persistence boundary for arcade score entries in the PvE spin-off. The initial implementation is localStorage-only; the future global implementation is expected to use PostgreSQL and remain separate from the PvP Supabase schema.
- **Score submission**: The future server-side request made after a PvE run to validate an arcade name, check whether the score qualifies for the top 10, save the arcade score entry, and return the updated global ranking. The current local scoreboard performs lightweight client-side validation instead.
- **Light score validation**: Basic server-side checks for PvE score submissions, such as valid arcade names, plausible score ranges for wave and kills, and simple abuse limits. It is not authoritative anticheat.
- **Arcade name**: The 3-12 character name entered after a qualifying PvE run. It is displayed in uppercase on the global ranking and is not a login identity.
- **Run**: One continuous PvE attempt from takeoff until defeat. A run contains many waves and produces one final score.
- **Combat HUD**: The minimal in-run PvE overlay showing score, wave, enemies remaining, health, machine-gun ammunition, missiles, nearby pickup awareness, and combat-boundary warnings.
- **Radar**: A compact PvE awareness display showing relative direction of nearby enemy aircraft and pickups. Avoid using the multiplayer tactical minimap as the primary PvE navigation UI.
- **Arcade flow**: The PvE out-of-run UI sequence: start screen, pause screen, game over summary, conditional arcade-name entry, and updated local scoreboard. Avoid multiplayer lobby and profile screens in the initial PvE spin-off.
- **Arcade flight**: The PvE flight feel target: responsive, readable, and forgiving enough for combat survival while still preserving airplane momentum and spatial skill.
- **Graduated collision**: A PvE collision model where strong terrain or water impacts can destroy the airplane, while glancing terrain contact and light enemy collisions cause damage and pushback instead of instant defeat.
- **Simplified enemy flight**: A PvE enemy movement model with its own heading, speed, turning, pursuit, and attack behavior, without requiring the full player flight physics simulation.
- **Enemy aircraft model**: The visual form of PvE enemy aircraft. Enemy models can be based on the player's current airplane model, with role-specific color, scale, silhouette, or attachment differences for readability.
- **Enemy readability**: The requirement that Scout, Fighter, and Bomber roles be visually distinguishable at combat distance through simple differences such as size, color, silhouette, and trail.
- **Chase camera**: The third-person camera perspective used for PvE flight, based on the current player camera style and tuned for combat readability.
- **Run start**: The immediate PvE transition from start screen to airborne play, with brief spawn invulnerability and the first wave entering from distance. Avoid multiplayer lobby and long countdown patterns.
- **Tracer bullet**: The first playable PvE implementation slice that proves the spin-off runs independently: start screen, immediate airborne play, stripped multiplayer/auth/zone surfaces, minimal combat HUD, and a basic end-of-run path before full enemies, waves, pickups, and scoring are added.
- **Wave**: A group of system-controlled enemies spawned during a PvE run. Waves continue indefinitely and become harder over time.
- **Soft checkpoint**: A 10-15 second pacing break after every five PvE waves. It is not a saved game state or level screen; it shows a compact summary, grants recovery pickups, raises the difficulty tier, and continues the same run.
- **Defeat**: The end of a PvE run caused by destruction of the player's airplane. Running out of ammunition is a survivable crisis, not defeat by itself.
- **Ammo crate**: A PvE pickup that restores machine-gun ammunition during a run.
- **Missile crate**: A rarer PvE pickup that restores a small number of missiles during a run.
- **Repair kit**: A PvE pickup that restores airplane health during a run without exceeding maximum health.
- **Starting loadout**: The ammunition and missiles available at the start of a PvE run. It should be generous enough for the player to clear early waves before pickups become necessary.
- **Pickup spawn**: A controlled appearance of a PvE pickup either during combat as a risk-reward objective or during a soft checkpoint as guaranteed recovery. Pickups should require deliberate flight movement, not appear directly on the player.
- **Enemy aircraft**: A system-controlled opponent in the PvE spin-off. Avoid calling it a remote player because it is not a pilot connected through multiplayer.
- **Scout**: A fast, fragile enemy aircraft that pressures the player through harassment and movement.
- **Fighter**: The baseline enemy aircraft that pursues the player and attacks directly.
- **Bomber**: A slower, tougher enemy aircraft worth more score and intended to create target-priority decisions.
- **Enemy attack**: Direct gunfire from enemy aircraft. Enemy missiles are intentionally out of scope for the initial PvE version.
- **Player missile**: A limited player weapon in the PvE spin-off, intended for high-priority targets or difficult wave moments.
- **Flare**: A defensive countermeasure from the multiplayer game that is out of scope for the initial PvE spin-off because enemies do not fire missiles.
- **Wave clear bonus**: Score awarded when the player defeats all enemy aircraft in a wave.
- **Checkpoint bonus**: Score awarded at a soft checkpoint after every five waves.
- **Streak multiplier**: A temporary score multiplier earned by defeating enemies without taking damage for a short period.
- **Difficulty escalation**: The way PvE waves become harder through enemy count, enemy role composition, aggression, and accuracy. Avoid relying primarily on inflated enemy health.
- **Combat boundary**: The broad playable limit for PvE flight space. It warns the player and keeps enemies engaged before applying gradual damage for prolonged escape; avoid using the multiplayer shrinking zone in the initial PvE spin-off.

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
- `src/app/leaderboard/page.tsx`: localStorage-backed PvE scoreboard surface
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
