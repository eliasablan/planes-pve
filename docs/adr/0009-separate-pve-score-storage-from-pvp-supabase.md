# Separate PvE score storage from PvP Supabase

## Status

Deprecated (2026-10-25). The inherited backend implementation has been removed, so this separation no longer describes an active integration boundary. Current run persistence is defined in [ADR 0014](0014-host-on-workers-and-store-survival-runs-in-d1.md).

The PvE spin-off will not reuse the PvP Supabase schema for score storage. PvP keeps Supabase for authenticated profiles, realtime rooms, and match history, while PvE uses a separate score store for arcade-name high scores so the two game modes do not share misleading persistence concepts.
