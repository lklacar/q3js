package com.q3js.master.profile.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;

public enum ProfilePeriod {
    DAILY,
    WEEKLY,
    MONTHLY,
    ALL_TIME;

    public Optional<OffsetDateTime> startsAt(OffsetDateTime now, ZoneId zoneId) {
        LocalDate localDate = now.atZoneSameInstant(zoneId).toLocalDate();

        return switch (this) {
            case DAILY -> Optional.of(now.minusHours(24));
            case WEEKLY -> Optional.of(
                localDate
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .atStartOfDay(zoneId)
                    .toOffsetDateTime()
            );
            case MONTHLY -> Optional.of(
                localDate
                    .withDayOfMonth(1)
                    .atStartOfDay(zoneId)
                    .toOffsetDateTime()
            );
            case ALL_TIME -> Optional.empty();
        };
    }
}
