# Separate PvE score storage from PvP Supabase

The PvE spin-off will not reuse the PvP Supabase schema for score storage. PvP keeps Supabase for authenticated profiles, realtime rooms, and match history, while PvE uses a separate score store for arcade-name high scores so the two game modes do not share misleading persistence concepts.
