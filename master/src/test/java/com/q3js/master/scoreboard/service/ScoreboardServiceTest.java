package com.q3js.master.scoreboard.service;

import com.q3js.master.scoreboard.domain.ScoreboardEntry;
import com.q3js.master.scoreboard.domain.ScoreboardPeriod;
import com.q3js.master.scoreboard.domain.ScoreboardTotals;
import com.q3js.master.scoreboard.repository.ScoreboardRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoreboardServiceTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-08-05T12:00:00Z");

    @Test
    void capsPaginationAndReturnsRankedEntries() {
        var repository = new RecordingScoreboardRepository();
        repository.totals = new ScoreboardTotals(51, 1_337);
        repository.entries = List.of(new ScoreboardEntry("Ranger", 42, NOW.minusMinutes(2)));
        var service = new FixedTimeScoreboardService(repository, NOW);

        var page = service.scoreboard(ScoreboardPeriod.ALL_TIME, ZoneId.of("Z"), 99, 25, "ran");

        assertEquals(3, page.page());
        assertEquals(3, page.totalPages());
        assertEquals(51, page.totalEntries());
        assertEquals(1_337, page.totalKills());
        assertTrue(page.hasPreviousPage());
        assertFalse(page.hasNextPage());
        assertEquals("Ranger", page.entries().get(0).playerName());
        assertEquals(25, repository.limit);
        assertEquals(50, repository.offset);
        assertEquals("ran", repository.search);
    }

    @Test
    void fillsAllTwentyFourRollingHourlyBuckets() {
        var repository = new RecordingScoreboardRepository();
        repository.hourly = Map.of(0, 2L, 23, 5L);
        var service = new FixedTimeScoreboardService(repository, NOW);

        var distribution = service.distribution(ScoreboardPeriod.DAILY, ZoneId.of("Z"));

        assertEquals(24, distribution.size());
        assertEquals(NOW.minusHours(24), distribution.get(0).bucketStart());
        assertEquals(2, distribution.get(0).kills());
        assertEquals(0, distribution.get(1).kills());
        assertEquals(5, distribution.get(23).kills());
        assertEquals(NOW.minusHours(24), repository.periodStart);
        assertEquals(NOW, repository.periodEnd);
    }

    @Test
    void mapsCalendarDayDistributionInTheRequestedTimeZone() {
        var repository = new RecordingScoreboardRepository();
        repository.daily.put(LocalDate.of(2026, 8, 3), 9L);
        var service = new FixedTimeScoreboardService(repository, NOW);

        var distribution = service.distribution(
            ScoreboardPeriod.WEEKLY,
            ZoneId.of("Europe/Belgrade")
        );

        assertEquals(1, distribution.size());
        assertEquals(OffsetDateTime.parse("2026-08-03T00:00:00+02:00"), distribution.get(0).bucketStart());
        assertEquals(9, distribution.get(0).kills());
    }

    private static final class FixedTimeScoreboardService extends ScoreboardService {
        private final OffsetDateTime now;

        private FixedTimeScoreboardService(ScoreboardRepository repository, OffsetDateTime now) {
            super(repository);
            this.now = now;
        }

        @Override
        protected OffsetDateTime currentTime() {
            return now;
        }
    }

    private static final class RecordingScoreboardRepository extends ScoreboardRepository {
        private ScoreboardTotals totals = new ScoreboardTotals(0, 0);
        private List<ScoreboardEntry> entries = List.of();
        private Map<Integer, Long> hourly = Map.of();
        private final Map<LocalDate, Long> daily = new LinkedHashMap<>();
        private String search;
        private int limit;
        private int offset;
        private OffsetDateTime periodStart;
        private OffsetDateTime periodEnd;

        private RecordingScoreboardRepository() {
            super(null);
        }

        @Override
        public ScoreboardTotals totals(OffsetDateTime periodStart, String search) {
            this.periodStart = periodStart;
            this.search = search;
            return totals;
        }

        @Override
        public List<ScoreboardEntry> entries(
            OffsetDateTime periodStart,
            String search,
            int limit,
            int offset
        ) {
            this.periodStart = periodStart;
            this.search = search;
            this.limit = limit;
            this.offset = offset;
            return entries;
        }

        @Override
        public Map<Integer, Long> hourlyDistribution(
            OffsetDateTime periodStart,
            OffsetDateTime periodEnd
        ) {
            this.periodStart = periodStart;
            this.periodEnd = periodEnd;
            return hourly;
        }

        @Override
        public Map<LocalDate, Long> dailyDistribution(
            OffsetDateTime periodStart,
            OffsetDateTime periodEnd,
            ZoneId timeZone
        ) {
            this.periodStart = periodStart;
            this.periodEnd = periodEnd;
            return daily;
        }
    }
}
