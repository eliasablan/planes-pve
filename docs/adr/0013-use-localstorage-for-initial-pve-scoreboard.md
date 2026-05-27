# Use localStorage for the initial PvE scoreboard

The first deployed PvE scoreboard will store top-10 arcade score entries in browser `localStorage` instead of PostgreSQL. This keeps the Vercel deployment usable without provisioning a database and makes the end-of-run arcade loop playable now.

This is an interim decision for the local scoreboard only. ADR 0010 and ADR 0011 remain the preferred direction for a future global ranking, where score submissions go through a Next.js API route and a separate PostgreSQL score store.

Consequences:

- Scores are scoped to one browser and do not sync between devices.
- The UI must label the table as local, not global.
- Client-side validation is acceptable for this phase because the data is not competitive across users.
- The persisted shape should remain close to the future score entry model: arcade name, score, wave reached, kills, duration, and creation time.
