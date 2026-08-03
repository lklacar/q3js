package com.q3js.master.stats.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playersOnline", "botsOnline", "mostFragsLast24Hours", "totalFragsEver"})
public record SiteStatsResponse(
    int playersOnline,
    int botsOnline,
    @Schema(nullable = true) TopFraggerResponse mostFragsLast24Hours,
    long totalFragsEver
) {
}
