-- Supports scoreboard aggregation grouped by killer_name with event_type filtering.
-- Standard composite index (best when event_type is normalized and queried with exact match).
CREATE INDEX IF NOT EXISTS idx_events_event_type_killer_name
    ON events (event_type, killer_name);

-- Functional composite index (used by case-insensitive predicates like lower(event_type) = 'kill').
CREATE INDEX IF NOT EXISTS idx_events_lower_event_type_killer_name
    ON events ((lower(event_type)), killer_name);
