package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playerName", "kills"})
public record ProfileRivalResponse(String playerName, int kills) {
}
