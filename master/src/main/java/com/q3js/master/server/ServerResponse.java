package com.q3js.master.server;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"host", "proxyPort", "targetPort", "secure", "info"})
public record ServerResponse(
    String host,
    int proxyPort,
    int targetPort,
    boolean secure,
    ServerInfo info
) {
}
