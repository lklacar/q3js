package com.q3js.master.server.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"targetHost", "proxyPort", "targetPort", "secure"})
public record HeartbeatRequest(
    @NotBlank String targetHost,
    @Min(1) @Max(65535) int proxyPort,
    @Min(1) @Max(65535) int targetPort,
    boolean secure
) {
}
