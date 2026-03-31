# Skybound Battle Royale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a high-performance multiplayer airplane combat game with Battle Royale mechanics using Next.js 15, Three.js, Rapier physics, and Supabase Realtime.

**Architecture:** Peer-to-peer state synchronization using Supabase Broadcast for high-frequency movement and Presence for lobby/life status. Deterministic zone logic calculated per-client based on server timestamps.

**Tech Stack:** Next.js 15 (App Router), React 19, Three.js (@react-three/fiber), Rapier (@react-three/rapier), Supabase (Auth, DB, Realtime), Zustand, Tailwind CSS, Shadcn/UI.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `components.json`
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Initialize Next.js 15 project**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm --src-dir false`
Expected: Next.js scaffold created.

- [ ] **Step 2: Install core dependencies**
Run: `npm install three @types/three @react-three/fiber @react-three/drei @react-three/rapier zustand lucide-react @supabase/supabase-js clsx tailwind-merge`
Expected: Dependencies installed.

- [ ] **Step 3: Initialize Shadcn/UI**
Run: `npx shadcn@latest init` (Select Default, Slate, Yes to CSS variables)
Expected: Shadcn/UI configured.

- [ ] **Step 4: Create basic layout with theme provider**
Modify `app/layout.tsx` to include CSS variables for 'Military', 'Neon', and 'Classic' themes.
Expected: Project building with `npm run dev`.

- [ ] **Step 5: Commit**
```bash
git add .
git commit -m "chore: scaffold project and install dependencies"
```

### Task 2: Supabase Schema & Auth

**Files:**
- Create: `supabase/schema.sql`, `lib/supabase.ts`

- [ ] **Step 1: Define SQL schema**
Create `supabase/schema.sql` with `profiles`, `matches`, and `match_events` tables. Include RLS policies.
Expected: SQL file created.

- [ ] **Step 2: Initialize Supabase client**
Create `lib/supabase.ts` with environment variable checks.
Expected: Supabase client ready.

- [ ] **Step 3: Commit**
```bash
git add supabase/schema.sql lib/supabase.ts
git commit -m "feat: database schema and supabase client"
```

### Task 3: Game State (Zustand Store)

**Files:**
- Create: `store/useGameStore.ts`

- [ ] **Step 1: Create Zustand store**
Define state for: `hp`, `ammo`, `missiles`, `flares`, `gameStatus` (lobby, playing, finished), `players` (Presence map), `killLog`.
Expected: Store file created.

- [ ] **Step 2: Commit**
```bash
git add store/useGameStore.ts
git commit -m "feat: initial game store"
```

### Task 4: Basic 3D Environment

**Files:**
- Create: `components/game/Scene.tsx`, `components/game/Environment.tsx`

- [ ] **Step 1: Create Scene component**
Setup `Canvas` with `Physics` from Rapier.
Expected: Black screen with physics provider.

- [ ] **Step 2: Add Environment (Sky, Ground, Lights)**
Create `Environment.tsx` with a dynamic `Sky` and a large ground plane.
Expected: Visible sky and ground in 3D.

- [ ] **Step 3: Commit**
```bash
git add components/game/Scene.tsx components/game/Environment.tsx
git commit -m "feat: basic 3d environment"
```

### Task 5: Flight Physics (Local Player)

**Files:**
- Create: `components/game/Airplane.tsx`, `hooks/useControls.ts`

- [ ] **Step 1: Implement control hooks**
Handle Keyboard (WASD, Space, F, R) and Mouse move events.
Expected: Input state tracked.

- [ ] **Step 2: Create Airplane physics component**
Use `RigidBody` from Rapier. Apply forces/torques based on inputs (Pitch, Yaw, Roll, Throttle).
Expected: Airplane model (placeholder) moves and rotates in 3D.

- [ ] **Step 3: Commit**
```bash
git add components/game/Airplane.tsx hooks/useControls.ts
git commit -m "feat: airplane flight physics"
```

### Task 6: Multiplayer (Supabase Realtime)

**Files:**
- Create: `components/game/MultiplayerProvider.tsx`, `components/game/RemoteAirplane.tsx`

- [ ] **Step 1: Implement Presence & Broadcast**
Subscribe to a room channel. Broadcast local pos/rot at 30Hz. Update local store with remote players.
Expected: Player movements synced across windows (seen as dots or placeholders).

- [ ] **Step 2: Smooth Interpolation**
Use `lerp` and `slerp` in `RemoteAirplane.tsx` to smoothly move remote players to received coordinates.
Expected: Fluid remote movement.

- [ ] **Step 3: Commit**
```bash
git add components/game/MultiplayerProvider.tsx components/game/RemoteAirplane.tsx
git commit -m "feat: multiplayer synchronization"
```

### Task 7: Combat System (MG & Missiles)

**Files:**
- Create: `components/game/Projectiles.tsx`, `hooks/useCombat.ts`

- [ ] **Step 1: Implement Machine Gun (Raycasting)**
Use Rapier raycast to detect hits. Broadcast 'hit' event. Update victim HP.
Expected: Hitting remote player reduces their HP in store.

- [ ] **Step 2: Implement Missiles & Flares**
Missiles are projectiles with simple homing logic. Flares disrupt homing.
Expected: Missiles chase targets; flares distract them.

- [ ] **Step 3: Damage Visuals**
Add particle systems (smoke/fire) to `Airplane.tsx` based on `hp` state.
Expected: Planes smoke when damaged.

- [ ] **Step 4: Commit**
```bash
git add components/game/Projectiles.tsx hooks/useCombat.ts
git commit -m "feat: combat mechanics and damage visuals"
```

### Task 8: The Zone (Battle Royale)

**Files:**
- Create: `components/game/TheZone.tsx`

- [ ] **Step 1: Deterministic Circle Logic**
Calculate `radius = maxRadius * (1 - timeElapsed / totalTime)`.
Expected: Zone visible and shrinking on mini-map/3D view.

- [ ] **Step 2: Zone Damage Trigger**
If local airplane is outside the circle, subtract -10 HP/s.
Expected: Dying when outside the red circle.

- [ ] **Step 3: Commit**
```bash
git add components/game/TheZone.tsx
git commit -m "feat: battle royale zone"
```

### Task 9: HUD & UI Scenes

**Files:**
- Create: `components/ui/HUD.tsx`, `components/ui/Lobby.tsx`, `components/ui/GameOver.tsx`

- [ ] **Step 1: Build Lobby Scene**
Shadcn Table for rooms and Presence list. "Ready" button.
Expected: Functional lobby.

- [ ] **Step 2: Build HUD Overlay**
Altitude, Speed, Ammo, Cooldowns, and Mini-map using Shadcn.
Expected: Professional game overlay.

- [ ] **Step 3: Build Kill Log**
List notifications. Highlight local player kills.
Expected: Kill feed active.

- [ ] **Step 4: Commit**
```bash
git add components/ui/HUD.tsx components/ui/Lobby.tsx components/ui/GameOver.tsx
git commit -m "feat: hud and game scenes"
```

### Task 10: Persistence & Leaderboard

**Files:**
- Create: `app/leaderboard/page.tsx`, `lib/matchLogging.ts`

- [ ] **Step 1: Log Matches & Wins**
Call Supabase RPC on kill and on win.
Expected: Data persisted in SQL tables.

- [ ] **Step 2: Build Leaderboard Page**
Fetch Top 10 players from `profiles`.
Expected: Leaderboard visible.

- [ ] **Step 3: Run Performance Audit**
Run `npx vercel-react-best-practices` (or equivalent skill) and apply fixes.
Expected: Optimized React code.

- [ ] **Step 4: Final Commit**
```bash
git add .
git commit -m "feat: persistence, leaderboard, and final optimizations"
```
