package com.q3js.master.server.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"host", "proxyPort", "targetPort", "secure", "transport", "official", "info"})
public record ServerResponse(
    String host,
    int proxyPort,
    int targetPort,
    boolean secure,
    @Schema(enumeration = {"websocket", "webtransport"}) String transport,
    boolean official,
    ServerInfo info
) {
}
