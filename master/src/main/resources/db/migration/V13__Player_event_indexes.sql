CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_killer_name_received_at
    ON events (killer_name, received_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_victim_name_received_at
    ON events (victim_name, received_at DESC);
