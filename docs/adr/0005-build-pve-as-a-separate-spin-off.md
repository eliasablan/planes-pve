# Build PvE as a separate spin-off

Skybound Battle Royale remains the multiplayer battle royale version, while the PvE concept will be developed as a separate single-player spin-off in a Git worktree outside the current `planes/` folder. The worktree is only a practical starting point; the PvE folder can later become its own repository and Vercel project. This avoids forcing enemies, waves, pickups, and arcade progression through multiplayer concepts such as rooms, remote players, realtime snapshots, and battle royale zones.
