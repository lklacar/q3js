package com.q3js.master.scoreboard.dto;

import com.q3js.master.scoreboard.domain.ScoreboardPeriod;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(requiredProperties = {
    "period", "page", "pageSize", "totalEntries", "totalPages", "totalKills",
    "hasPreviousPage", "hasNextPage", "entries"
})
public record ScoreboardPageResponse(
    ScoreboardPeriod period,
    int page,
    int pageSize,
    int totalEntries,
    int totalPages,
    long totalKills,
    boolean hasPreviousPage,
    boolean hasNextPage,
    List<ScoreboardEntryResponse> entries
) {
}
