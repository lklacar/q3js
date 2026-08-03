package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playerName"})
public record ProfileSummaryResponse(String playerName) {
}
