package com.q3js.master.scoreboard.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(requiredProperties = {"playerName", "kills", "lastOnline"})
public record ScoreboardEntryResponse(
    String playerName,
    long kills,
    @Schema(nullable = true) OffsetDateTime lastOnline
) {
}
