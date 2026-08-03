package com.q3js.master.scoreboard.domain;

import java.util.List;

public record ScoreboardPage(
    ScoreboardPeriod period,
    int page,
    int pageSize,
    int totalEntries,
    int totalPages,
    long totalKills,
    boolean hasPreviousPage,
    boolean hasNextPage,
    List<ScoreboardEntry> entries
) {
}
