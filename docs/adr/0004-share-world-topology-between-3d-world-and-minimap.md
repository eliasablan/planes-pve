# ADR 0004: Share world topology between the 3D arena and minimap

## Status

Deprecated (2026-10-25) for the tactical-map integration, whose implementation has been removed. Shared world topology remains in use by rendering and simulation; see [Current Architecture](../../CONTEXT.md#current-architecture) for the current consumers.

## Date

2026-05-27

## Context

The game renders the same battlefield in two forms:

- A 3D island environment with ocean, coast, grass, mountains, and props.
- A 2D canvas minimap and large tactical map.

If these views define map size, island radius, mountain positions, and colors independently, the tactical map can drift away from the playable world.

## Decision

Centralize world constants and coordinate projection in `src/lib/worldTopology.ts`. The 3D environment and minimap both consume these values. World coordinates use X/Z for horizontal position, and `worldToMapPoint` projects them into canvas coordinates.

## Consequences

- The map and 3D world share a common source of truth for topology.
- Map fixes can be made in one place instead of duplicating scale math.
- Future world generation should update `worldTopology` first, then make rendering components consume it.
- Any change to world size or arena layout must be checked in both flight gameplay and minimap presentation.
