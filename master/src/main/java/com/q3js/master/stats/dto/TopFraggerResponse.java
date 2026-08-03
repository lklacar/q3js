package com.q3js.master.stats.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playerName", "frags"})
public record TopFraggerResponse(String playerName, long frags) {
}
