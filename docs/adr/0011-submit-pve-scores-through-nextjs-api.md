# Submit PvE scores through a Next.js API route

## Status

Superseded by [ADR 0014](0014-host-on-workers-and-store-survival-runs-in-d1.md).

The PvE client will not write directly to PostgreSQL. Finished runs submit scores through a Next.js API route, which owns name validation, top-10 qualification, persistence, and returning the updated arcade ranking; Drizzle ORM can be used if it simplifies the database access layer.
