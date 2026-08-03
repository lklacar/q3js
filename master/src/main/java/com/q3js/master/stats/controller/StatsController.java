package com.q3js.master.stats.controller;

import com.q3js.master.stats.dto.SiteStatsResponse;
import com.q3js.master.stats.mapper.StatsMapper;
import com.q3js.master.stats.service.StatsService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/stats")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Stats", description = "Live and historical Q3JS statistics")
public class StatsController {
    private final StatsService statsService;
    private final StatsMapper statsMapper;

    public StatsController(StatsService statsService, StatsMapper statsMapper) {
        this.statsService = statsService;
        this.statsMapper = statsMapper;
    }

    @GET
    @Operation(operationId = "getStats", summary = "Get homepage statistics")
    @APIResponse(responseCode = "200", description = "Current players and global frag statistics")
    public SiteStatsResponse stats() {
        return statsMapper.response(statsService.stats());
    }
}
