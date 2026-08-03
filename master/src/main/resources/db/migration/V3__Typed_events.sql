-- Rebuild events so join/leave can store only the fields they actually use.
ALTER TABLE events RENAME TO events_old;

CREATE TABLE events
(
    id                BIGSERIAL PRIMARY KEY,
    source_ip         TEXT,
    event_type        TEXT        NOT NULL DEFAULT 'unknown',
    killer_client_num INTEGER,
    killer_name       TEXT,
    victim_client_num INTEGER,
    victim_name       TEXT,
    means_of_death    INTEGER,
    game_time         INTEGER     NOT NULL,
    server_time       INTEGER     NOT NULL,
    map_name          TEXT        NOT NULL,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_events_event_type
        CHECK (event_type IN ('kill', 'join', 'leave', 'unknown')),
    CONSTRAINT chk_events_payload_shape
        CHECK (
            (
                event_type = 'kill'
                AND killer_client_num IS NOT NULL
                AND killer_name IS NOT NULL
                AND victim_client_num IS NOT NULL
                AND victim_name IS NOT NULL
                AND means_of_death IS NOT NULL
            )
            OR (
                event_type IN ('join', 'leave')
                AND killer_client_num IS NOT NULL
                AND killer_name IS NOT NULL
                AND victim_client_num IS NULL
                AND victim_name IS NULL
                AND means_of_death IS NULL
            )
            OR event_type = 'unknown'
        )
);

INSERT INTO events (
    id,
    source_ip,
    event_type,
    killer_client_num,
    killer_name,
    victim_client_num,
    victim_name,
    means_of_death,
    game_time,
    server_time,
    map_name,
    received_at
)
SELECT
    id,
    source_ip,
    CASE lower(event_type)
        WHEN 'kill' THEN 'kill'
        WHEN 'join' THEN 'join'
        WHEN 'leave' THEN 'leave'
        ELSE 'unknown'
    END AS event_type,
    killer_client_num,
    killer_name,
    CASE
        WHEN lower(event_type) = 'kill' THEN victim_client_num
        ELSE NULL
    END AS victim_client_num,
    CASE
        WHEN lower(event_type) = 'kill' THEN victim_name
        ELSE NULL
    END AS victim_name,
    CASE
        WHEN lower(event_type) = 'kill' THEN means_of_death
        ELSE NULL
    END AS means_of_death,
    game_time,
    server_time,
    map_name,
    received_at
FROM events_old;

SELECT setval(
    pg_get_serial_sequence('events', 'id'),
    COALESCE((SELECT MAX(id) FROM events), 1),
    COALESCE((SELECT MAX(id) FROM events), 0) > 0
);

DROP TABLE events_old;

CREATE INDEX idx_events_received_at ON events (received_at DESC);
CREATE INDEX idx_events_event_type_received_at ON events (event_type, received_at DESC);
CREATE INDEX idx_events_event_type_killer_name ON events (event_type, killer_name);
CREATE INDEX idx_events_lower_event_type_killer_name ON events ((lower(event_type)), killer_name);
