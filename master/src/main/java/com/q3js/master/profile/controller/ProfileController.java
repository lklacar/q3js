package com.q3js.master.profile.controller;

import com.q3js.master.profile.dto.ProfileResponse;
import com.q3js.master.profile.dto.ProfileSitemapEntryResponse;
import com.q3js.master.profile.dto.ProfileSummaryResponse;
import com.q3js.master.profile.mapper.ProfileMapper;
import com.q3js.master.profile.service.ProfileService;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/players")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Profiles", description = "Player search and profile statistics")
public class ProfileController {
    private static final int DEFAULT_SEARCH_LIMIT = 25;
    private static final int MAX_SEARCH_LIMIT = 100;
    private static final int MAX_PLAYER_NAME_LENGTH = 128;

    private final ProfileService profileService;
    private final ProfileMapper profileMapper;

    public ProfileController(ProfileService profileService, ProfileMapper profileMapper) {
        this.profileService = profileService;
        this.profileMapper = profileMapper;
    }

    @GET
    @Operation(operationId = "searchProfiles", summary = "Search player profiles")
    @APIResponse(responseCode = "200", description = "Matching player profiles")
    @APIResponse(responseCode = "400", description = "Search parameters are invalid")
    public List<ProfileSummaryResponse> searchProfiles(
        @QueryParam("search") @Parameter(description = "Player name, with Quake color codes ignored") String search,
        @QueryParam("limit") @Parameter(description = "Maximum number of results, from 1 to 100") Integer limit
    ) {
        if (search != null && search.length() > MAX_PLAYER_NAME_LENGTH) {
            throw new BadRequestException("Profile search must not exceed 128 characters.");
        }
        return profileMapper.summaries(profileService.search(search, searchLimit(limit)));
    }

    @GET
    @Path("/sitemap")
    @Operation(operationId = "getProfileSitemap", summary = "List player profile sitemap entries")
    @APIResponse(responseCode = "200", description = "All player profiles with their last activity time")
    public List<ProfileSitemapEntryResponse> sitemap() {
        return profileMapper.sitemapEntries(profileService.sitemapEntries());
    }

    @GET
    @Path("/{playerName}")
    @Operation(operationId = "getProfile", summary = "Get a player profile")
    @APIResponse(responseCode = "200", description = "Player profile statistics")
    @APIResponse(responseCode = "400", description = "Player name is invalid")
    @APIResponse(responseCode = "404", description = "Player profile was not found")
    public ProfileResponse getProfile(@PathParam("playerName") String playerName) {
        if (playerName == null || playerName.isBlank() || playerName.length() > MAX_PLAYER_NAME_LENGTH) {
            throw new BadRequestException("Player name must contain between 1 and 128 characters.");
        }
        return profileMapper.response(profileService.get(playerName));
    }

    private static int searchLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_SEARCH_LIMIT;
        }
        if (limit < 1 || limit > MAX_SEARCH_LIMIT) {
            throw new BadRequestException("Profile search limit must be between 1 and 100.");
        }
        return limit;
    }
}
