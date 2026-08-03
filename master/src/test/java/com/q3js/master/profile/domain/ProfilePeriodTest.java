package com.q3js.master.profile.domain;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProfilePeriodTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-08-05T12:30:00Z");
    private static final ZoneId ZONE = ZoneId.of("Europe/Belgrade");

    @Test
    void calculatesRollingAndCalendarPeriodStarts() {
        assertEquals(
            OffsetDateTime.parse("2026-08-04T12:30:00Z"),
            ProfilePeriod.DAILY.startsAt(NOW, ZONE).orElseThrow()
        );
        assertEquals(
            OffsetDateTime.parse("2026-08-03T00:00:00+02:00"),
            ProfilePeriod.WEEKLY.startsAt(NOW, ZONE).orElseThrow()
        );
        assertEquals(
            OffsetDateTime.parse("2026-08-01T00:00:00+02:00"),
            ProfilePeriod.MONTHLY.startsAt(NOW, ZONE).orElseThrow()
        );
        assertTrue(ProfilePeriod.ALL_TIME.startsAt(NOW, ZONE).isEmpty());
    }
}
