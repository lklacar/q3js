package com.q3js.master.stats.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playersOnline", "mostFragsLast24Hours", "totalFragsEver"})
public record SiteStatsResponse(
    int playersOnline,
    @Schema(nullable = true) TopFraggerResponse mostFragsLast24Hours,
    long totalFragsEver
) {
}
