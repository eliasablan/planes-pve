# Spec: Skybound Battle Royale

**Date:** 2026-03-30
**Topic:** Multiplayer Airplane Combat Game with Battle Royale Mechanics
**Status:** Draft (Awaiting Final User Review)

## 1. Project Overview
A high-performance, browser-based multiplayer airplane combat game. Players compete in a shrinking "Zone" (Battle Royale style), using limited ammunition and tactical maneuvers to be the last pilot flying. The game features persistent statistics (kills, wins) and a global leaderboard.

## 2. Tech Stack
- **Frontend Framework:** Next.js 15 (App Router, React 19)
- **3D Engine:** `@react-three/fiber` + `Three.js`
- **Physics:** `@react-three/rapier` (Collisions & Zone Triggers)
- **Networking:** Supabase Realtime (Broadcast for movement, Presence for lobby/life status)
- **Backend/Database:** Supabase (Auth, SQL Tables, RPC for live event logging)
- **State Management:** Zustand (Bridge between R3F loop and React HUD)
- **Styling/UI:** Tailwind CSS + Shadcn/UI + Lucide Icons

## 3. Core Mechanics

### 3.1. Flight Physics (Rapier-driven)
- **Controls:**
  - `Mouse Move`: Pitch (Up/Down) & Yaw (Left/Right) - Target Reticle.
  - `W / S`: Throttle (Speed control).
  - `A / D`: Roll (Banking/Rotation).
  - `Gamepad API`: Native mapping for Joysticks/Controllers.
- **Movement:** Simulated inertia with damping. Speed affects turn rate (tighter turns at optimal speeds).

### 3.2. Combat & Health
- **HP:** 100 (Max), **No Regeneration**.
- **Damage Profiles:**
  - **Bullet (Machine Gun):** 10 DMG per hit.
  - **Missile:** 65 DMG per hit (Instant smoke/critical state).
  - **Zone Damage:** -10 HP/s when outside the circle.
- **Visual Damage States:**
  - `HP < 75`: White smoke trail.
  - `HP < 40`: Dense black smoke.
  - `HP < 15`: Fire, sparks, and camera shake (Critical failure).
- **Ammunition & Resupply:**
  - **MG:** 50 rounds initial. +15 rounds every 30s.
  - **Missiles:** 2 initial. +1 every 60s.
  - **Flares:** 2 initial. +1 every 60s (Disrupts enemy missile lock-on).

### 3.3. The Zone (Battle Royale)
- **Deterministic Logic:** The circle's center and radius are calculated locally by all clients based on the room's `start_time` (server timestamp). No host is required to move the zone.
- **Visual:** A large red semi-transparent cylinder/border in the 3D world and a circle on the mini-map.

## 4. Database Schema (Supabase SQL)

### `profiles` (Table)
- `id` (uuid, PK): Matches Supabase Auth.
- `username` (text): Unique display name.
- `total_kills` (int): Accumulated kills across all games.
- `total_wins` (int): Accumulated victories.
- `ranking_points` (int): Score based on performance.

### `matches` (Table)
- `id` (uuid, PK)
- `room_name` (text)
- `status` (enum: 'lobby', 'playing', 'finished')
- `start_time` (timestamptz): Set when the match begins.
- `winner_id` (uuid, FK): Updated at end of match.

### `match_events` (Table - Live Persistence)
- `id` (uuid, PK)
- `match_id` (uuid, FK)
- `killer_id` (uuid, FK)
- `victim_id` (uuid, FK)
- `created_at` (timestamptz)

## 5. UI & Game Scenes

### 5.1. Scenes
- **Lobby:** Selection of rooms, real-time player list (Presence), "Ready" toggle.
- **Deployment:** 3s countdown overlaying the 3D world.
- **HUD:** 
  - Altitude & Speed bars (Shadcn).
  - Radar (Mini-map with enemy dots & zone).
  - Ammo/Flares counters with cooldown animations.
  - Kill Log (Top-right, highlighting player actions).
- **Game Over:** Detailed summary (Rank, Kills, Points) with "Return to Menu" button.
- **Victory:** Full-screen animation, gold trophy icon, profile update confirmation.

## 6. Implementation Strategy (Plan)
1. **Scaffold:** Initialize Next.js 15, Shadcn/UI, and Supabase client.
2. **Database:** Execute SQL schema and setup RLS policies.
3. **World Building:** Basic Three.js environment (Sky, Ground, Lighting).
4. **Flight:** Implement Rapier physics for the local airplane.
5. **Networking (Realtime):** Sync positions/rotations via Broadcast and manage life state with Presence.
6. **Combat Logic:** Implement Raycasting for MG and projectile logic for Missiles/Flares.
7. **The Zone:** Add the mathematical model for the shrinking circle and damage trigger.
8. **UI/UX:** Build HUD, Kill Log, and Scenes (Lobby -> Game -> Results).
9. **Persistence:** Connect RPC calls for live kill logging and profile updates.

## 7. Performance & Quality Assurance
- **Broadcast Frequency:** 30Hz for player updates.
- **Interpolation:** Linear/Spherical (Lerp/Slerp) on remote clients to ensure 60fps visual smoothness.
- **Draw Calls:** Use instanced rendering for bullets and smoke particles.
- **Optimization Audit:** Use the `vercel-react-best-practices` skill to audit the React/Next.js implementation for optimal performance patterns (ISR, data fetching, bundle optimization).
- **Physics Efficiency:** Run Rapier at a fixed time step (60Hz) independent of the frame rate.
