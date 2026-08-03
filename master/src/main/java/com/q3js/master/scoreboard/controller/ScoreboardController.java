package com.q3js.master.scoreboard.controller;

import com.q3js.master.scoreboard.domain.ScoreboardPeriod;
import com.q3js.master.scoreboard.dto.KillDistributionPointResponse;
import com.q3js.master.scoreboard.dto.ScoreboardPageResponse;
import com.q3js.master.scoreboard.mapper.ScoreboardMapper;
import com.q3js.master.scoreboard.service.ScoreboardService;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Path("/api/scoreboard")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Scoreboard", description = "Global Q3JS frag rankings and activity")
public class ScoreboardController {
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_PAGE_SIZE = 25;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 128;

    private final ScoreboardService scoreboardService;
    private final ScoreboardMapper scoreboardMapper;

    public ScoreboardController(ScoreboardService scoreboardService, ScoreboardMapper scoreboardMapper) {
        this.scoreboardService = scoreboardService;
        this.scoreboardMapper = scoreboardMapper;
    }

    @GET
    @Operation(operationId = "getScoreboard", summary = "Get the global frag scoreboard")
    @APIResponse(responseCode = "200", description = "Paginated frag rankings")
    @APIResponse(responseCode = "400", description = "Scoreboard parameters are invalid")
    public ScoreboardPageResponse scoreboard(
        @QueryParam("period") @Parameter(description = "daily, weekly, monthly, or all-time") String period,
        @QueryParam("timeZone") @Parameter(description = "IANA time zone used for period boundaries") String timeZone,
        @QueryParam("page") @Parameter(description = "One-based page number") Integer page,
        @QueryParam("pageSize") @Parameter(description = "Entries per page, from 1 to 100") Integer pageSize,
        @QueryParam("search") @Parameter(description = "Player name, with Quake color codes ignored") String search
    ) {
        validateSearch(search);
        return scoreboardMapper.response(scoreboardService.scoreboard(
            scoreboardPeriod(period),
            scoreboardTimeZone(timeZone),
            scoreboardPage(page),
            scoreboardPageSize(pageSize),
            search
        ));
    }

    @GET
    @Path("/distribution")
    @Operation(operationId = "getScoreboardDistribution", summary = "Get frag activity over time")
    @APIResponse(responseCode = "200", description = "Hourly or daily frag totals")
    @APIResponse(responseCode = "400", description = "Distribution parameters are invalid")
    public List<KillDistributionPointResponse> distribution(
        @QueryParam("period") @Parameter(description = "daily, weekly, monthly, or all-time") String period,
        @QueryParam("timeZone") @Parameter(description = "IANA time zone used for bucket boundaries") String timeZone
    ) {
        return scoreboardMapper.response(scoreboardService.distribution(
            scoreboardPeriod(period),
            scoreboardTimeZone(timeZone)
        ));
    }

    private static ScoreboardPeriod scoreboardPeriod(String value) {
        if (value == null || value.isBlank()) {
            return ScoreboardPeriod.ALL_TIME;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "daily", "day" -> ScoreboardPeriod.DAILY;
            case "weekly", "week" -> ScoreboardPeriod.WEEKLY;
            case "monthly", "month" -> ScoreboardPeriod.MONTHLY;
            case "all-time", "all_time", "alltime", "all" -> ScoreboardPeriod.ALL_TIME;
            default -> throw new BadRequestException("Unsupported scoreboard period: " + value);
        };
    }

    private static ZoneId scoreboardTimeZone(String value) {
        if (value == null || value.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(value.trim());
        } catch (DateTimeException exception) {
            throw new BadRequestException("Unsupported time zone: " + value);
        }
    }

    private static int scoreboardPage(Integer page) {
        if (page == null) {
            return DEFAULT_PAGE;
        }
        if (page < 1) {
            throw new BadRequestException("Page must be greater than 0.");
        }
        return page;
    }

    private static int scoreboardPageSize(Integer pageSize) {
        if (pageSize == null) {
            return DEFAULT_PAGE_SIZE;
        }
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page size must be between 1 and 100.");
        }
        return pageSize;
    }

    private static void validateSearch(String search) {
        if (search != null && search.length() > MAX_SEARCH_LENGTH) {
            throw new BadRequestException("Scoreboard search must not exceed 128 characters.");
        }
    }
}
