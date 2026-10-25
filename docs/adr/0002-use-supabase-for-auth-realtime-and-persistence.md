# ADR 0002: Use Supabase for auth, realtime rooms, and persistence

## Status

Deprecated (2026-10-25). The single-player scope established in [ADR 0005](0005-build-pve-as-a-separate-spin-off.md) no longer requires this backend; its remaining implementation has been removed. Current run persistence is defined in [ADR 0014](0014-host-on-workers-and-store-survival-runs-in-d1.md).

## Date

2026-05-27

## Context

The game needs pilot identity, persistent stats, a leaderboard, live room messaging, and basic match event logging. The current implementation favors a low-infrastructure browser game prototype over a custom authoritative backend.

## Decision

Use Supabase as the backend platform:

- Supabase Auth identifies pilots.
- Supabase Postgres stores profiles, matches, and match events.
- Supabase RPC helpers increment kills, wins, and ranking points.
- Supabase Realtime broadcast sends movement snapshots, hit events, and kill events.
- Supabase Realtime presence tracks room joins and leaves.

## Consequences

- The prototype can support auth, leaderboard, and realtime multiplayer without a custom server.
- Game clients can join rooms directly and exchange high-frequency movement state.
- Combat and match outcomes are currently trust-based because clients publish hits and kills.
- Competitive integrity would require a later authoritative simulation or server-side validation layer.
- Match persistence depends on clients having a valid match id; the current local lifecycle can run without one.
