# Map and Control Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the map rendering (minimap and large map) and ensure the 'M' key correctly toggles the large map. Ensure player position is tracked on the map.

**Architecture:** Use Zustand store to sync player position from the Three.js loop to the UI components. Update control logic to use toggle state for map and steering.

**Tech Stack:** Next.js 15, Zustand, Canvas API, React.

---

### Task 1: Control Toggles and Position Tracking

**Files:**
- Modify: `src/store/useGameStore.ts`
- Modify: `src/hooks/useControls.ts`
- Modify: `src/components/game/Airplane.tsx`

- [ ] **Step 1: Add local player position to store**
Modify `src/store/useGameStore.ts` to include `localPlayerPosition: [number, number]` and a setter.
```typescript
// Add to interface
localPlayerPosition: [number, number];
setLocalPlayerPosition: (pos: [number, number]) => void;

// Add to state
localPlayerPosition: [0, 0],
setLocalPlayerPosition: (localPlayerPosition) => set({ localPlayerPosition }),
```

- [ ] **Step 2: Update control hook to use persistent toggles**
Modify `src/hooks/useControls.ts` to toggle states only on `keydown`, not reset on `keyup` for 'M' and 'O'.
```typescript
case "o": setControls((c) => ({ ...c, mouseControlEnabled: !c.mouseControlEnabled })); break;
case "m": setControls((c) => ({ ...c, showLargeMap: !c.showLargeMap })); break;
```
*(Ensure `keyup` logic for these keys is removed)*

- [ ] **Step 3: Update store from Airplane loop**
Modify `src/components/game/Airplane.tsx` to call `setLocalPlayerPosition` every frame.
```typescript
setLocalPlayerPosition([translation.x, translation.z]);
```

- [ ] **Step 4: Commit**
```bash
git add src/store/useGameStore.ts src/hooks/useControls.ts src/components/game/Airplane.tsx
git commit -m "feat: track player position and fix control toggles"
```

### Task 2: Fix Map Rendering Logic

**Files:**
- Modify: `src/components/ui/Minimap.tsx`

- [ ] **Step 1: Update Minimap to use localPlayerPosition**
Modify `src/components/ui/Minimap.tsx` to draw the white triangle at the correct coordinates using the store's `localPlayerPosition`.

- [ ] **Step 2: Correct Coordinate Mapping**
Ensure world coordinates (e.g., -1000 to 1000) are correctly mapped to canvas pixels (0 to mapSize) regardless of player position.
```typescript
const px = cx + (localPlayerPosition[0] * scale);
const py = cy + (localPlayerPosition[1] * scale);
```

- [ ] **Step 3: Verify Map Visibility**
Ensure the `island` and `zone` are drawn using world-to-canvas scale consistently. Set `viewRange` to match the island size (e.g., 2500m).

- [ ] **Step 4: Commit**
```bash
git add src/components/ui/Minimap.tsx
git commit -m "fix: resolve map rendering and coordinate mapping"
```
