package com.q3js.master.stats.mapper;

import com.q3js.master.stats.domain.SiteStats;
import com.q3js.master.stats.domain.TopFragger;
import com.q3js.master.stats.dto.SiteStatsResponse;
import com.q3js.master.stats.dto.TopFraggerResponse;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class StatsMapper {
    public SiteStatsResponse response(SiteStats stats) {
        return new SiteStatsResponse(
            stats.playersOnline(),
            response(stats.mostFragsLast24Hours()),
            stats.totalFragsEver()
        );
    }

    private static TopFraggerResponse response(TopFragger topFragger) {
        return topFragger == null
            ? null
            : new TopFraggerResponse(topFragger.playerName(), topFragger.frags());
    }
}
