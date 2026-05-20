CREATE TABLE IF NOT EXISTS banned_ips
(
    ip_address  TEXT PRIMARY KEY,
    player_name TEXT,
    banned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_banned_at
    ON banned_ips (banned_at DESC);
