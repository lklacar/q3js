package com.q3js.master.server;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record HeartbeatRequest(
    @NotBlank String targetHost,
    @Min(1) @Max(65535) int proxyPort,
    @Min(1) @Max(65535) int targetPort,
    boolean secure
) {
}
