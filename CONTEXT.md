# Skybound Survival Context

## Project

Skybound Survival is a browser-based, single-player arcade airplane combat game. The pilot survives successive waves of enemy aircraft over an island, manages limited ammunition and health, collects supplies, and tries to earn a place in the global top 10. A run continues until the player's aircraft is destroyed; there is no final wave or campaign victory.

The playable flow is start screen → airborne run → game over → optional arcade-name entry → global scoreboard, with options to fly again or return to the start screen. Playing does not require an account.

## Domain Language

### Pilot And Run

**Pilot**:
The person playing Skybound Survival and controlling the player aircraft.
_Avoid_: Authenticated profile, commander, account

**Player aircraft**:
The airplane controlled by the pilot during a run, carrying its current health and weapons.
_Avoid_: Local player, unit

**Run**:
One continuous survival attempt, from entering airborne play until defeat. Each run starts fresh, spans successive waves, and produces a final score.
_Avoid_: Campaign

**Defeat**:
The end of a run caused by destruction of the player aircraft. Exhausting ammunition alone does not end the run.

**Starting loadout**:
The machine-gun ammunition and missiles available to the player aircraft when a run begins.

### Waves And Recovery

**Wave**:
A numbered group of enemy aircraft that the pilot must destroy before the next group arrives. Waves continue without a final wave.
_Avoid_: Round, level

**Wave clear**:
The defeat of every enemy aircraft belonging to a wave.

**Wave reached**:
The highest wave entered during a run, whether or not the pilot cleared it.
_Avoid_: Waves completed

**Inter-wave break**:
The interval between clearing one wave and the arrival of the next, during which the pilot continues flying.
_Avoid_: Pause

**Resupply**:
The recovery of ammunition, missiles, or health by collecting pickups while continuing the run.
_Avoid_: Soft checkpoint, automatic refill

**Pickup**:
A supply item in the airspace that the pilot collects by flying close to it. Its benefit is limited by the aircraft's ammunition capacity or maximum health.
_Avoid_: Power-up, upgrade

**Ammo crate**:
A pickup that replenishes machine-gun ammunition.

**Emergency resupply**:
An ammo crate supplied during an unfinished wave after the pilot spends five seconds without machine-gun ammunition or an available ammo crate. The pilot must collect it to resume firing the machine gun.

**Missile crate**:
A pickup that replenishes missiles.

**Repair kit**:
A pickup that restores aircraft health.

### Combat

**Enemy aircraft**:
A system-controlled airplane that opposes the pilot and belongs to a wave.

**Enemy role**:
One of the three enemy aircraft categories: Scout, Fighter, or Bomber. A role determines the aircraft's combat characteristics and score value.

**Scout**:
A fast, fragile enemy aircraft with the lowest score value of the three roles.

**Fighter**:
An enemy aircraft with speed, durability, and score value between those of the Scout and Bomber.

**Bomber**:
A slow, durable enemy aircraft with the highest score value of the three roles.

**Health**:
The remaining durability of an aircraft. Zero health means the aircraft is destroyed.
_Avoid_: Lives, shield

**Machine gun**:
The rapid-fire player weapon that consumes ammunition with each shot.

**Missile**:
A limited player weapon that deals more damage per hit than the machine gun.

**Kill**:
The destruction of one enemy aircraft by the pilot. A run's kill count is separate from its score.

**Target lock**:
The enemy aircraft currently tracked by the aiming indicator. It prioritizes an available firing solution; when none exists, it previews a visible enemy near the crosshair without implying the selected weapon can hit it.
_Avoid_: Missile guidance, automatic aim

**Firing solution**:
The alignment, range, and clear line of sight under which the selected weapon can hit an enemy aircraft. Among eligible enemies, the one closest to the crosshair takes priority, with the nearer enemy winning an alignment tie; the aiming indicator and the hit refer to that same enemy.

**Combat boundary**:
The fixed outer limit of the combat airspace, with a warning region and a farther region that damages the player aircraft.

### Awareness And Results

**Combat HUD**:
The in-run display of score, wave, enemies remaining, health, weapons, flight telemetry, aiming feedback, and combat warnings.

**Radar**:
The compact display of enemy aircraft and pickups relative to the player aircraft's position.

**Score**:
The points accumulated within one run by destroying enemy aircraft and clearing waves.
_Avoid_: Ranking points, lifetime points

**Wave clear bonus**:
The points awarded for clearing a wave, in addition to the points earned for individual kills.

**High score**:
A final run score that earns a place in the global top 10.

**Global scoreboard**:
The shared ordered table of up to ten named arcade run results. It ranks individual runs rather than pilot profiles. Earlier local scoreboards remain private to their original browsers.
_Avoid_: Pilot profiles, lifetime ranking

**Arcade score entry**:
A saved result from a qualifying finished run, attributed to an arcade name. It contains score, wave reached, kills, run duration, and the time it was saved.
_Avoid_: Profile, account statistics

**Arcade name**:
The pilot-entered label attached to an arcade score entry: 3–12 uppercase letters or digits. The same name can label multiple entries and does not establish a unique pilot identity.
_Avoid_: Username, login identity

## Current Architecture

The app uses Next.js 16.2.1, React 19.2.4, Tailwind CSS v4, shadcn UI primitives, Three.js through `@react-three/fiber`, Rapier through `@react-three/rapier`, Zustand for simulation state, and TanStack React Query for the Global scoreboard. Bun is the package manager and development command runner.

The homepage is a client component with the start screen and links to the global scoreboard and asset documentation. Starting a run resets the runtime state and dynamically loads `Scene` with SSR disabled. `Scene` starts play immediately and mounts the environment, player aircraft, and `PveDirector` inside the 3D canvas and physics world, with the combat HUD overlaid in React. Next.js exports the static frontend to `out/`; Cloudflare Workers serves those assets and handles `/api/*` using its D1 binding. No Next.js server runs in production.

Zustand bridges the frame-based simulation and React UI. It holds aircraft resources and telemetry, enemies, pickups, wave progression, score, combat feedback, and run timestamps. The run lifecycle helpers start, pause, resume, finish, and reset a run. Its states are `idle` (start screen), `playing`, and `finished`.

Flight publishes position and full-precision telemetry together through `publishFlight`; the store derives the combat-boundary warning in the same observable update. Identical frames and held weapon selections do not publish redundant updates, and target-lock publication retains the existing ten-unit distance threshold while reporting target or firing-solution changes immediately. A reset clears flight data along with the previous run's combat feedback. Simulation inputs still update every frame.

The Combat HUD keeps subscriptions local to the readout: radar and enemy directions follow movement, the compass follows heading, flight instruments follow their rounded display values, and score, health, weapons, and aiming feedback follow their own state. Short-lived damage flashes, hit markers, wave announcements, and collection/kill notifications own local wall-clock timers that stop at expiry. Those visual effects continue to expire while flight is paused. The HUD layout has no whole-store subscription or permanent refresh timer.

## Run And Wave Progression

The Wave progression module owns initial wave creation, enemy movement and attack deadlines, wave clear rewards, resupply, and pickup collection. `PveDirector` supplies frame time and renders the shared state. Progression deadlines use active run time from the lifecycle clock, so pauses preserve their remaining wait even if no frame renders while paused. Timers for removed enemies are discarded. Enemy damage resolves before collection; defeat prevents repairs and further attack feedback in that frame. The game and Worker validation share wave counts, clear bonuses, and the inter-wave interval from `pveRules.ts`.

- Each run begins airborne above the island with 100 health, 120 machine-gun rounds, and 3 missiles. Capacity is 180 rounds and 5 missiles.
- Wave 1 contains a Scout, Fighter, and Bomber. Starting at wave 3, one extra aircraft is added every two waves through wave 17, then every wave, reaching a rendering cap of 24 at wave 30. Role health and attack characteristics are currently fixed. The previous eight-aircraft cap and 400-unit radius floor stopped both difficulty controls at wave 11; the revised curve keeps increasing pressure through wave 30.
- New waves spawn in rings centered on the map origin (x = 0, z = 0), independently of the aircraft's horizontal position. The inner spawn radius starts at 500 units and decreases by 10 per wave to a floor of 240. From wave 4, alternating aircraft appear in a second band 60 units farther out; the inner/outer assignment flips each wave. The arc widens from ±70° to ±85° and its sector follows the aircraft's heading at arrival. Spawn rings remain inside the combat boundary even when the pilot flies beyond it. Enemy altitude follows the aircraft's current altitude and respects the existing terrain clearance.
- Clearing a wave awards `180 + wave * 25` points and schedules the next wave after 2.4 seconds. Flight continues during that interval.
- Clearing every wave produces an ammo crate. Every fifth wave also produces a missile crate, and every even-numbered wave produces a repair kit. Supplies appear in a line ahead of the aircraft at a nearby altitude and remain available until collected or the run resets. The radar highlights the nearest useful pickup in the forward hemisphere. Directional supply cards were removed at the pilot’s request; supplies remain recognizable in the world and on the radar. Collection receipts show the actual capacity-limited benefit.
- Collecting supplies restores 60 rounds, 1 missile, or 50 health, capped at the corresponding maximum.
- During combat, five continuous seconds with zero machine-gun ammunition and no ammo crate available trigger one emergency ammo crate ahead of the aircraft. It restores the usual 60 rounds on collection, even if missiles remain. Recovering ammunition or having an ammo crate available resets the timer; an existing crate prevents duplicate emergency supplies.
- Recovery uses resupply during ongoing flight, as recorded in [ADR 0007](docs/adr/0007-use-infinite-survival-waves-with-resupply.md). There is no dedicated recovery stop, checkpoint summary, or checkpoint bonus.
- Destruction of the player aircraft records the run's end time and displays game over. The pilot can save a qualifying score, start a fresh run, or return to the start screen.

## Flight, Combat, And Awareness

The player aircraft is a Rapier rigid body. The flight loop reads input, applies throttle and flight forces, updates orientation and the attached camera, publishes telemetry to the store, resolves weapons, and checks the fixed combat boundary. Enemy aircraft use role-specific movement and attack behavior managed by the Wave progression module, rather than the player's full rigid-body flight simulation.

Current controls are W/S for throttle, A/D for roll, arrow keys for pitch/yaw, Shift for air brake, Space or left click to fire, 1/2 to select machine gun/missile, and O to toggle mouse steering. F toggles browser fullscreen. In-run display controls adjust HUD size (80–150%) independently of render quality (native, 125% sharp, or performance); preferences are stored locally under `planes-pve:display:v1`. Full HD uses the native viewport resolution by default. Higher-resolution viewports receive a larger initial HUD scale when no preference has been saved.

PvE hits resolve locally at firing time using weapon range and an aiming cone. The machine gun deals 12 damage and missiles deal 80; each shot consumes its resource even if it misses. Machine-gun tracers are visual feedback. Missiles currently apply immediate damage rather than simulating a guided projectile. The target indicator tracks an enemy near the crosshair and shows whether that enemy is within the selected weapon's firing solution.

The Firing solution module owns target selection, weapon eligibility, independent cooldowns, resource consumption, and shot/depletion/empty-trigger feedback. It chooses the most aligned visible enemy inside the selected weapon's cone and range, breaking alignment ties by distance. A wider-cone tracking preview is used only when no firing solution is available and cannot receive damage. The aircraft supplies aim, trigger input, and time, then draws a tracer only for an accepted machine-gun shot. Cooldowns retain their wall-clock behavior: they expire while paused, although no shot or feedback occurs during pause or after defeat.

Sound effects use procedural Web Audio synthesis with one reusable context and noise buffer, unlocked directly by Play or Fly again. Confirmed gunfire and missile launches sound even on a miss. Spending the last round or missile adds a depletion alert; a later attempt on an empty weapon gives a distinct mechanical click, limited to one warning per weapon per trigger hold. Collecting ammunition re-arms that warning. Actual enemy damage emits an impact for each attack, including attacks in the same frame; environmental damage does not impersonate enemy fire. The fatal impact keeps playing after the Canvas unmounts, and reset/exit stops all voices. Pickups use their actual capacity-limited benefit: positive gains have a sound per supply type, while a consumed box with zero gain uses a neutral descending cue.

Effects volume and mute are available on the start screen and inside the combat HUD's Display settings panel. They persist under `planes-pve:audio:v1` (initial volume 65%). The mix limits simultaneous voices, prioritizes alerts and destruction, lowers gun tails under alerts without cancelling the last shot, and compresses peaks. Browser audio or storage failures leave the game playable. No external audio assets or downloads are used; subjective timbre and loudness still need the pilot's listening assessment.

Enemies approach a preferred distance of 80% of their firing range and attack in role-specific bursts, with a 6.5-second grace period against enemy attacks at run start. Pursuit and firing range use the aircraft's actual three-dimensional position; terrain still blocks fire and constrains enemy altitude. Destroying a Scout awards 100 points, a Fighter 160, and a Bomber 260. A kill also updates the kill feed, hit marker, and explosion feedback.

Ground collision destroys the player aircraft after its initial 3-second collision grace period. The lethal ground is a trimesh collider built from the same buffers as the visible terrain; vegetation and rocks are decorative and have no colliders. Falling below the water threshold (half a unit above the sea surface at y = −5) also ends the run. The combat boundary warns beyond a radius of 3,800 and applies 20 damage per second beyond 4,600; it does not shrink. Both radii live in the shared world topology.

The world is an island surrounded by ocean. The combat HUD includes a heading-relative radar (nose up, tail down), nearby-enemy direction arrows, a compass, targeting feedback, incoming-damage feedback, and resource and telemetry readouts. Supply objects are world-scale 3D models: an ammo box with protruding cartridges, a finned missile, and a ratchet torque wrench for repair. Their perspective size changes with distance; HUD and radar use matching cartridge/missile/wrench symbols. A fixed notification stack below the radar combines enemy kills and actual resource increments, including an explicit full-capacity message when a consumed box restores zero. Notifications never participate in the radar’s horizontal layout. The island is a deterministic heightfield: a central valley open to the north coast and partly closed at its south end by low hills with passes around them, an eastern range and a western massif of connected crests with saddles (crests up to about 200 units), southern hills, and a sloping beach into the sea. Vegetation is generated deterministically in forest clusters, lone trees, bushes and rocks seated on the real surface. Sizes are proportioned to the 2.6-unit wingspan of the player biplane (broadleaf trees 5–8 units, pines 6.5–11). Enemies keep 30 units and new supplies 28 units above the terrain. Telemetry altitude is measured from the sea surface (physical y + 5); the HUD also shows height above the ground (AGL). Shared world constants and one height query describe the island for rendering, collision, placement and spawns.

## Score Persistence

New clients register with `gameVersion: "survival-v2"`. Registrations without a version retain `survival-v1` for older open tabs. D1 stores that version once; finish validation uses its wave counts, and registration retries or recovery cannot replace it. The shared ranking retains results from both rulesets.

The current implementation uses Cloudflare D1 through a same-origin Worker API, as recorded in [ADR 0014](docs/adr/0014-host-on-workers-and-store-survival-runs-in-d1.md). It is available at game over and on `/leaderboard`. Earlier entries under `planes-pve:scoreboard:v1` remain in the original browser and are neither erased nor uploaded automatically. Remote provisioning and verification status is recorded in [migration continuity](docs/plans/2026-10-24-cloudflare-continuidad.md).

A run must have a positive score and qualify for the top 10 before the game-over screen offers name entry. Entries are ordered by score descending, wave reached descending, kills descending, duration ascending, and then server name-save time ascending (run ID resolves identical timestamps). Names are normalized to uppercase letters and digits and must be 3–12 characters long. Reusing a name creates another run entry rather than updating a profile. A concurrent better result can displace a score between showing the form and saving it; the result remains in history.

Run registration begins at takeoff without blocking flight. D1 assigns the run ID and original server timestamp and records only approximate country from Cloudflare request metadata; it stores no raw IP. A random per-run browser credential is stored only as a hash in D1. Finishing records score, wave, kills and active duration independently of the original start time; explicit exit records abandonment. Closing a tab can leave an `active` history row, which means unfinished rather than proof of ongoing play. Registration, finish and name retries are idempotent; conflicting completed metrics or names return a conflict. Lost start responses can be recovered without creating a run retroactively.

Network failures leave gameplay available and appear as recoverable errors at game over or on the ranking page. Pending results live in memory: retry before leaving the game-over screen; refresh or exit can lose an unsent result. Basic rate limits, request size limits and survival plausibility checks reduce abuse but do not establish score authenticity.

The game-over and ranking views share one React Query ranking cache for the current browser session. Rankings remain fresh for 30 seconds; later mounts, focus, or reconnection can refresh stale data. Saving an Arcade name uses the ranking already returned by the Worker to update that shared cache and cancels any older ranking read so it cannot overwrite the save. Transient read failures retry once; rate limits and invalid requests require explicit retry, and a failed background refresh retains the last loaded scores. Run registration and completion remain owned by the per-run tracking module. The Worker still queries D1 for each accepted ranking request; this browser cache is not shared across pilots.

Saving a result preserves its final metrics, not the run's playable state. Active runs and recovery supplies are not saved for resumption.

## Planned Features And Historical Context

ADRs preserve the context and reasoning of their original decisions. Read each status and its successor links before applying historical guidance; this document describes the current implementation.

- [ADR 0014](docs/adr/0014-host-on-workers-and-store-survival-runs-in-d1.md) supersedes the PostgreSQL/Next.js API plan and local scoreboard phase with Workers hosting and D1 history.
- Streak multipliers and graduated collision damage appeared in the earlier domain description but are not implemented in the active loop. The pause screen is implemented: P/Escape freezes physics, simulation and active run duration while leaving the scene visible.
- Waves are endless, but enemy count stops increasing at eight and role statistics remain fixed. Broader difficulty escalation is future balancing work.
- Completed prompts and temporary browser evidence were retired; Git history preserves the versioned material. Use the [completed-session summary](docs/plans/2026-10-23-prompts-mejoras-juego.md#seguimiento-de-sesiones), this context and the PvE ADRs for current scope and delivery records.

## Source Map

- `src/app/page.tsx`: start screen and entry into a fresh run
- `src/app/leaderboard/page.tsx`: global scoreboard page
- `src/app/docs/page.tsx`: asset credits and licensing
- `src/components/game/Scene.tsx`: PvE scene, immediate run start, game over, restart, and exit
- `src/components/game/Airplane.tsx`: player flight, firing input/tracer rendering, collisions, and combat boundary
- `src/lib/pveCombat.ts`: Firing solution selection, shot eligibility, weapon cooldowns, resource use, and shot/depletion/empty feedback
- `src/components/game/PveDirector.tsx`: frame adapter for Wave progression and enemy/target/explosion visuals
- `src/lib/waveProgression.ts`: pause-aware wave timing, enemy movement and attacks, clear rewards, resupply, and collection ordering
- `src/lib/pveRules.ts`: enemy role statistics and wave counts/bonuses/interval shared with Worker validation
- `src/components/game/Environment.tsx`: terrain mesh and collider, ocean, instanced vegetation, lighting, clouds, and fog
- `src/components/game/AirplaneModel.tsx`: shared aircraft appearance with role colors and scale supplied by the scene
- `src/components/game/Projectiles.tsx`: visual machine-gun tracers; hit resolution happens when firing
- `src/components/ui/HUD.tsx`: focused combat readouts, radar, compass, aiming feedback, and local expiry of visual feedback and notifications
- `src/components/ui/GameOver.tsx`: run summary, qualifying name entry, score save, and replay/exit actions
- `src/components/ui/GlobalScoreboardPanel.tsx`: global score loading, unavailable state and retry
- `src/components/ui/LocalScoreboardTable.tsx`: shared ranking table, retaining its original filename
- `src/store/useGameStore.ts`: coherent flight publication, runtime state, enemy damage and kill scoring, resource collection, and reset
- `src/lib/runLifecycle.ts`: run timestamps, pause/resume, lifecycle transitions and result submission
- `src/lib/gameAudio.ts`: procedural effects, shared audio context, voice cleanup, mix limits, and local audio preferences
- `src/components/ui/GameAudioControls.tsx`: accessible volume and mute controls shared by entry and HUD settings
- `src/lib/combatResolution.ts`: player damage, defeat and combat-boundary damage; weapon values are in `pveCombat.ts`
- `src/lib/scoreboard.ts`: shared arcade-name and ranking contracts
- `src/lib/scoreService.ts`: browser API client and per-run registration/completion tracking
- `src/lib/scoreQueries.ts`: shared ranking freshness/retry policy and Arcade name saves that update the cache
- `src/components/ScoreQueryProvider.tsx`: browser-session query cache shared across navigation
- `worker/index.ts`, `worker/validation.ts`: same-origin D1 API, request validation and basic abuse controls
- `migrations/0001_runs.sql`: history schema and ranking index
- `wrangler.jsonc`: Workers assets, D1 and rate-limit bindings
- `src/lib/localScoreboard.ts`: preserved legacy local persistence helpers
- `src/lib/localScoreboard.test.ts`: existing scoreboard validation and ordering tests
- `src/lib/flightFrame.ts`: player flight forces, torque, camera, and telemetry helpers
- `src/lib/worldTopology.ts`: shared world dimensions, relief control points, sea level and combat boundary
- `src/lib/terrainHeight.ts`: deterministic heightfield, surface height/slope queries, airborne clearance, and shared mesh/collider buffers
- `src/lib/terrainScatter.ts`: deterministic vegetation and rock placement on the terrain surface
- `docs/adr/0005-*` onward: PvE scope and persistence decisions
