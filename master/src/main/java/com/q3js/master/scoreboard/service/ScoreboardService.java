package com.q3js.master.scoreboard.service;

import com.q3js.master.scoreboard.domain.KillDistributionPoint;
import com.q3js.master.scoreboard.domain.ScoreboardPage;
import com.q3js.master.scoreboard.domain.ScoreboardPeriod;
import com.q3js.master.scoreboard.domain.ScoreboardTotals;
import com.q3js.master.scoreboard.repository.ScoreboardRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@ApplicationScoped
public class ScoreboardService {
    private static final int DAILY_BUCKETS = 24;

    private final ScoreboardRepository repository;

    public ScoreboardService(ScoreboardRepository repository) {
        this.repository = repository;
    }

    public ScoreboardPage scoreboard(
        ScoreboardPeriod period,
        ZoneId timeZone,
        int requestedPage,
        int pageSize,
        String search
    ) {
        OffsetDateTime periodStart = period.startsAt(currentTime(), timeZone).orElse(null);
        ScoreboardTotals totals = repository.totals(periodStart, search);
        int totalPages = Math.max(1, (int) Math.ceil(totals.entries() / (double) pageSize));
        int page = Math.min(requestedPage, totalPages);
        int offset = (page - 1) * pageSize;
        var entries = repository.entries(periodStart, search, pageSize, offset);

        return new ScoreboardPage(
            period,
            page,
            pageSize,
            totals.entries(),
            totalPages,
            totals.kills(),
            page > 1,
            page < totalPages,
            entries
        );
    }

    public List<KillDistributionPoint> distribution(ScoreboardPeriod period, ZoneId timeZone) {
        OffsetDateTime now = currentTime();
        OffsetDateTime periodStart = period.startsAt(now, timeZone).orElse(null);
        if (period == ScoreboardPeriod.DAILY) {
            Map<Integer, Long> killsByHour = repository.hourlyDistribution(periodStart, now);
            return IntStream.range(0, DAILY_BUCKETS)
                .mapToObj(index -> new KillDistributionPoint(
                    periodStart.atZoneSameInstant(timeZone).plusHours(index).toOffsetDateTime(),
                    killsByHour.getOrDefault(index, 0L)
                ))
                .toList();
        }

        return repository.dailyDistribution(periodStart, now, timeZone).entrySet().stream()
            .map(entry -> new KillDistributionPoint(
                entry.getKey().atStartOfDay(timeZone).toOffsetDateTime(),
                entry.getValue()
            ))
            .toList();
    }

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }
}
