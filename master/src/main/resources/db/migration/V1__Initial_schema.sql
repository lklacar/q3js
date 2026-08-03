-- Store kill-post events sent by game servers.
CREATE TABLE IF NOT EXISTS events
(
    id                BIGSERIAL PRIMARY KEY,
    source_ip         TEXT,
    event_type        TEXT        NOT NULL DEFAULT 'unknown',
    killer_client_num INTEGER     NOT NULL,
    killer_name       TEXT        NOT NULL,
    victim_client_num INTEGER     NOT NULL,
    victim_name       TEXT        NOT NULL,
    means_of_death    INTEGER     NOT NULL,
    game_time         INTEGER     NOT NULL,
    server_time       INTEGER     NOT NULL,
    map_name          TEXT        NOT NULL,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_received_at ON events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type_received_at ON events (event_type, received_at DESC);
