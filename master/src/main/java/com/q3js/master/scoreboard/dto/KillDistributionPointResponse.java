package com.q3js.master.scoreboard.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(requiredProperties = {"bucketStart", "kills"})
public record KillDistributionPointResponse(OffsetDateTime bucketStart, long kills) {
}
