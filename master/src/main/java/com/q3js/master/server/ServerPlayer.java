package com.q3js.master.server;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(requiredProperties = {"score", "ping", "name"})
public record ServerPlayer(
    int score,
    int ping,
    String name
) {
}
