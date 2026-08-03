package com.q3js.master.stats.service;

import com.q3js.master.server.service.ServerService;
import com.q3js.master.stats.domain.SiteStats;
import com.q3js.master.stats.repository.StatsRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.time.OffsetDateTime;

@ApplicationScoped
public class StatsService {
    private static final Duration CACHE_DURATION = Duration.ofSeconds(5);

    private final StatsRepository repository;
    private final ServerService serverService;
    private volatile CachedStats cachedStats;

    public StatsService(StatsRepository repository, ServerService serverService) {
        this.repository = repository;
        this.serverService = serverService;
    }

    public SiteStats stats() {
        OffsetDateTime now = currentTime();
        CachedStats current = cachedStats;
        if (current != null && now.isBefore(current.expiresAt())) {
            return current.stats();
        }

        synchronized (this) {
            current = cachedStats;
            if (current != null && now.isBefore(current.expiresAt())) {
                return current.stats();
            }

            SiteStats refreshed = new SiteStats(
                serverService.playerCount(),
                repository.findTopFraggerSince(now.minusHours(24)),
                repository.countTotalFrags()
            );
            cachedStats = new CachedStats(refreshed, now.plus(CACHE_DURATION));
            return refreshed;
        }
    }

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }

    private record CachedStats(SiteStats stats, OffsetDateTime expiresAt) {
    }
}
