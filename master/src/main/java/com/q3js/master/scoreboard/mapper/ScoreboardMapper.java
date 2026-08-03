package com.q3js.master.scoreboard.mapper;

import com.q3js.master.scoreboard.domain.KillDistributionPoint;
import com.q3js.master.scoreboard.domain.ScoreboardEntry;
import com.q3js.master.scoreboard.domain.ScoreboardPage;
import com.q3js.master.scoreboard.dto.KillDistributionPointResponse;
import com.q3js.master.scoreboard.dto.ScoreboardEntryResponse;
import com.q3js.master.scoreboard.dto.ScoreboardPageResponse;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ScoreboardMapper {
    public ScoreboardPageResponse response(ScoreboardPage page) {
        return new ScoreboardPageResponse(
            page.period(),
            page.page(),
            page.pageSize(),
            page.totalEntries(),
            page.totalPages(),
            page.totalKills(),
            page.hasPreviousPage(),
            page.hasNextPage(),
            page.entries().stream().map(ScoreboardMapper::response).toList()
        );
    }

    public List<KillDistributionPointResponse> response(List<KillDistributionPoint> distribution) {
        return distribution.stream()
            .map(point -> new KillDistributionPointResponse(point.bucketStart(), point.kills()))
            .toList();
    }

    private static ScoreboardEntryResponse response(ScoreboardEntry entry) {
        return new ScoreboardEntryResponse(entry.playerName(), entry.kills(), entry.lastOnline());
    }
}
