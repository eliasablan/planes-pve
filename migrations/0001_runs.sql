CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  country TEXT CHECK (country IS NULL OR length(country) = 2),
  game_version TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'survival',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  finished_at TEXT,
  score INTEGER CHECK (score >= 0),
  wave INTEGER CHECK (wave >= 1),
  kills INTEGER CHECK (kills >= 0),
  duration_ms INTEGER CHECK (duration_ms >= 0),
  name TEXT CHECK (name IS NULL OR (length(name) BETWEEN 3 AND 12 AND name NOT GLOB '*[^A-Z0-9]*')),
  named_at TEXT,
  CHECK ((status = 'active' AND finished_at IS NULL AND score IS NULL AND wave IS NULL AND kills IS NULL AND duration_ms IS NULL)
    OR (status != 'active' AND finished_at IS NOT NULL AND score IS NOT NULL AND wave IS NOT NULL AND kills IS NOT NULL AND duration_ms IS NOT NULL)),
  CHECK ((name IS NULL AND named_at IS NULL) OR (name IS NOT NULL AND named_at IS NOT NULL AND status = 'completed' AND score > 0))
);

CREATE INDEX runs_leaderboard ON runs (score DESC, wave DESC, kills DESC, duration_ms ASC, named_at ASC, id ASC)
  WHERE status = 'completed' AND name IS NOT NULL AND score > 0;
CREATE INDEX runs_started_at ON runs (started_at DESC);
