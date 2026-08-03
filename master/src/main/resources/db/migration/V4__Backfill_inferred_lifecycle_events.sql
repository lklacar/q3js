-- Backfill inferred join/leave events from historical kill clusters.
-- A new inferred session starts on the first kill, or when the gap since the
-- previous kill for the same player exceeds five minutes.
WITH lifecycle_bounds AS (
    SELECT
        COALESCE(source_ip, '') AS source_ip_key,
        source_ip,
        killer_name,
        MIN(received_at) AS first_lifecycle_at
    FROM events
    WHERE lower(event_type) IN ('join', 'leave')
    GROUP BY COALESCE(source_ip, ''), source_ip, killer_name
),
ordered_kills AS (
    SELECT
        COALESCE(e.source_ip, '') AS source_ip_key,
        e.source_ip,
        e.killer_name,
        e.killer_client_num,
        e.game_time,
        e.server_time,
        e.map_name,
        e.received_at,
        LAG(e.received_at) OVER (
            PARTITION BY COALESCE(e.source_ip, ''), e.killer_name
            ORDER BY e.received_at
        ) AS previous_kill_at
    FROM events e
    LEFT JOIN lifecycle_bounds lb
        ON COALESCE(e.source_ip, '') = lb.source_ip_key
        AND e.source_ip IS NOT DISTINCT FROM lb.source_ip
        AND e.killer_name = lb.killer_name
    WHERE lower(e.event_type) = 'kill'
      AND (lb.first_lifecycle_at IS NULL OR e.received_at < lb.first_lifecycle_at)
),
kill_sessions AS (
    SELECT
        *,
        SUM(
            CASE
                WHEN previous_kill_at IS NULL OR received_at - previous_kill_at > INTERVAL '5 minutes' THEN 1
                ELSE 0
            END
        ) OVER (
            PARTITION BY source_ip_key, killer_name
            ORDER BY received_at
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS session_number
    FROM ordered_kills
),
session_rollups AS (
    SELECT
        source_ip_key,
        source_ip,
        killer_name,
        session_number,
        (ARRAY_AGG(killer_client_num ORDER BY received_at ASC))[1] AS join_client_num,
        (ARRAY_AGG(killer_client_num ORDER BY received_at DESC))[1] AS leave_client_num,
        MIN(received_at) AS join_received_at,
        MAX(received_at) + INTERVAL '5 minutes' AS leave_received_at,
        (ARRAY_AGG(game_time ORDER BY received_at ASC))[1] AS join_game_time,
        (ARRAY_AGG(server_time ORDER BY received_at ASC))[1] AS join_server_time,
        ((ARRAY_AGG(game_time ORDER BY received_at DESC))[1] + 300000) AS leave_game_time,
        ((ARRAY_AGG(server_time ORDER BY received_at DESC))[1] + 300000) AS leave_server_time,
        (ARRAY_AGG(map_name ORDER BY received_at ASC))[1] AS join_map_name,
        (ARRAY_AGG(map_name ORDER BY received_at DESC))[1] AS leave_map_name
    FROM kill_sessions
    GROUP BY source_ip_key, source_ip, killer_name, session_number
),
inferred_events AS (
    SELECT
        source_ip,
        'join'::TEXT AS event_type,
        join_client_num AS killer_client_num,
        killer_name,
        NULL::INTEGER AS victim_client_num,
        NULL::TEXT AS victim_name,
        NULL::INTEGER AS means_of_death,
        join_game_time AS game_time,
        join_server_time AS server_time,
        join_map_name AS map_name,
        join_received_at AS received_at
    FROM session_rollups

    UNION ALL

    SELECT
        source_ip,
        'leave'::TEXT AS event_type,
        leave_client_num AS killer_client_num,
        killer_name,
        NULL::INTEGER AS victim_client_num,
        NULL::TEXT AS victim_name,
        NULL::INTEGER AS means_of_death,
        leave_game_time AS game_time,
        leave_server_time AS server_time,
        leave_map_name AS map_name,
        leave_received_at AS received_at
    FROM session_rollups
)
INSERT INTO events (
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
FROM inferred_events inferred
WHERE NOT EXISTS (
    SELECT 1
    FROM events existing
    WHERE lower(existing.event_type) = lower(inferred.event_type)
      AND existing.source_ip IS NOT DISTINCT FROM inferred.source_ip
      AND existing.killer_name = inferred.killer_name
      AND existing.received_at = inferred.received_at
);
