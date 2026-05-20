CREATE TABLE IF NOT EXISTS player_page_visits
(
    id          BIGSERIAL PRIMARY KEY,
    player_name TEXT,
    source_ip   TEXT,
    path        TEXT        NOT NULL,
    user_agent  TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_page_visits_received_at
    ON player_page_visits (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_page_visits_player_ip_received_at
    ON player_page_visits (player_name, source_ip, received_at DESC);
