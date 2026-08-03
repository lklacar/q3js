package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"mapName", "kills"})
public record ProfileMapResponse(String mapName, int kills) {
}
