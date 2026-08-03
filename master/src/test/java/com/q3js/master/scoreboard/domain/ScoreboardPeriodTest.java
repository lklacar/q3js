package com.q3js.master.scoreboard.domain;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoreboardPeriodTest {
    @Test
    void calculatesRollingAndCalendarPeriodStarts() {
        OffsetDateTime now = OffsetDateTime.parse("2026-08-05T12:00:00Z");
        ZoneId timeZone = ZoneId.of("Europe/Belgrade");

        assertEquals(now.minusHours(24), ScoreboardPeriod.DAILY.startsAt(now, timeZone).orElseThrow());
        assertEquals(
            OffsetDateTime.parse("2026-08-03T00:00:00+02:00"),
            ScoreboardPeriod.WEEKLY.startsAt(now, timeZone).orElseThrow()
        );
        assertEquals(
            OffsetDateTime.parse("2026-08-01T00:00:00+02:00"),
            ScoreboardPeriod.MONTHLY.startsAt(now, timeZone).orElseThrow()
        );
        assertTrue(ScoreboardPeriod.ALL_TIME.startsAt(now, timeZone).isEmpty());
    }
}
