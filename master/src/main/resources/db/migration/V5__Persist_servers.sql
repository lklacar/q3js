CREATE TABLE IF NOT EXISTS servers
(
    host                TEXT        NOT NULL,
    proxy_port          INTEGER     NOT NULL,
    target_port         INTEGER     NOT NULL DEFAULT 0,
    secure              BOOLEAN     NOT NULL DEFAULT FALSE,
    last_heartbeat      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_info_json      TEXT,
    last_info_fetched_at TIMESTAMPTZ,
    PRIMARY KEY (host, proxy_port)
);

CREATE INDEX IF NOT EXISTS idx_servers_last_heartbeat ON servers (last_heartbeat DESC);
