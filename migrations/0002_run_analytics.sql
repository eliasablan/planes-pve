ALTER TABLE runs ADD COLUMN browser_id TEXT;
ALTER TABLE runs ADD COLUMN network_id TEXT;

CREATE INDEX runs_browser_history ON runs (browser_id, started_at DESC) WHERE browser_id IS NOT NULL;
CREATE INDEX runs_network_history ON runs (network_id, started_at DESC) WHERE network_id IS NOT NULL;
