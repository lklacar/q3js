package com.q3js.master.stats.service;

import com.q3js.master.server.service.ServerService;
import com.q3js.master.stats.domain.TopFragger;
import com.q3js.master.stats.repository.StatsRepository;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class StatsServiceTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-08-03T12:00:00Z");

    @Test
    void aggregatesAndCachesHomepageStatistics() {
        var repository = new RecordingStatsRepository();
        var serverService = new RecordingServerService();
        var service = new FixedTimeStatsService(repository, serverService, NOW);

        var first = service.stats();
        var cached = service.stats();

        assertSame(first, cached);
        assertEquals(5, first.playersOnline());
        assertEquals("Ranger", first.mostFragsLast24Hours().playerName());
        assertEquals(42, first.mostFragsLast24Hours().frags());
        assertEquals(1_337, first.totalFragsEver());
        assertEquals(1, serverService.calls);
        assertEquals(1, repository.topFraggerCalls);
        assertEquals(1, repository.totalFragsCalls);
        assertEquals(NOW.minusHours(24), repository.periodStart);
    }

    private static final class FixedTimeStatsService extends StatsService {
        private final OffsetDateTime now;

        private FixedTimeStatsService(
            StatsRepository repository,
            ServerService serverService,
            OffsetDateTime now
        ) {
            super(repository, serverService);
            this.now = now;
        }

        @Override
        protected OffsetDateTime currentTime() {
            return now;
        }
    }

    private static final class RecordingStatsRepository extends StatsRepository {
        private int topFraggerCalls;
        private int totalFragsCalls;
        private OffsetDateTime periodStart;

        private RecordingStatsRepository() {
            super(null);
        }

        @Override
        public TopFragger findTopFraggerSince(OffsetDateTime periodStart) {
            topFraggerCalls++;
            this.periodStart = periodStart;
            return new TopFragger("Ranger", 42);
        }

        @Override
        public long countTotalFrags() {
            totalFragsCalls++;
            return 1_337;
        }
    }

    private static final class RecordingServerService extends ServerService {
        private int calls;

        private RecordingServerService() {
            super(null, null, null, Duration.ofMinutes(1));
        }

        @Override
        public int playerCount() {
            calls++;
            return 5;
        }
    }
}
