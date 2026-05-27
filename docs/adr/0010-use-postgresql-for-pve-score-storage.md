# Use PostgreSQL for PvE score storage

The PvE spin-off will use a separate PostgreSQL database, likely through Docker in local development, for arcade score entries. PostgreSQL is durable and easy to query for high scores, wave reached, kills, and timestamps, while Redis would add less value for a small persistent ranking table.
